import { ShieldCheck, Zap, Coins, TrendingUp } from "lucide-react";

export function StatsBanner() {
  const stats = [
    {
      label: "Official Meta Uptime",
      value: "99.98%",
      description: "Direct connection with Meta Cloud API servers",
      icon: ShieldCheck,
      color: "text-emerald-500",
    },
    {
      label: "Platform Message Markup",
      value: "₹0.00",
      description: "Pay Meta direct at raw base rates. Zero hidden costs.",
      icon: Coins,
      color: "text-amber-500",
    },
    {
      label: "Broadcast Throughput",
      value: "80+ msg/s",
      description: "Ultra-fast delivery for large-scale marketing campaigns",
      icon: Zap,
      color: "text-teal-500",
    },
    {
      label: "Higher Open & Read Rates",
      value: "98%",
      description: "Outperforms traditional email and SMS by 5x",
      icon: TrendingUp,
      color: "text-emerald-500",
    },
  ];

  return (
    <section className="relative border-y border-border/60 bg-muted/30 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Trusted by fast-growing D2C Brands, E-commerce, Agencies & Service Providers Across India
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  <div className="rounded-lg bg-muted p-2 text-foreground group-hover:scale-110 transition-transform">
                    <IconComponent className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-normal">
                    {stat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
