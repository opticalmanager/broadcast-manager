"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getNotificationPermission,
  writeBrowserNotifyPref,
  isSmartNotificationPromptSnoozed,
  snoozeSmartNotificationPrompt,
} from "@/lib/notifications/browser-notify";

export function SmartNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Only prompt if permission is 'default' (unasked) and not snoozed
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (getNotificationPermission() !== "default") return;
    if (isSmartNotificationPromptSnoozed()) return;

    // Small delay so user interacts with app first before seeing prompt
    const timer = setTimeout(() => {
      if (getNotificationPermission() === "default" && !isSmartNotificationPromptSnoozed()) {
        setVisible(true);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    snoozeSmartNotificationPrompt(7);
    setVisible(false);
  }, []);

  const handleEnable = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        writeBrowserNotifyPref(true);
        toast.success("Notifications enabled!", {
          description: "You will receive alerts for customer replies and broadcast updates.",
        });
        setVisible(false);
      } else if (permission === "denied") {
        snoozeSmartNotificationPrompt(30);
        setVisible(false);
      } else {
        snoozeSmartNotificationPrompt(7);
        setVisible(false);
      }
    } catch (err) {
      console.error("[SmartNotificationPrompt] Request error:", err);
      setVisible(false);
    } finally {
      setRequesting(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 md:bottom-6 md:left-6 md:right-auto md:w-96">
      <div className="relative flex flex-col gap-3 rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-2xl backdrop-blur-md ring-1 ring-border/50">
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification prompt"
          className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground/60 transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Bell className="h-5 w-5 animate-pulse text-primary" />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-sm text-foreground">
              Turn on Smart Notifications
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get notified when customers reply or broadcast campaigns finish sending.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Not now
          </Button>
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={requesting}
            className="h-8 gap-1.5 bg-primary px-3 text-xs font-medium text-white shadow hover:bg-primary/90"
          >
            <Bell className="h-3.5 w-3.5" />
            {requesting ? "Enabling..." : "Enable Alerts"}
          </Button>
        </div>
      </div>
    </div>
  );
}
