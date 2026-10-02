"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types";
import {
  DEFAULT_NOTIFICATION_LABELS,
  buildNotificationContent,
  buildBroadcastNotificationContent,
  conversationHref,
  broadcastHref,
  dispatchSmartNotification,
  getNotificationPermission,
  pickContactDisplayName,
  readBrowserNotifyPref,
  shouldNotifyForMessage,
  subscribeBrowserNotifyPref,
  viewedConversationFromLocation,
  type NotificationLabels,
} from "@/lib/notifications/browser-notify";

const serverSnapshot = () => false;

/**
 * The device-scoped "browser notifications" opt-in, kept in sync with
 * localStorage across this tab (settings toggle) and other tabs.
 */
export function useBrowserNotifyPref(): boolean {
  return useSyncExternalStore(
    subscribeBrowserNotifyPref,
    readBrowserNotifyPref,
    serverSnapshot,
  );
}

/**
 * Smart notifications for new inbound customer messages and broadcast completions.
 * Mount ONCE per signed-in dashboard tab (the dashboard shell does this via
 * <BrowserNotificationsListener />) so alerts fire on any page.
 *
 * Listens for:
 * 1. realtime INSERTs on `messages` (filtered to customer replies, suppressed
 *    if user is actively viewing that conversation).
 * 2. realtime UPDATEs on `broadcasts` (filtered to status transition to 'sent' or 'paused').
 */
export function useBrowserNotifications(): void {
  const enabled = useBrowserNotifyPref();
  const router = useRouter();
  const t = useTranslations("Settings.browserNotifications.labels");

  // Translated labels, read inside the async Realtime callback. Kept in
  // a ref (assigned in an effect, not during render) so a locale change
  // doesn't tear down and re-open the channel.
  const labelsRef = useRef<NotificationLabels>(DEFAULT_NOTIFICATION_LABELS);
  useEffect(() => {
    labelsRef.current = {
      fallbackTitle: t("fallbackTitle"),
      image: t("image"),
      audio: t("audio"),
      video: t("video"),
      document: t("document"),
      location: t("location"),
      template: t("template"),
    };
  });

  // Message ids already handled, for replay dedupe.
  const seenRef = useRef<Map<string, number>>(new Map());
  // Broadcast ids + status handled, for dedupe.
  const seenBroadcastsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    if (getNotificationPermission() === "unsupported") return;

    const supabase = createClient();
    let cancelled = false;

    const notifyMessage = async (msg: Message) => {
      // One small select to put the contact's name in the title. A
      // failure here just means the generic fallback title.
      const { data } = await supabase
        .from("conversations")
        .select("contact:contacts(name, wa_username, phone)")
        .eq("id", msg.conversation_id)
        .maybeSingle();
      if (cancelled) return;

      const contact = (data as {
        contact?: { name?: string | null; wa_username?: string | null; phone?: string | null } | null;
      } | null)?.contact;
      const { title, body } = buildNotificationContent(
        msg,
        pickContactDisplayName(contact),
        labelsRef.current,
      );

      await dispatchSmartNotification({
        title,
        body,
        tag: msg.conversation_id,
        url: conversationHref(msg.conversation_id),
        onClick: () => {
          window.focus();
          router.push(conversationHref(msg.conversation_id));
        },
      });
    };

    const notifyBroadcast = async (broadcast: {
      id: string;
      name: string;
      status: string;
      total_recipients?: number;
      sent_count?: number;
      failed_count?: number;
    }) => {
      const dedupeKey = `${broadcast.id}:${broadcast.status}`;
      const now = Date.now();
      const lastSeen = seenBroadcastsRef.current.get(dedupeKey);
      if (lastSeen && now - lastSeen < 60_000) return;
      seenBroadcastsRef.current.set(dedupeKey, now);

      const { title, body } = buildBroadcastNotificationContent(broadcast);
      await dispatchSmartNotification({
        title,
        body,
        tag: `broadcast-${broadcast.id}`,
        url: broadcastHref(broadcast.id),
        onClick: () => {
          window.focus();
          router.push(broadcastHref(broadcast.id));
        },
      });
    };

    const channel = supabase
      .channel("smart-browser-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if (getNotificationPermission() !== "granted") return;
          const msg = payload.new as Message;
          const shouldNotify = shouldNotifyForMessage(msg, {
            documentVisible: document.visibilityState === "visible",
            viewingConversationId: viewedConversationFromLocation(
              window.location.pathname,
              window.location.search,
            ),
            seen: seenRef.current,
          });
          if (!shouldNotify) return;
          void notifyMessage(msg);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "broadcasts" },
        (payload) => {
          if (getNotificationPermission() !== "granted") return;
          const newB = payload.new as {
            id: string;
            name: string;
            status: string;
            total_recipients?: number;
            sent_count?: number;
            failed_count?: number;
          };
          const oldB = payload.old as { status?: string } | undefined;

          // Only alert when entering completed 'sent' or 'paused' status
          if (
            (newB.status === "sent" || newB.status === "paused") &&
            oldB?.status !== newB.status
          ) {
            void notifyBroadcast(newB);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled, router]);
}
