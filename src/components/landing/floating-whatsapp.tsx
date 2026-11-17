"use client";

import { MessageSquare, Sparkles } from "lucide-react";

export function FloatingWhatsApp() {
  const whatsappUrl = "https://wa.me/?text=Hello!%20I%20am%20interested%20in%20Broadcast%20Manager%20for%20WhatsApp.";

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 group">
      {/* Floating tooltip badge on desktop */}
      <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-card border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md group-hover:scale-105 transition-all">
        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
        <span>Chat with an expert</span>
      </div>

      {/* Floating Action Button - 56px touch target */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp with our team"
        className="flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/40 hover:bg-emerald-700 hover:scale-110 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
      >
        <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7" />
      </a>
    </div>
  );
}
