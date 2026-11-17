"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, ShieldCheck, Zap, Sparkles, Rocket, Globe } from "lucide-react";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      id: "browser",
      name: "Browser Starter",
      badge: "Entry Tier",
      badgeColor: "bg-muted text-muted-foreground",
      description: "For small teams starting with WhatsApp web & browser workflow integration.",
      monthlyPrice: 999,
      annualMonthlyEquivalent: 799,
      popular: false,
      icon: Globe,
      features: [
        "Browser Web WhatsApp integration & workspace tools",
        "Up to 2,000 Active Contacts",
        "3 Concurrent Team Agent Seats",
        "Basic Keyword Auto-replies & Canned Responses",
        "Website Lead Capture Chat Widget",
        "Dynamic QR Code Generator",
        "Standard CSV Contact Import (+91 auto-format)",
        "Standard Email & Community Support",
      ],
      ctaText: "Start with Browser",
      ctaHref: "/signup?plan=browser",
    },
    {
      id: "cloud-pro",
      name: "Cloud Pro",
      badge: "Most Popular • Flat ₹3,000/mo",
      badgeColor: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      description: "The complete Official WhatsApp Cloud API platform. All features unlocked with zero markup.",
      monthlyPrice: 3000,
      annualMonthlyEquivalent: 2400, // 20% discount on annual
      popular: true,
      icon: Zap,
      features: [
        "Official Meta WhatsApp Cloud API (100% Ban-Free)",
        "₹0 Platform Markup on Messages (Pay Meta direct base INR rates)",
        "Unlimited Concurrent Team Agent Seats & Live Shared Inbox",
        "High-Volume Broadcast Campaign Manager (100k+ mass sends)",
        "Drag-and-Drop Visual Flow & Chatbot Automation Canvas",
        "24/7 AI Agent with Custom Business RAG Knowledge Base",
        "WhatsApp GST Invoice Generator with UPI & Razorpay links",
        "Automated Drip Campaign Sequences & Lead Nurturing",
        "Meta Template Manager with instant status sync & rejection fixes",
        "Real-Time Delivery Analytics & Plain-English Error Diagnostics",
        "Developer REST API & Outbound Webhooks (HMAC-SHA256)",
        "First 1,000 Inbound Service Messages FREE every month",
      ],
      ctaText: "Get Started Free",
      ctaHref: "/signup?plan=pro",
    },
    {
      id: "boost",
      name: "Enterprise Boost",
      badge: "High Throughput",
      badgeColor: "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30",
      description: "For high-velocity scaling brands requiring turbo broadcast throughput and dedicated support.",
      monthlyPrice: 6999,
      annualMonthlyEquivalent: 5599,
      popular: false,
      icon: Rocket,
      features: [
        "Everything in Cloud Pro plan included",
        "Turbo Boost Campaign Throttle (Up to 200 msgs/sec priority pacing)",
        "Dedicated Meta Cloud API IP & Priority Webhook Queue",
        "Official Meta Green Tick Verification White-Glove Assistance",
        "Custom ERP / CRM / Shopify / WooCommerce webhook mapping",
        "Priority 24/7 Phone & Dedicated WhatsApp Account Manager",
        "99.99% Enterprise Uptime Service Level Agreement (SLA)",
        "Custom AI RAG Fine-Tuning & Multi-Language LLM support",
      ],
      ctaText: "Scale with Boost",
      ctaHref: "/signup?plan=boost",
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-20 py-16 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Transparent Subscription Pricing</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Simple, Predictable Plans for Every Scale
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            Flagship Official Cloud API at a flat <strong className="text-foreground">₹3,000/month</strong> with <strong className="text-foreground">₹0 per-message markup</strong>. Flexible Browser &amp; Boost options to suit your exact needs.
          </p>

          {/* Billing Switcher Toggle - Touch accessible >= 44px */}
          <div className="mt-8 inline-flex items-center rounded-xl bg-muted p-1 border border-border">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all min-h-[44px] flex items-center justify-center ${
                billingCycle === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Billed Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 min-h-[44px] justify-center ${
                billingCycle === "annual"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Billed Annually</span>
              <span className="rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 3-Tier Grid Layout: Responsive for Mobile Touch Cards and Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualMonthlyEquivalent;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border flex flex-col justify-between transition-all ${
                  plan.popular
                    ? "border-2 border-emerald-500 bg-card p-6 sm:p-8 shadow-2xl lg:-translate-y-2"
                    : "border-border bg-card/60 p-6 sm:p-8 shadow-md hover:shadow-xl hover:border-border/80"
                }`}
              >
                {/* Popular Highlight Ribbon */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-extrabold uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Recommended • ₹3,000 / mo</span>
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        plan.popular ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        {plan.name}
                      </h3>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mt-5 pb-6 border-b border-border">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-foreground font-mono">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                        / month
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {billingCycle === "annual"
                        ? `Billed annually at ₹${(price * 12).toLocaleString("en-IN")}/yr`
                        : `Billed monthly at ₹${price.toLocaleString("en-IN")}/mo`}
                    </div>
                  </div>

                  {/* Value Pill */}
                  <div className="mt-4">
                    {plan.id === "cloud-pro" ? (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs flex items-center justify-between">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Zero Message Markup</span>
                        <span className="text-[11px] text-muted-foreground">Pay Meta raw INR base</span>
                      </div>
                    ) : plan.id === "boost" ? (
                      <div className="rounded-xl bg-teal-500/10 border border-teal-500/20 p-2.5 text-xs flex items-center justify-between">
                        <span className="font-bold text-teal-700 dark:text-teal-400">Turbo Pacing 200 msg/s</span>
                        <span className="text-[11px] text-muted-foreground">Dedicated API queue</span>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-muted/50 border border-border p-2.5 text-xs flex items-center justify-between">
                        <span className="font-bold text-foreground">Browser Web Integration</span>
                        <span className="text-[11px] text-muted-foreground">Ideal for lean setups</span>
                      </div>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="mt-6">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Features Included:
                    </div>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground font-medium">
                          <div className={`rounded-full p-0.5 shrink-0 mt-0.5 ${
                            plan.popular ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"
                          }`}>
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="mt-8 pt-6 border-t border-border">
                  <Link
                    href={plan.ctaHref}
                    className={`group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm sm:text-base font-bold transition-all active:scale-98 ${
                      plan.popular
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:shadow-xl"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>No credit card required to explore</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Trust Guarantee Banner */}
        <div className="mt-12 mx-auto max-w-3xl rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <div className="font-bold text-sm text-foreground">Need a custom enterprise setup or high-volume billing?</div>
            <div className="text-xs text-muted-foreground mt-0.5">We provide customized multi-WABA routing and dedicated private infrastructure.</div>
          </div>
          <Link
            href="/signup?plan=boost"
            className="inline-flex min-h-[44px] items-center justify-center px-4 py-2 rounded-xl bg-foreground text-background font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Talk to Enterprise Sales
          </Link>
        </div>
      </div>
    </section>
  );
}
