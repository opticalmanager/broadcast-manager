"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Menu, 
  X, 
  MessageSquare, 
  ArrowRight, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Sparkles 
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

interface NavbarProps {
  isAuthenticated?: boolean;
}

export function Navbar({ isAuthenticated = false }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { mode, toggleMode } = useTheme();

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "AI & Flows", href: "#flows-ai" },
    { name: "Comparison", href: "#comparison" },
    { name: "Meta Rates", href: "#meta-rates" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="group flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1 min-h-[44px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-lg tracking-tight text-foreground">
                Broadcast Manager
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Official API
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              Direct Meta Cloud Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors min-h-[44px] flex items-center"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Light/Dark Mode Toggle - min-h-[44px] touch target */}
          <button
            type="button"
            onClick={toggleMode}
            aria-label="Toggle theme mode"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          >
            {mode === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg px-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all hover:shadow-md hover:shadow-emerald-600/20 active:scale-98"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu & Theme Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={toggleMode}
            aria-label="Toggle theme mode"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-muted-foreground active:bg-muted"
          >
            {mode === "dark" ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-card text-foreground active:bg-muted"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-lg px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-muted active:bg-muted/80 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-border flex flex-col gap-2.5">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-sm"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-base font-semibold text-foreground active:bg-muted"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-md shadow-emerald-600/25 active:bg-emerald-700"
                >
                  <Sparkles className="h-5 w-5" />
                  Get Started Free
                </Link>
              </>
            )}

            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Official WhatsApp Cloud API • Zero Ban Risk</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
