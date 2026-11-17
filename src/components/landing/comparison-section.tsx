import { Check, X, Sparkles, ShieldCheck } from "lucide-react";

export function ComparisonSection() {
  const comparisonItems = [
    {
      feature: "Meta Account Ban Risk",
      us: "Zero Ban Risk (Official Meta Cloud API)",
      usPositive: true,
      scrapers: "EXTREME (Immediate Permanent Bans)",
      scrapersPositive: false,
      bsps: "Zero Ban Risk (Official API)",
      bspsPositive: true,
    },
    {
      feature: "Platform Markup on Messages",
      us: "₹0.00 / Zero Markup (Pay Meta Direct)",
      usPositive: true,
      scrapers: "N/A (Unofficial)",
      scrapersPositive: false,
      bsps: "High Markup (+₹0.15 to ₹0.35 / msg)",
      bspsPositive: false,
    },
    {
      feature: "Multi-Agent Team Seats",
      us: "Unlimited Agents Included",
      usPositive: true,
      scrapers: "Single User Only (1 Device)",
      scrapersPositive: false,
      bsps: "Heavy Extra Charges per Agent Seat",
      bspsPositive: false,
    },
    {
      feature: "Monthly Base Platform Fee",
      us: "Flat ₹3,000 / month (Pro)",
      usPositive: true,
      scrapers: "Cheap but Account Gets Banned",
      scrapersPositive: false,
      bsps: "₹7,500 - ₹25,000+ / month",
      bspsPositive: false,
    },
    {
      feature: "WhatsApp GST Invoices & UPI",
      us: "Included (Integrated UPI & Razorpay links)",
      usPositive: true,
      scrapers: "Not Supported",
      scrapersPositive: false,
      bsps: "Requires Expensive Add-ons",
      bspsPositive: false,
    },
    {
      feature: "24/7 AI Agent with Custom RAG",
      us: "Included (Trained on your business docs)",
      usPositive: true,
      scrapers: "Not Available",
      scrapersPositive: false,
      bsps: "Expensive Add-on ($100+/mo extra)",
      bspsPositive: false,
    },
    {
      feature: "No-Code Visual Flow Builder",
      us: "Full Drag-and-Drop Canvas Included",
      usPositive: true,
      scrapers: "None or Rigid Basic Auto-responder",
      scrapersPositive: false,
      bsps: "Gated behind Top-tier Plans",
      bspsPositive: false,
    },
    {
      feature: "Official Meta Template Management",
      us: "Direct Sync, Real-time Status & Rejection Diagnostics",
      usPositive: true,
      scrapers: "Not Supported",
      scrapersPositive: false,
      bsps: "Supported but Delayed Sync",
      bspsPositive: true,
    },
    {
      feature: "Webhooks & Developer REST API",
      us: "Full Access & HMAC-SHA256 Security Included",
      usPositive: true,
      scrapers: "No Developer API",
      scrapersPositive: false,
      bsps: "Restricted or API Rate-Gated",
      bspsPositive: false,
    },
  ];

  return (
    <section id="comparison" className="scroll-mt-20 py-16 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Honest Breakdown</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Why Modern Indian Businesses Choose Us
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            See how our Official Meta Cloud API platform stacks up against dangerous Chrome scrapers and overpriced legacy BSPs.
          </p>
        </div>

        {/* Desktop Comparison Table (hidden on mobile) */}
        <div className="hidden lg:block overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-5 px-6 text-sm font-bold text-foreground w-1/4">
                  Feature / Capability
                </th>
                <th className="py-5 px-6 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-x border-emerald-500/20 w-1/3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    <span>Broadcast Manager (Official Cloud API)</span>
                  </div>
                </th>
                <th className="py-5 px-6 text-sm font-bold text-muted-foreground w-1/5">
                  Unofficial Web Extensions
                </th>
                <th className="py-5 px-6 text-sm font-bold text-muted-foreground w-1/5">
                  Traditional High-Markup BSPs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {comparisonItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6 font-semibold text-foreground">
                    {item.feature}
                  </td>

                  {/* Our Platform */}
                  <td className="py-4 px-6 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 border-x border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span>{item.us}</span>
                    </div>
                  </td>

                  {/* Scrapers */}
                  <td className="py-4 px-6 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {item.scrapersPositive ? (
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-rose-500 shrink-0" />
                      )}
                      <span>{item.scrapers}</span>
                    </div>
                  </td>

                  {/* Traditional BSPs */}
                  <td className="py-4 px-6 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {item.bspsPositive ? (
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <span>{item.bsps}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dedicated Mobile Touch Cards (sm:block lg:hidden) - Per AGENTS.md mobile rule */}
        <div className="lg:hidden space-y-4">
          {comparisonItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3"
            >
              <div className="font-bold text-sm text-foreground pb-2 border-b border-border">
                {item.feature}
              </div>

              {/* Our Platform Pill */}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Broadcast Manager:</span>
                </div>
                <div className="text-xs font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{item.us}</span>
                </div>
              </div>

              {/* Scrapers Pill */}
              <div className="p-2 rounded-lg bg-muted/40">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Unofficial Web Extensions:
                </div>
                <div className="text-xs text-foreground/80 mt-0.5 flex items-center gap-1.5">
                  {item.scrapersPositive ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  )}
                  <span>{item.scrapers}</span>
                </div>
              </div>

              {/* Traditional BSPs Pill */}
              <div className="p-2 rounded-lg bg-muted/40">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Traditional BSPs:
                </div>
                <div className="text-xs text-foreground/80 mt-0.5 flex items-center gap-1.5">
                  {item.bspsPositive ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                  <span>{item.bsps}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
