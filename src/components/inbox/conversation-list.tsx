"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CONVERSATION_SELECT,
  matchesContactFilters,
  normalizeConversations,
} from "@/lib/inbox/conversations";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationStatus, Tag } from "@/types";
import {
  Search,
  ChevronDown,
  X,
  Image as ImageIcon,
  Mic,
  Video as VideoIcon,
  FileText,
  LayoutTemplate,
} from "lucide-react";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
  /**
   * Increment to force the fetch effect below to refire. The parent
   * bumps this on realtime reconnect / tab visibility → visible so the
   * list catches up on any events sent while the WS was disconnected
   * or the tab was throttled. Optional so existing callers keep working.
   */
  resyncToken?: number;
}

const STATUS_DOT_COLORS: Record<ConversationStatus, string> = {
  open: "bg-emerald-500",
  pending: "bg-amber-500",
  closed: "bg-slate-400 dark:bg-slate-500",
};

type InboxFilter = ConversationStatus | "all" | "unread";

function formatWhatsAppTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  const now = new Date();
  const diffDays = differenceInDays(now, date);
  if (diffDays < 7 && diffDays >= 0) {
    return format(date, "EEE");
  }
  return format(date, "d/M/yy");
}

function renderMessagePreview(text: string | null | undefined, t: ReturnType<typeof useTranslations>) {
  if (!text) {
    return <span className="text-muted-foreground/70 italic">{t("noMessagesYet")}</span>;
  }

  const lower = text.toLowerCase().trim();
  if (lower.startsWith("[image]") || lower.startsWith("[photo]")) {
    return (
      <span className="inline-flex items-center gap-1">
        <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span>Photo</span>
      </span>
    );
  }
  if (lower.startsWith("[audio]") || lower.startsWith("[voice]")) {
    return (
      <span className="inline-flex items-center gap-1">
        <Mic className="size-3.5 shrink-0 text-muted-foreground" />
        <span>Voice message</span>
      </span>
    );
  }
  if (lower.startsWith("[video]")) {
    return (
      <span className="inline-flex items-center gap-1">
        <VideoIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span>Video</span>
      </span>
    );
  }
  if (lower.startsWith("[document]") || lower.startsWith("[file]")) {
    return (
      <span className="inline-flex items-center gap-1">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span>Document</span>
      </span>
    );
  }
  if (lower.startsWith("[template]")) {
    return (
      <span className="inline-flex items-center gap-1">
        <LayoutTemplate className="size-3.5 shrink-0 text-muted-foreground" />
        <span>Template</span>
      </span>
    );
  }

  return <span>{text}</span>;
}

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  resyncToken = 0,
}: ConversationListProps) {
  const t = useTranslations("Inbox.conversationList");
  
  const FILTER_OPTIONS: { label: string; value: InboxFilter }[] = useMemo(() => [
    { label: t("filterAll"), value: "all" },
    { label: t("filterUnread"), value: "unread" },
    { label: t("filterOpen"), value: "open" },
    { label: t("filterPending"), value: "pending" },
    { label: t("filterClosed"), value: "closed" },
  ], [t]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .order("last_message_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to fetch conversations:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setLoading(false);
        return;
      }

      onConversationsLoadedRef.current(normalizeConversations(data ?? []));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [resyncToken]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("tags").select("*").order("name");
      if (!cancelled && data) setTags(data as Tag[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const c of conversations) {
      const co = c.contact?.company?.trim();
      if (co) set.add(co);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [conversations]);

  const tagsById = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  const filtered = useMemo(() => {
    let result = conversations;

    if (filter === "unread") {
      result = result.filter((c) => c.unread_count > 0);
    } else if (filter !== "all") {
      result = result.filter((c) => c.status === filter);
    }

    if (selectedTagIds.length > 0 || selectedCompany !== null) {
      result = result.filter((c) =>
        matchesContactFilters(c, {
          tagIds: selectedTagIds,
          company: selectedCompany,
        })
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
      });
    }

    return result;
  }, [conversations, filter, search, selectedTagIds, selectedCompany]);

  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  const clearContactFilters = useCallback(() => {
    setSelectedTagIds([]);
    setSelectedCompany(null);
  }, []);

  const hasContactFilters = selectedTagIds.length > 0 || selectedCompany !== null;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleSelect = useCallback(
    (conv: Conversation) => {
      onSelect(conv);
    },
    [onSelect]
  );

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-card lg:w-80 select-none">
      {/* Search + Filter Header (WhatsApp Native Feel) */}
      <div className="space-y-2.5 border-b border-border/60 p-3 bg-card">
        {/* WhatsApp-style Rounded Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder={t("searchPlaceholder")}
            className="h-9.5 w-full rounded-full border-0 bg-muted/80 pl-9.5 pr-8 text-sm text-foreground placeholder-muted-foreground shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Horizontal scrollable WhatsApp filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_OPTIONS.map((opt) => {
            const isSelected = filter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95",
                  isSelected
                    ? "bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}

          {tags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "shrink-0 inline-flex items-center justify-center h-6.5 gap-1 px-2.5 text-xs font-medium rounded-full bg-muted/70 transition-all active:scale-95",
                  selectedTagIds.length > 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t("tags")}
                {selectedTagIds.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                    {selectedTagIds.length}
                  </span>
                )}
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-64 w-56 border-border bg-popover"
              >
                {tags.map((t) => (
                  <DropdownMenuCheckboxItem
                    key={t.id}
                    checked={selectedTagIds.includes(t.id)}
                    onCheckedChange={() => toggleTag(t.id)}
                    className="text-sm text-popover-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="truncate">{t.name}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {companies.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "shrink-0 inline-flex max-w-36 items-center justify-center h-6.5 gap-1 px-2.5 text-xs font-medium rounded-full bg-muted/70 transition-all active:scale-95",
                  selectedCompany
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="truncate">{selectedCompany ?? t("company")}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-64 w-56 border-border bg-popover"
              >
                <DropdownMenuItem
                  onClick={() => setSelectedCompany(null)}
                  className={cn(
                    "text-sm",
                    selectedCompany === null
                      ? "text-emerald-600 font-semibold"
                      : "text-popover-foreground"
                  )}
                >
                  {t("allCompanies")}
                </DropdownMenuItem>
                {companies.map((co) => (
                  <DropdownMenuItem
                    key={co}
                    onClick={() => setSelectedCompany(co)}
                    className={cn(
                      "text-sm",
                      selectedCompany === co
                        ? "text-emerald-600 font-semibold"
                        : "text-popover-foreground"
                    )}
                  >
                    <span className="truncate">{co}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Removable Active Filter Chips */}
        {hasContactFilters && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {selectedTagIds.map((id) => {
              const tag = tagsById.get(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleTag(id)}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tag?.color ?? "var(--muted-foreground)" }}
                  />
                  <span className="max-w-24 truncate">{tag?.name ?? t("tags")}</span>
                  <X className="h-3 w-3" />
                </button>
              );
            })}
            {selectedCompany && (
              <button
                onClick={() => setSelectedCompany(null)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              >
                <span className="max-w-24 truncate">{selectedCompany}</span>
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={clearContactFilters}
              className="px-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              {t("clearAll")}
            </button>
          </div>
        )}
      </div>

      {/* Conversation Items in WhatsApp List Layout */}
      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("noConversations")}</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/30">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
                t={t}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
  t: ReturnType<typeof useTranslations>;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  t,
}: ConversationItemProps) {
  const contact = conversation.contact;
  const displayName = contact?.name || contact?.phone || t("unknown");
  const initials = displayName.charAt(0).toUpperCase();
  const hasUnread = conversation.unread_count > 0;

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  const formattedTime = formatWhatsAppTime(conversation.last_message_at);

  return (
    <button
      onClick={handleClick}
      type="button"
      className={cn(
        "flex w-full min-h-[72px] items-center gap-3.5 px-3.5 sm:px-4 py-3 text-left transition-colors active:bg-muted/70 hover:bg-muted/40 cursor-pointer",
        isActive && "border-l-[3.5px] border-emerald-500 bg-muted/70",
        hasUnread && !isActive && "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]"
      )}
    >
      {/* WhatsApp Circular Avatar with Status Badge */}
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-base font-semibold text-slate-700 dark:text-slate-200 shadow-xs ring-1 ring-border/20">
        {contact?.avatar_url ? (
          <img
            src={contact.avatar_url}
            alt={displayName}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          initials
        )}

        {/* Small Status Indicator Badge */}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ring-1 ring-black/5",
            STATUS_DOT_COLORS[conversation.status]
          )}
          title={conversation.status}
        />
      </div>

      {/* WhatsApp Content Area: Name, Time, Message Preview, and Unread Count */}
      <div className="min-w-0 flex-1">
        {/* Top Line: Contact Name & Timestamp */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-[15px] leading-tight text-foreground",
              hasUnread ? "font-bold" : "font-medium"
            )}
          >
            {displayName}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs",
              hasUnread
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground/80 font-normal"
            )}
          >
            {formattedTime}
          </span>
        </div>

        {/* Bottom Line: Message Preview & Unread Pill */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-[13px] leading-snug flex-1",
              hasUnread
                ? "font-medium text-foreground/90"
                : "text-muted-foreground"
            )}
          >
            {renderMessagePreview(conversation.last_message_text, t)}
          </p>

          {/* Right side: Unread Badge and Optional Tags */}
          <div className="flex shrink-0 items-center gap-1.5">
            {contact?.tags && contact.tags.length > 0 && !hasUnread && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: contact.tags[0].color }}
                title={contact.tags.map((tg) => tg.name).join(", ")}
              />
            )}
            {hasUnread && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white shadow-xs">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

