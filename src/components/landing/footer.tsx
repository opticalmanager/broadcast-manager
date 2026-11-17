import Link from "next/link";
import { MessageSquare, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-background pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-border">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-bold text-lg text-foreground">
                    Broadcast Manager
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                    Official API
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Direct Meta WhatsApp Cloud API Platform
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
              The modern WhatsApp marketing and broadcast automation engine for India. High-volume broadcasts, visual no-code flows, 24/7 AI agents, WhatsApp GST invoices, and shared multi-agent inbox with ₹0 message markup.
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Official Cloud API • Zero Account Ban Risk</span>
            </div>
          </div>

          {/* Col 2: Core Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Official Cloud API</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">Broadcast Manager</a></li>
              <li><a href="#flows-ai" className="hover:text-foreground transition-colors">Visual Flow Builder</a></li>
              <li><a href="#flows-ai" className="hover:text-foreground transition-colors">AI Agent &amp; Custom RAG</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">WhatsApp GST Invoices &amp; UPI</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">Drip Campaigns &amp; Sequences</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">Shared Team Inbox</a></li>
              <li><a href="#features" className="hover:text-foreground transition-colors">Dynamic QR Code Links</a></li>
            </ul>
          </div>

          {/* Col 3: Pricing & Comparison */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Pricing &amp; Rates
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Browser Starter (₹999/mo)</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors font-semibold text-emerald-600 dark:text-emerald-400">Cloud Pro (₹3,000/mo)</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Enterprise Boost (₹6,999/mo)</a></li>
              <li><a href="#meta-rates" className="hover:text-foreground transition-colors">Official Meta India Rates</a></li>
              <li><a href="#comparison" className="hover:text-foreground transition-colors">Platform Comparison</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">Frequently Asked Questions</a></li>
              <li><Link href="/signup" className="text-emerald-600 font-semibold hover:underline">Start Free Trial</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Client Login</Link></li>
            </ul>
          </div>

          {/* Col 4: Integrations & API */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Developers &amp; Security
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><span className="text-muted-foreground">REST API Documentation</span></li>
              <li><span className="text-muted-foreground">Outbound HMAC Webhooks</span></li>
              <li><span className="text-muted-foreground">Shopify Integration</span></li>
              <li><span className="text-muted-foreground">WooCommerce Webhooks</span></li>
              <li><span className="text-muted-foreground">SSRF &amp; Token Security</span></li>
              <li><span className="text-muted-foreground">Data Privacy &amp; Sovereignty</span></li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer & Meta Notice */}
        <div className="pt-8 space-y-4">
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            <strong>Disclaimer:</strong> This service is not endorsed, sponsored, or affiliated with Meta Platforms, Inc. or WhatsApp Inc. WhatsApp is a registered trademark of Meta Platforms, Inc. We provide management software connecting via the official WhatsApp Business Platform (Cloud API). All message conversation charges are billed directly by Meta Platforms, Inc. in accordance with their standard regional pricing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
            <div>
              © {new Date().getFullYear()} Broadcast Manager. All rights reserved.
            </div>
            <div className="flex items-center gap-1">
              <span>Engineered with</span>
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              <span>for Indian businesses</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
