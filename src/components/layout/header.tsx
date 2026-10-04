"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, Settings as SettingsIcon, User } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "dashboard",
  "/inbox": "inbox",
  "/notifications": "notifications",
  "/contacts": "contacts",
  "/pipelines": "pipelines",
  "/broadcasts": "broadcasts",
  "/automations": "automations",
  "/flows": "flows",
  "/agents": "aiAgents",
  "/settings": "settings",
};

function getPageTitleKey(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  );
  return match ? match[1] : "dashboard";
}

interface HeaderProps {
  /** Wired to the shell's drawer state. Used only on mobile — the
   *  hamburger button is hidden on lg+. */
  onOpenSidebar?: () => void;
}

function UserAccountMenu({ isMobile }: { isMobile: boolean }) {
  const t = useTranslations("Header");
  const { profile, signOut } = useAuth();
  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none data-popup-open:bg-muted/70",
          isMobile ? "sm:gap-2" : "sm:gap-3 sm:pl-1 sm:pr-3"
        )}
        aria-label={t("openAccountMenu")}
      >
        <Avatar className="size-8">
          {profile?.avatar_url ? (
            <AvatarImage
              src={profile.avatar_url}
              alt={profile.full_name ?? t("defaultAvatar")}
            />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
        {!isMobile && (
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {profile?.full_name ?? t("defaultUser")}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isMobile ? "start" : "end"}
        sideOffset={6}
        className="min-w-56 bg-popover text-popover-foreground ring-border z-50"
      >
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {profile?.full_name ?? t("defaultUser")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {profile?.email ?? ""}
          </p>
        </div>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          render={
            <Link
              href="/settings?tab=profile"
              className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
            />
          }
        >
          <User className="size-4" />
          {t("menuProfile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <Link
              href="/settings?tab=whatsapp"
              className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
            />
          }
        >
          <SettingsIcon className="size-4" />
          {t("menuSettings")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={signOut}
          className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <LogOut className="size-4" />
          {t("menuSignOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const t = useTranslations("Header");
  const pathname = usePathname();
  const titleKey = getPageTitleKey(pathname);

  let titleText = "Dashboard";
  try {
    titleText = t(titleKey as string);
  } catch {
    titleText = titleKey.charAt(0).toUpperCase() + titleKey.slice(1);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 lg:px-6">
      {/* Left side: on mobile -> Profile avatar on the left + Page Title; on desktop -> Page Title */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="lg:hidden">
          <UserAccountMenu isMobile={true} />
        </div>
        <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
          {titleText}
        </h1>
      </div>

      {/* Right side: on mobile -> ModeToggle + Hamburger icon on the right; on desktop -> ModeToggle + Profile Menu */}
      <div className="flex items-center gap-1 sm:gap-2">
        <ModeToggle />

        {/* Desktop profile menu */}
        <div className="hidden lg:block">
          <UserAccountMenu isMobile={false} />
        </div>

        {/* Mobile Hamburger menu button on the RIGHT */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={t("openMenu")}
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
