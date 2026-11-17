"use client";

import { useState } from "react";
import { TrendingUp, Sparkles, Coins, ArrowRight } from "lucide-react";
import Link from "next/link";

export function SavingsCalculator() {
  const [messagesPerMonth, setMessagesPerMonth] = useState<number>(30000);
  
  // Traditional BSP parameters:
  // Usually ₹7,500/mo base plan + average ₹0.25 markup per message
  const competitorBase = 7500;
  const competitorMarkupPerMsg = 0.25;
  const competitorMarkupTotal = messagesPerMonth * competitorMarkupPerMsg;
  const competitorTotal = competitorBase + competitorMarkupTotal;

  // Our platform:
  // Flat ₹3,000/month + ₹0.00 markup
  const ourCost = 3000;

  // Savings (excluding raw Meta fees which are identical):
  const monthlySavings = Math.round(competitorTotal - ourCost);
  const annualSavings = monthlySavings * 12;

  return (
    <section className="py-16 sm:py-24 bg-muted/30 border-y border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Coins className="h-3.5 w-3.5" />
            <span>Zero Markup ROI Calculator</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            How Much Are Hidden Message Markups Costing You?
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            Most WhatsApp providers secretly add 20 to 35 paise on every message you deliver. See how much you save with our transparent <strong className="text-foreground">₹0 platform markup</strong>.
          </p>
        </div>

        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Interactive Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="msg-slider" className="text-sm font-bold text-foreground">
                    Monthly Messages Delivered:
                  </label>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {messagesPerMonth.toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag the slider to adjust your expected message volume.
                </p>

                <input
                  id="msg-slider"
                  type="range"
                  min="5000"
                  max="200000"
                  step="5000"
                  value={messagesPerMonth}
                  onChange={(e) => setMessagesPerMonth(Number(e.target.value))}
                  className="mt-4 w-full h-2.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />

                <div className="flex justify-between text-[11px] font-mono text-muted-foreground mt-2">
                  <span>5,000 / mo</span>
                  <span>50,000 / mo</span>
                  <span>100,000 / mo</span>
                  <span>200,000+ / mo</span>
                </div>
              </div>

              {/* Comparison breakdown rows */}
              <div className="space-y-3 pt-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="text-muted-foreground">
                    <div>Traditional BSPs (₹0.25 markup + ₹7,500 base)</div>
                    <div className="text-[11px] text-muted-foreground">Platform fees + Hidden markups</div>
                  </div>
                  <div className="text-base font-bold text-rose-500 font-mono">
                    ₹{competitorTotal.toLocaleString("en-IN")} / mo
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      <span>Our Platform (₹0 markup + ₹3,000 flat)</span>
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Zero hidden per-message commissions
                    </div>
                  </div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{ourCost.toLocaleString("en-IN")} / mo
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Savings Highlight Card */}
            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 sm:p-7 shadow-lg flex flex-col justify-between text-center">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-emerald-100">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  Your Estimated Savings
                </span>

                <div className="mt-5">
                  <div className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">
                    You Save Every Month:
                  </div>
                  <div className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
                    ₹{monthlySavings.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-emerald-500/40">
                  <div className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">
                    Annual Savings:
                  </div>
                  <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-amber-300">
                    ₹{annualSavings.toLocaleString("en-IN")} / yr
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/signup"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow hover:bg-emerald-50 transition-all active:scale-98"
                >
                  <span>Start Saving Today</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-2 text-[10px] text-emerald-200">
                  *Excludes official Meta conversation fees which are paid directly to Meta.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
