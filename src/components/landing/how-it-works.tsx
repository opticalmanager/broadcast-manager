import { KeyRound, Users, Send, MessageSquareText, ArrowRight } from "lucide-react";
import Link from "next/link";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Connect Meta Cloud API",
      description: "Directly link your official WhatsApp Business Account using your Phone Number ID and Meta System User Token. No third-party middleman lock-in.",
      icon: KeyRound,
    },
    {
      step: "02",
      title: "Sync Templates & Import Leads",
      description: "Upload customer lists with smart Indian +91 normalization. Sync your approved Meta message templates with 1-click status checking.",
      icon: Users,
    },
    {
      step: "03",
      title: "Deploy Flows & Mass Broadcasts",
      description: "Build interactive visual chatbot flows with buttons and menus. Launch personalized mass broadcast campaigns to 100k+ opt-ins with ₹0 markup.",
      icon: Send,
    },
    {
      step: "04",
      title: "Automate Support & Close Sales",
      description: "Let your custom AI agent resolve queries 24/7 or assign high-intent conversations to human team members in the shared live chat inbox.",
      icon: MessageSquareText,
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-muted/20 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Simple 4-Step Process
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Get Up & Running in Under 10 Minutes
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            No technical hurdles. No complicated approvals. Follow our simple direct onboarding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-extrabold font-mono text-emerald-600/70 dark:text-emerald-400/70">
                      {item.step}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-98"
          >
            <span>Start Free Setup Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
