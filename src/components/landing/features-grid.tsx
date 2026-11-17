import { 
  ShieldCheck, 
  Send, 
  GitBranch, 
  Bot, 
  Users, 
  FileCheck2, 
  UserCheck, 
  BarChart3, 
  QrCode, 
  Code2, 
  Receipt,
  Clock,
  Check, 
  Sparkles
} from "lucide-react";

export function FeaturesGrid() {
  const features = [
    {
      id: "official-api",
      title: "Direct Meta WhatsApp Cloud API",
      badge: "Official & 100% Ban-Free",
      description: "Direct connection with Meta's official infrastructure. Avoid permanent number bans caused by unofficial Chrome extensions or scraping bots.",
      bullets: [
        "Direct connection using Meta WABA ID & Permanent Token",
        "Assistance with Official Meta Green Tick verification",
        "Direct Meta INR billing with ₹0 platform markup",
        "Direct, sovereign account setup (no embedded signup lock-in)",
      ],
      icon: ShieldCheck,
      iconColor: "text-emerald-500",
      accentBg: "bg-emerald-500/10",
    },
    {
      id: "broadcasts",
      title: "High-Volume Broadcast Manager",
      badge: "Mass Scale Messaging",
      description: "Launch targeted marketing and promotional campaigns to 100k+ opt-in contacts in minutes with complete rate-limit safety.",
      bullets: [
        "Dynamic personalization: {{name}}, {{order_id}}, {{discount}}",
        "Rich media attachments: Images, Videos, PDF catalogs",
        "Anti-spike pacing throttle (up to 80+ msgs/sec)",
        "Schedule broadcasts with automatic pause & resume",
      ],
      icon: Send,
      iconColor: "text-teal-500",
      accentBg: "bg-teal-500/10",
    },
    {
      id: "visual-flows",
      title: "No-Code Flow & Bot Builder",
      badge: "Visual Automation Canvas",
      description: "Design conversational journeys and automated lead qualification funnels without writing a single line of code.",
      bullets: [
        "Interactive Quick-Reply buttons (up to 3 clickable buttons)",
        "WhatsApp Interactive List Menus (up to 10 selectable items)",
        "Smart keyword triggers: DEMO, CATALOG, PRICE, SUPPORT",
        "Conditional branching and automated CRM tag assignment",
      ],
      icon: GitBranch,
      iconColor: "text-cyan-500",
      accentBg: "bg-cyan-500/10",
    },
    {
      id: "ai-rag",
      title: "24/7 AI Agent with Custom RAG",
      badge: "Autonomous Intelligence",
      description: "Train an intelligent AI chatbot on your exact business documents, PDFs, FAQs, and product catalogs for natural customer conversations.",
      bullets: [
        "RAG (Retrieval-Augmented Generation) business knowledge base",
        "Context-aware multi-turn conversation memory",
        "Instant human agent escalation when purchase intent is high",
        "Token-efficient caching & detailed AI usage logs",
      ],
      icon: Bot,
      iconColor: "text-emerald-500",
      accentBg: "bg-emerald-500/10",
    },
    {
      id: "invoices-payments",
      title: "WhatsApp GST Invoice & Payments",
      badge: "Instant Checkout",
      description: "Generate GST-compliant invoices and send them directly over WhatsApp with 1-click UPI, Razorpay, or Paytm payment links.",
      bullets: [
        "Automated GST invoice generation with custom tax rates",
        "Attach 1-click payment links (UPI, Cards, NetBanking)",
        "Real-time payment receipt dispatch upon successful transaction",
        "Direct synchronization with order management & accounting",
      ],
      icon: Receipt,
      iconColor: "text-amber-500",
      accentBg: "bg-amber-500/10",
    },
    {
      id: "drip-campaigns",
      title: "Automated Drip Sequences",
      badge: "Lead Nurturing",
      description: "Set up multi-day automated WhatsApp drip campaigns to nurture leads, recover abandoned carts, and re-engage dormant customers.",
      bullets: [
        "Triggered sequences based on lead tags or purchase events",
        "Configurable wait delays (e.g. 2 hours, 1 day, 3 days)",
        "Smart cancellation when the lead converts or opts out",
        "A/B testing for open rates and reply conversions",
      ],
      icon: Clock,
      iconColor: "text-violet-500",
      accentBg: "bg-violet-500/10",
    },
    {
      id: "team-inbox",
      title: "Shared Multi-Agent Team Inbox",
      badge: "Collaboration Hub",
      description: "Empower your entire sales and support teams to answer customer queries simultaneously on a single verified WhatsApp number.",
      bullets: [
        "Unlimited concurrent team agent seats included",
        "Round-robin or manual conversation assignment",
        "Private internal agent notes and team mentions",
        "Canned quick replies with instant keyboard shortcuts",
      ],
      icon: Users,
      iconColor: "text-teal-500",
      accentBg: "bg-teal-500/10",
    },
    {
      id: "meta-templates",
      title: "Meta Verified Template Manager",
      badge: "Real-Time Sync",
      description: "Create, submit, and manage Meta message templates directly from your dashboard with instant status updates.",
      bullets: [
        "Instant sync for Approved, Pending, or Rejected states",
        "In-line Meta rejection diagnostic explanations and fixes",
        "Multi-language support (English, Hindi, and regional languages)",
        "Dynamic button configurations: Quick Reply, Call, URL",
      ],
      icon: FileCheck2,
      iconColor: "text-cyan-500",
      accentBg: "bg-cyan-500/10",
    },
    {
      id: "smart-contacts",
      title: "Contact Segmentation & +91 Normalizer",
      badge: "Audience Intelligence",
      description: "Organize customer data with intelligent CSV uploading and automated Indian telephone number formatting.",
      bullets: [
        "Smart CSV import with auto-column matching",
        "Automatic +91 Indian phone normalization (E.164 compliant)",
        "Custom attributes, lead pipelines & stage tracking",
        "Automated tagging based on customer click replies",
      ],
      icon: UserCheck,
      iconColor: "text-emerald-500",
      accentBg: "bg-emerald-500/10",
    },
    {
      id: "analytics",
      title: "Live Delivery Analytics & Diagnostics",
      badge: "Full Transparency",
      description: "Track the complete lifecycle of every message with real-time delivery graphs and plain-English Meta error explanations.",
      bullets: [
        "Real-time Sent, Delivered, Read, and Failed tracking",
        "Decodes cryptic Meta error codes (131026, 131047, etc.)",
        "Campaign conversion and read rate analytics",
        "Exportable performance reports in CSV/Excel",
      ],
      icon: BarChart3,
      iconColor: "text-teal-500",
      accentBg: "bg-teal-500/10",
    },
    {
      id: "qr-links",
      title: "Dynamic WhatsApp QR Generator",
      badge: "Lead Capture",
      description: "Generate customized WhatsApp QR codes and short click-to-chat links with pre-filled messages for physical & digital marketing.",
      bullets: [
        "High-resolution downloadable QR codes for packaging & store desks",
        "Click-to-WhatsApp links for Instagram bio, Google & Meta Ads",
        "Pre-filled message templates to trigger specific bot flows",
        "Track scan counts and inbound lead sources",
      ],
      icon: QrCode,
      iconColor: "text-cyan-500",
      accentBg: "bg-cyan-500/10",
    },
    {
      id: "webhooks-api",
      title: "Developer REST API & Webhooks",
      badge: "Seamless Integrations",
      description: "Connect Broadcast Manager with Shopify, WooCommerce, custom web forms, ERP systems, and payment gateways.",
      bullets: [
        "Secure outbound webhooks with HMAC-SHA256 signatures",
        "Automate order updates, shipping notifications, and OTPs",
        "Granular REST API tokens with scope-based permissions",
        "Built-in SSRF protection & rate-limiting guards",
      ],
      icon: Code2,
      iconColor: "text-emerald-500",
      accentBg: "bg-emerald-500/10",
    },
  ];

  return (
    <section id="features" className="scroll-mt-20 py-16 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Complete Feature Ecosystem</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Everything You Need to Scale on WhatsApp
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            Built from the ground up for modern businesses. Sovereign API credentials (no embedded signup lock-in), ₹0 message markup, and full marketing &amp; sales automation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-lg hover:border-emerald-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.accentBg} ${feature.iconColor} group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  <ul className="mt-4 space-y-2 border-t border-border/50 pt-4">
                    {feature.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 font-medium">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
