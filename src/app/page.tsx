import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProductPreview } from "@/components/landing/product-preview";
import { StatsBanner } from "@/components/landing/stats-banner";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { FlowShowcase } from "@/components/landing/flow-showcase";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { SavingsCalculator } from "@/components/landing/savings-calculator";
import { MetaRatesTable } from "@/components/landing/meta-rates-table";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import { FloatingWhatsApp } from "@/components/landing/floating-whatsapp";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Broadcast Manager | Official WhatsApp Cloud API & Marketing Platform for India",
  description: "Direct Meta WhatsApp Cloud API connectivity with ₹0 message markup. High-volume broadcast campaigns, drag-and-drop flow builder, 24/7 AI agent with custom knowledge base, GST invoice generator, and shared team inbox. Flat ₹3,000/month.",
  keywords: [
    "Broadcast Manager",
    "WhatsApp Cloud API",
    "WhatsApp Marketing India",
    "Official Meta WhatsApp API",
    "WhatsApp Broadcast Manager",
    "WhatsApp Chatbot Builder",
    "WhatsApp AI Agent",
    "WhatsApp GST Invoice",
    "Zero Markup WhatsApp API",
  ],
  openGraph: {
    title: "Broadcast Manager | Official WhatsApp Cloud API & Marketing Platform for India",
    description: "Scale your business with Official WhatsApp Cloud API. ₹0 platform markup, high-volume broadcasts, visual flows, RAG AI agents, GST invoices, and shared multi-agent inbox. Flat ₹3,000/month.",
    type: "website",
  },
};

export default async function LandingPage() {
  let isAuthenticated = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    isAuthenticated = false;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/20 selection:text-emerald-700">
      <Navbar isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <Hero />
        <ProductPreview />
        <StatsBanner />
        <FeaturesGrid />
        <FlowShowcase />
        <ComparisonSection />
        <SavingsCalculator />
        <MetaRatesTable />
        <HowItWorks />
        <PricingSection />
        <FaqSection />
        <CtaBanner />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
