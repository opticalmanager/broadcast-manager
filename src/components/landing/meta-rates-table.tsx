import { ShieldCheck, Info } from "lucide-react";

export function MetaRatesTable() {
  const rates = [
    {
      category: "Marketing",
      metaRate: "₹0.8631",
      ourMarkup: "₹0.00",
      totalRate: "₹0.8631",
      description: "Promotional campaigns, flash sales, festive offers, cart reminders, and product catalogs.",
      badge: "Highest ROI",
    },
    {
      category: "Utility",
      metaRate: "₹0.1150",
      ourMarkup: "₹0.00",
      totalRate: "₹0.1150",
      description: "Order confirmations, dispatch & tracking updates, payment receipts, appointment reminders.",
      badge: "High Volume",
    },
    {
      category: "Authentication (OTP)",
      metaRate: "₹0.1150",
      ourMarkup: "₹0.00",
      totalRate: "₹0.1150",
      description: "Secure one-time passcodes, multi-factor authentication, and account recovery.",
      badge: "Instant Delivery",
    },
    {
      category: "Service (Support)",
      metaRate: "First 1,000 / mo FREE",
      ourMarkup: "₹0.00",
      totalRate: "₹0.00 (then ₹0.1150)",
      description: "Inbound customer-initiated chats. 1,000 conversations free every month per phone number.",
      badge: "Free Tier Included",
    },
    {
      category: "Click-to-WhatsApp Ads",
      metaRate: "FREE for 72 Hours",
      ourMarkup: "₹0.00",
      totalRate: "₹0.00 (Zero Fee)",
      description: "Leads originating from Meta Ads enjoy a 72-hour window of 100% free messaging.",
      badge: "Best for Paid Ads",
    },
  ];

  return (
    <section id="meta-rates" className="scroll-mt-20 py-16 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% Transparent India Pricing</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Official Meta Conversation Rates (India)
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            No hidden commissions. No middleman surcharge. You pay Meta directly in INR via your own Meta Business Manager.
          </p>
        </div>

        {/* Desktop View: Rich Table (hidden on mobile) */}
        <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-card shadow-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-4 px-6 text-sm font-bold text-foreground">Message Category</th>
                <th className="py-4 px-6 text-sm font-bold text-muted-foreground">Description &amp; Use Case</th>
                <th className="py-4 px-6 text-sm font-bold text-foreground">Official Meta Base Rate</th>
                <th className="py-4 px-6 text-sm font-bold text-emerald-600 dark:text-emerald-400">Our Platform Markup</th>
                <th className="py-4 px-6 text-sm font-bold text-foreground">Your Net Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {rates.map((rate, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-foreground">{rate.category}</div>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {rate.badge}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-muted-foreground max-w-xs text-xs sm:text-sm">
                    {rate.description}
                  </td>
                  <td className="py-4 px-6 font-mono font-semibold text-foreground">
                    {rate.metaRate}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    {rate.ourMarkup}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-foreground">
                    {rate.totalRate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dedicated Mobile Touch Cards (sm:hidden) - Per AGENTS.md mobile rule */}
        <div className="sm:hidden space-y-4">
          {rates.map((rate, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-foreground">{rate.category}</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {rate.badge}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {rate.description}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] text-muted-foreground font-medium">Meta Rate</div>
                  <div className="text-xs font-bold font-mono text-foreground mt-0.5">{rate.metaRate}</div>
                </div>

                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <div className="text-[10px] text-emerald-600 font-semibold">Our Markup</div>
                  <div className="text-xs font-bold font-mono text-emerald-600 mt-0.5">{rate.ourMarkup}</div>
                </div>

                <div className="rounded-lg bg-secondary p-2">
                  <div className="text-[10px] text-foreground font-medium">Net Cost</div>
                  <div className="text-xs font-bold font-mono text-foreground mt-0.5">{rate.totalRate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Informative Note Box */}
        <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4 sm:p-5 flex items-start gap-3 text-xs sm:text-sm text-muted-foreground">
          <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Direct Billing Guarantee:</strong> Official Meta rates are billed directly by Meta Platforms, Inc. in INR to your registered credit card or payment method in your Meta Business Account. Applicable 18% GST is collected directly by Meta. Our platform takes zero commission and zero markup.
          </p>
        </div>
      </div>
    </section>
  );
}
