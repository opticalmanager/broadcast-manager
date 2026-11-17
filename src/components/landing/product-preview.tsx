"use client";

import { useState } from "react";
import { 
  MessageSquare, 
  Send, 
  Bot, 
  GitBranch, 
  FileCheck2, 
  CheckCheck, 
  Zap, 
  Sparkles,
  ArrowRight,
  Layers,
  Receipt,
  CreditCard,
  Download
} from "lucide-react";

export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<"inbox" | "broadcast" | "flow" | "invoice" | "templates">("inbox");

  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
      {/* Container Card with subtle glassmorphism */}
      <div className="relative rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-5 lg:p-6 shadow-2xl backdrop-blur-xl">
        {/* Browser / App Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 text-xs font-mono text-muted-foreground hidden sm:inline-block">
              app.broadcastmanager.live/dashboard
            </span>
          </div>

          {/* Interactive Feature Tabs - min-h-[44px] for accessible mobile touch targets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "inbox"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Team Inbox & AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("broadcast")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "broadcast"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Send className="h-4 w-4" />
              <span>Broadcast Campaigns</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("flow")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "flow"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <GitBranch className="h-4 w-4" />
              <span>Visual Flow Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("invoice")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "invoice"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>GST Invoices &amp; UPI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "templates"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Meta Templates</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Live Team Inbox & AI View */}
        {activeTab === "inbox" && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Chat list (hidden on small screens to prioritize conversation) */}
            <div className="hidden sm:block lg:col-span-4 rounded-xl border border-border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Active Chats (24)</span>
                <span className="text-emerald-600 font-bold">1 Unread</span>
              </div>

              {/* Chat Item 1 (Selected) */}
              <div className="rounded-lg p-2.5 bg-emerald-500/10 border border-emerald-500/30 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Aarav Sharma</span>
                  <span className="text-[11px] text-muted-foreground">Just now</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  Can you tell me if Order #98124 has shipped?
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    AI Auto-Replied
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                    Assigned: Priya S.
                  </span>
                </div>
              </div>

              {/* Chat Item 2 */}
              <div className="rounded-lg p-2.5 hover:bg-muted/60 transition-colors border border-transparent">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Sneha Patel</span>
                  <span className="text-[11px] text-muted-foreground">4m ago</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  Thanks! The checkout link worked seamlessly.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                    Tag: VIP Buyer
                  </span>
                </div>
              </div>

              {/* Chat Item 3 */}
              <div className="rounded-lg p-2.5 hover:bg-muted/60 transition-colors border border-transparent">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Vikram Verma</span>
                  <span className="text-[11px] text-muted-foreground">12m ago</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  How do I integrate the webhook with WooCommerce?
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                    Tag: Tech Support
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Active Chat Conversation */}
            <div className="lg:col-span-8 rounded-xl border border-border bg-background flex flex-col h-[420px] sm:h-[460px]">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/40">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    AS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">Aarav Sharma</span>
                      <span className="text-xs text-muted-foreground">(+91 98201 44210)</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Official 24-hr Service Window Open</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-medium hidden sm:inline-block">
                    Assigned: Priya S.
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                    Resolved by AI
                  </span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-muted/20">
                {/* Inbound Customer Message */}
                <div className="flex flex-col items-start max-w-[85%] sm:max-w-[70%]">
                  <div className="rounded-2xl rounded-tl-sm bg-card border border-border p-3 shadow-sm">
                    <p className="text-sm text-foreground">
                      Hi, can you please tell me if my Order #98124 has shipped? I need it before Saturday.
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-muted-foreground">
                      <span>11:42 AM</span>
                    </div>
                  </div>
                </div>

                {/* AI Automated Response */}
                <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] ml-auto">
                  <div className="rounded-2xl rounded-tr-sm bg-emerald-600 text-white p-3.5 shadow-md">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-semibold mb-1">
                      <Bot className="h-3.5 w-3.5" />
                      <span>AI Agent (Autonomous RAG)</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      Hello Aarav! 📦 Your Order <strong>#98124</strong> has been dispatched via BlueDart Express (AWB: <code className="bg-emerald-700/60 px-1 py-0.5 rounded">BD-7749102</code>).
                      <br /><br />
                      Estimated delivery: <strong>Tomorrow by 4:00 PM</strong>.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-lg bg-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/30 cursor-pointer">
                        📍 Track Live Courier
                      </span>
                      <span className="inline-flex items-center rounded-lg bg-white/20 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/30 cursor-pointer">
                        📄 Download Invoice PDF
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-emerald-200">
                      <span>11:42 AM</span>
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-200" />
                    </div>
                  </div>
                </div>

                {/* Internal Agent Note */}
                <div className="mx-auto max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-center text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">Internal Team Note:</span> Customer is high-value. AI auto-resolved tracking query without agent intervention.
                </div>
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-border bg-card/60 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="Type a message or select a canned quick-reply..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-muted-foreground outline-none"
                />
                <button
                  type="button"
                  className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: High-Volume Broadcast Campaign Manager */}
        {activeTab === "broadcast" && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-background p-3.5">
                <div className="text-xs text-muted-foreground font-medium">Campaign Name</div>
                <div className="text-sm font-bold text-foreground mt-0.5 truncate">Diwali Festive Launch 2026</div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">Status: Completed</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-3.5">
                <div className="text-xs text-muted-foreground font-medium">Total Recipients</div>
                <div className="text-xl font-bold text-foreground mt-0.5">25,000</div>
                <div className="text-xs text-muted-foreground mt-1">Audience: All Opt-in Contacts</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-3.5">
                <div className="text-xs text-muted-foreground font-medium">Delivery Rate</div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">99.4% (24,850)</div>
                <div className="text-xs text-muted-foreground mt-1">Zero Meta Ban Warnings</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-3.5">
                <div className="text-xs text-muted-foreground font-medium">Read &amp; Click Rate</div>
                <div className="text-xl font-bold text-teal-600 mt-0.5">62.8% (15,600)</div>
                <div className="text-xs text-muted-foreground mt-1">ROI: 8.4x Direct Sales</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <h4 className="font-bold text-foreground text-sm sm:text-base">Campaign Message Preview</h4>
                  <p className="text-xs text-muted-foreground">Template: festive_promo_india_v1 (Approved by Meta)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <CheckCheck className="h-3.5 w-3.5" />
                    ₹0 Platform Markup
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/80 bg-muted/30 p-4 font-mono text-xs text-foreground space-y-2">
                  <div className="text-muted-foreground font-sans font-semibold text-xs mb-1">Interpolated Template Data:</div>
                  <p>Hey <span className="bg-emerald-500/20 text-emerald-600 px-1 rounded font-bold">{"{{1: name}}"}</span> 🎉,</p>
                  <p>Our Exclusive VIP Festive Flash Sale is now LIVE! Enjoy flat <span className="bg-emerald-500/20 text-emerald-600 px-1 rounded font-bold">{"{{2: discount}}"}</span>% OFF on your favorite items.</p>
                  <p>Use code: <span className="bg-emerald-500/20 text-emerald-600 px-1 rounded font-bold">{"{{3: coupon_code}}"}</span> at checkout.</p>
                  <p className="text-muted-foreground font-sans text-xs pt-2">Buttons: [Claim Discount] [View Catalog]</p>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign Controls</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                      <span className="font-medium text-foreground">Anti-Spike Throttle Pacing</span>
                      <span className="text-emerald-600 font-bold">80 msgs / sec</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                      <span className="font-medium text-foreground">Phone Number Normalization</span>
                      <span className="text-emerald-600 font-bold">+91 India Auto-Format</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                      <span className="font-medium text-foreground">Meta Cost (Direct)</span>
                      <span className="text-foreground font-bold">₹0.8631 / delivered</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Visual Flow & Bot Builder */}
        {activeTab === "flow" && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4 sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h4 className="font-bold text-foreground text-sm sm:text-base">Interactive WhatsApp Flow Canvas</h4>
                <p className="text-xs text-muted-foreground">No-code node workflow with branching triggers</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Zap className="h-3.5 w-3.5" />
                Active Bot
              </span>
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 overflow-x-auto py-4">
              {/* Node 1: Trigger */}
              <div className="w-full md:w-60 rounded-xl border-2 border-emerald-500/40 bg-card p-3.5 shadow-md">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <Sparkles className="h-4 w-4" />
                  <span>1. Inbound Trigger</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground font-medium">
                  When customer types keywords: <strong className="text-foreground">&quot;DEMO&quot;, &quot;MENU&quot;, &quot;PRICE&quot;</strong>
                </p>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rotate-90 md:rotate-0" />

              {/* Node 2: Interactive List Message */}
              <div className="w-full md:w-64 rounded-xl border-2 border-teal-500/40 bg-card p-3.5 shadow-md">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-600">
                  <Layers className="h-4 w-4" />
                  <span>2. Interactive Quick Replies</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-[11px] bg-secondary px-2 py-1 rounded text-secondary-foreground font-medium">🔘 Button: Instant Pricing</div>
                  <div className="text-[11px] bg-secondary px-2 py-1 rounded text-secondary-foreground font-medium">🔘 Button: Product Catalog</div>
                  <div className="text-[11px] bg-secondary px-2 py-1 rounded text-secondary-foreground font-medium">🔘 Button: Connect Agent</div>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rotate-90 md:rotate-0" />

              {/* Node 3: Condition & Action */}
              <div className="w-full md:w-60 rounded-xl border-2 border-primary/40 bg-card p-3.5 shadow-md">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <GitBranch className="h-4 w-4" />
                  <span>3. Action Routing</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground font-medium">
                  If &quot;Connect Agent&quot; tapped: Tag contact as <span className="text-foreground font-semibold">Hot Lead</span> &amp; assign to available sales rep.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: GST Invoices & UPI Payments */}
        {activeTab === "invoice" && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h4 className="font-bold text-foreground text-sm sm:text-base">WhatsApp GST Invoice &amp; Payment Engine</h4>
                <p className="text-xs text-muted-foreground">Automate tax-compliant invoices and collect payments over UPI &amp; Razorpay</p>
              </div>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                GST Ready (18% / 12% / 5%)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* WhatsApp Message Preview */}
              <div className="lg:col-span-6 rounded-2xl bg-muted/40 border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Delivered WhatsApp Card Preview:
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-card border border-border/80 p-4 shadow-md max-w-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                      TAX INVOICE: #INV-2026-8819
                    </span>
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
                      DUE TODAY
                    </span>
                  </div>

                  <div className="mt-3 text-xs space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <strong className="text-foreground">Aarav Sharma (+91 98201 44210)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>GSTIN:</span>
                      <span className="font-mono text-foreground">27AAAPL1234F1Z5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Item:</span>
                      <span className="text-foreground">2x Smart RGB Ambient Lamp</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-dashed border-border text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxable Value:</span>
                      <span>₹2,965.25</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST (9%) + SGST (9%):</span>
                      <span>₹533.75</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                      <span>Total Amount:</span>
                      <span className="text-emerald-600 font-mono">₹3,499.00</span>
                    </div>
                  </div>

                  {/* Interactive Button Chips */}
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>💳 Pay via UPI / Razorpay (₹3,499)</span>
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground hover:bg-muted transition-colors border border-border"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>📄 Download PDF Tax Invoice</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Invoice Engine Highlights */}
              <div className="lg:col-span-6 space-y-3 text-xs sm:text-sm">
                <div className="rounded-xl border border-border p-3.5 bg-card">
                  <div className="font-bold text-foreground">Integrated UPI &amp; Razorpay Gateway</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Direct integration with Google Pay, PhonePe, Paytm, and credit cards. Instant webhook acknowledgment confirms payments in your CRM.
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3.5 bg-card">
                  <div className="font-bold text-foreground">Auto-Send on Order Placement</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Connect Shopify, WooCommerce, or custom ERP. Automatically dispatch GST-ready invoices immediately after an order is placed.
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3.5 bg-card">
                  <div className="font-bold text-foreground">Payment Reconciliation &amp; Receipt Dispatch</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Automatically triggers a WhatsApp receipt template when payment is received, closing the loop with ₹0 message markup.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Meta Templates */}
        {activeTab === "templates" && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h4 className="font-bold text-foreground text-sm sm:text-base">Meta Verified Template Sync</h4>
                <p className="text-xs text-muted-foreground">Manage templates directly without visiting Meta Business Manager</p>
              </div>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                100% Meta Cloud API Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3.5 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">order_confirmation_v2</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">APPROVED</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Category: Utility (₹0.1150/msg)</p>
                <p className="text-xs text-muted-foreground">Language: English (US)</p>
              </div>

              <div className="rounded-lg border border-border p-3.5 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">festive_vip_discount</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">APPROVED</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Category: Marketing (₹0.8631/msg)</p>
                <p className="text-xs text-muted-foreground">Language: Hindi / English</p>
              </div>

              <div className="rounded-lg border border-border p-3.5 bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">otp_verification_secure</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">APPROVED</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Category: Authentication (₹0.1150/msg)</p>
                <p className="text-xs text-muted-foreground">Language: English</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
