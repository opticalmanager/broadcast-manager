import Link from "next/link";
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Bot 
} from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24">
      {/* Background radial gradients */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80"
      >
        <div 
          className="aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-emerald-500/25 via-teal-400/20 to-emerald-700/10 opacity-70"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Official Badge Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm backdrop-blur-sm hover:border-emerald-500/50 transition-colors">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Official Meta Cloud API • Zero Ban Risk • ₹0 Message Markup</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-6 max-w-5xl text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Scale Your Business on WhatsApp with{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
              Official Cloud API & AI Automation
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-3xl text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
            Stop risking number bans with unofficial scraping extensions. Direct Meta Cloud API connectivity
            with <strong className="text-foreground font-semibold">zero message markup</strong>. Broadcast to 100k+ opt-in contacts, deploy 24/7 AI agents with custom business knowledge, and collaborate in a shared multi-agent inbox.
          </p>

          {/* CTA Group */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
            <Link
              href="/signup"
              className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/40 transition-all active:scale-98"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/login"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-3 text-base font-semibold text-foreground backdrop-blur-sm hover:bg-muted hover:border-border/80 transition-all active:scale-98"
            >
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <span>Explore Live Platform</span>
            </Link>
          </div>

          {/* Trust Value Checklist */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Direct Meta INR Billing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>₹0 Platform Message Markup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Built-in RAG AI Agent</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
