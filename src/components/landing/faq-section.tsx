"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does this platform differ from WhatsApp Web Chrome extensions?",
      a: "Chrome extensions and unofficial automation tools scrape WhatsApp Web using your personal phone session. Meta actively detects and permanently bans phone numbers using scrapers. In contrast, our platform connects directly to Meta's Official WhatsApp Cloud API with zero ban risk, 99.98% delivery uptime, high throughput (80+ to 200 msg/s), and official Green Tick support.",
    },
    {
      q: "How does your pricing work, and what is included in the ₹3,000/month plan?",
      a: "Our flagship Cloud Pro plan is ₹3,000 / month (or ₹2,400/month billed annually). It unlocks all core features with zero hidden markups: Official Meta Cloud API connection, unlimited team agent seats, visual drag-and-drop flow builder, 24/7 AI agent with custom RAG knowledge base, high-volume broadcast manager, WhatsApp GST invoice generator, and live delivery diagnostics. For lightweight needs, we offer the Browser Starter plan (₹999/mo), and for ultra-high throughput with dedicated server queues, the Enterprise Boost plan (₹6,999/mo).",
    },
    {
      q: "Do you charge any per-message markup on WhatsApp conversations?",
      a: "No! Absolutely ₹0.00 platform markup. Traditional WhatsApp BSPs (Business Solution Providers) silently add 20 to 35 paise on top of Meta's rates for every message delivered. With us, you pay Meta directly in INR via your own Meta Business Manager credit card with complete transparency.",
    },
    {
      q: "What are Meta's official conversation rates in India?",
      a: "Meta charges based on message category for Indian numbers (+91): Marketing messages are ₹0.8631, Utility messages (order confirmations, shipping) are ₹0.1150, and Authentication OTPs are ₹0.1150. Inbound customer service queries include 1,000 FREE conversations per month, and Click-to-WhatsApp Ads have a 72-hour completely free window.",
    },
    {
      q: "Do you support embedded signup for WhatsApp?",
      a: "Currently, we do not include embedded signup. Instead, we use a clean and direct Meta Cloud API setup where you enter your official Meta Phone Number ID, WABA ID, and System User Access Token. This approach guarantees 100% sovereign ownership and control over your WhatsApp Business Account and Meta billing without intermediary vendor lock-in.",
    },
    {
      q: "How does the WhatsApp GST Invoice Generator work?",
      a: "You can create GST-compliant tax invoices (supporting 5%, 12%, 18%, or custom tax brackets) and dispatch them immediately in WhatsApp chat. The invoice includes a downloadable PDF receipt and integrated 1-click UPI, Razorpay, or Paytm checkout buttons. Once paid, our webhooks automatically reconcile the payment in your CRM.",
    },
    {
      q: "Can multiple team members use the same WhatsApp business number?",
      a: "Yes! Our Shared Multi-Agent Team Inbox allows unlimited support and sales reps to log in simultaneously from their respective devices. You can assign conversations to specific agents, add private internal team notes, track response times, and use canned quick-reply templates.",
    },
    {
      q: "How does the AI Agent with custom business knowledge (RAG) work?",
      a: "You can upload your product catalogs, PDF guidelines, return policies, and website FAQs. Our RAG engine indexes your documents and powers a 24/7 AI chatbot that accurately answers customer queries in real-time. If a complex question arises or a customer asks for a human, the bot automatically flags and assigns the chat to a live team member.",
    },
    {
      q: "Can I connect my Shopify store, WooCommerce, or custom CRM?",
      a: "Yes. We offer outbound webhooks with HMAC-SHA256 signature verification and developer REST APIs. You can easily trigger automated WhatsApp messages whenever an order is placed, an abandoned cart is detected, a shipment tracking link is generated, or a lead form is submitted.",
    },
    {
      q: "Can I get the official Meta Verified Green Tick badge on my WhatsApp profile?",
      a: "Yes! Because you are connected to the Official WhatsApp Cloud API through Meta Business Manager, your business qualifies to apply for Meta's Official Business Account (Green Tick) verification. Our team assists you with the eligibility guidelines and verification steps.",
    },
  ];

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="scroll-mt-20 py-16 sm:py-24 bg-muted/20 border-t border-border/60">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Everything you need to know about the Official Meta WhatsApp Cloud API, our ₹3,000/mo plan, and platform features.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card shadow-sm transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex min-h-[52px] w-full items-center justify-between gap-4 p-5 text-left text-sm sm:text-base font-semibold text-foreground hover:bg-muted/40 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-600" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3 animate-in fade-in-50 duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
