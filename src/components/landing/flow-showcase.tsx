import { 
  Bot, 
  GitBranch, 
  CheckCircle2, 
  Database,
  Cpu
} from "lucide-react";

export function FlowShowcase() {
  return (
    <section id="flows-ai" className="scroll-mt-20 py-16 sm:py-24 bg-muted/20 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Cpu className="h-3.5 w-3.5" />
            <span>Next-Gen Conversational Automation</span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            No-Code Flow Builder Meets 24/7 AI Intelligence
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            Combine deterministic rule-based button flows with advanced AI reasoning. Automate 80% of routine inquiries and effortlessly hand off hot leads to human agents.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: Visual Flow Builder */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                  <GitBranch className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                  Visual Canvas
                </span>
              </div>

              <h3 className="mt-5 text-xl font-bold text-foreground">
                Drag-and-Drop WhatsApp Flow Engine
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Build high-converting guided conversational funnels with native WhatsApp buttons, interactive list menus, and condition filters.
              </p>

              {/* Flow preview mockup */}
              <div className="mt-6 space-y-3 rounded-xl border border-border/80 bg-background p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20 text-teal-600 text-[10px]">1</span>
                  <span>Trigger: Inbound Keyword (&quot;OFFER&quot; / &quot;DISCOUNT&quot;)</span>
                </div>
                <div className="ml-2.5 border-l-2 border-dashed border-border pl-4 space-y-2 py-1">
                  <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">
                    <span className="font-semibold text-teal-600">Action:</span> Send Interactive Quick Reply
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="bg-background border border-border px-2 py-0.5 rounded text-[11px]">🛒 20% Off Coupon</span>
                      <span className="bg-background border border-border px-2 py-0.5 rounded text-[11px]">📦 Track Order</span>
                      <span className="bg-background border border-border px-2 py-0.5 rounded text-[11px]">👤 Talk to Rep</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">
                    <span className="font-semibold text-teal-600">Branching Logic:</span> If &quot;Talk to Rep&quot; is tapped ➔ Tag contact as <code className="text-emerald-600 font-bold">hot_lead</code> &amp; notify sales channel.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Supports up to 10-item List Menus &amp; Quick Reply Buttons</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>
          </div>

          {/* Card 2: AI Agent with RAG */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Bot className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                  RAG Intelligence
                </span>
              </div>

              <h3 className="mt-5 text-xl font-bold text-foreground">
                Autonomous AI Agent Grounded in Your Data
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Connect your product sheets, FAQs, return policies, and pricing charts. The AI answers customer questions in real-time with verified facts.
              </p>

              {/* RAG Knowledge Mockup */}
              <div className="mt-6 space-y-3 rounded-xl border border-border/80 bg-background p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-500" />
                    <span>Connected Business Knowledge Sources</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Live Synced</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <span className="truncate text-foreground font-medium">📄 Product_Catalog_2026.pdf</span>
                    <span className="text-[11px] text-muted-foreground">24 Chunks Indexed</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <span className="truncate text-foreground font-medium">📄 Shipping_&amp;_Refund_Policy.docx</span>
                    <span className="text-[11px] text-muted-foreground">12 Chunks Indexed</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <span className="truncate text-foreground font-medium">🌐 https://yourstore.com/faq</span>
                    <span className="text-[11px] text-muted-foreground">Auto-Refreshed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Automatic sentiment-triggered Human Agent Escalation</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
