"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, MessageSquare, Radio, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useMobileNav } from "@/contexts/mobile-nav-context";

interface BottomTabItem {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  badgeCount?: number;
}

export function MobileBottomNav() {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const totalUnread = useTotalUnread();
  const { isBottomNavHidden } = useMobileNav();

  if (isBottomNavHidden) {
    return null;
  }

  const tabs: BottomTabItem[] = [
    {
      href: "/dashboard",
      labelKey: "dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/inbox",
      labelKey: "inbox",
      icon: MessageSquare,
      badgeCount: totalUnread,
    },
    {
      href: "/broadcasts",
      labelKey: "broadcasts",
      icon: Radio,
    },
    {
      href: "/contacts",
      labelKey: "contacts",
      icon: Users,
    },
  ];

  return (
    <nav
      aria-label={t("primaryNav")}
      className={cn(
        "fixed bottom-0 inset-x-0 z-30 flex h-14 items-center justify-around",
        "border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        "pb-[env(safe-area-inset-bottom,0px)] lg:hidden",
        "transition-transform duration-200 ease-in-out"
      )}
    >
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-colors",
              "touch-manipulation select-none active:opacity-70",
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative flex items-center justify-center">
              <div
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-all",
                  isActive && "bg-primary/15 text-primary"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-105")} />
              </div>
              {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full",
                    "bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm animate-in zoom-in-75"
                  )}
                  aria-label={t("unreadConversations", { count: tab.badgeCount })}
                >
                  {tab.badgeCount > 99 ? "99+" : tab.badgeCount}
                </span>
              )}
            </div>
            <span className="mt-0.5 text-[10px] tracking-tight">
              {t(tab.labelKey as string)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
