import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-emerald-900 via-teal-900 to-emerald-800 text-white p-8 sm:p-14 shadow-2xl border border-emerald-500/30">
          {/* Subtle background glow */}
          <div 
            aria-hidden="true" 
            className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"
          />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200 border border-white/20 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              <span>Official Meta WhatsApp Cloud API</span>
            </div>

            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Ready to 10x Your Conversions on WhatsApp?
            </h2>

            <p className="mt-4 text-base sm:text-lg text-emerald-100/90 leading-relaxed max-w-2xl">
              Stop risking number bans and paying 25 paise hidden markups. Launch high-volume broadcasts, automate with AI agents, and collaborate in a shared team inbox today.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 text-base font-bold text-emerald-900 shadow-lg hover:bg-emerald-50 transition-all active:scale-98"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/login"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-all active:scale-98"
              >
                <span>Sign In to Dashboard</span>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-emerald-200">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <span>Zero Account Ban Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-300" />
                <span>₹0 Platform Message Markup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>⚡ Setup Takes Under 5 Minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
