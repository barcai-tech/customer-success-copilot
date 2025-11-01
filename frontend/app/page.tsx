import { LandingHero } from "@/src/components/landing/LandingHero";
import { Features } from "@/src/components/landing/Features";
import { CaseStudy } from "@/src/components/landing/CaseStudy";
import { TechStack } from "@/src/components/landing/TechStack";
import { CallToAction } from "@/src/components/landing/CallToAction";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Success Copilot - AI-Powered CS Intelligence Platform",
  description:
    "Agentic AI assistant for Customer Success teams. Analyze customer health, generate QBR outlines, and create renewal briefs through conversational AI. Built with production-grade security and OWASP LLM compliance.",
  keywords: [
    "customer success",
    "AI copilot",
    "customer health",
    "QBR automation",
    "renewal insights",
    "CSM tools",
    "agentic AI",
    "OpenAI GPT-4.1",
    "customer intelligence",
  ],
  openGraph: {
    title: "Customer Success Copilot - AI-Powered CS Intelligence",
    description:
      "Conversational AI that analyzes customer health, generates insights, and produces business-ready outputs for Customer Success teams.",
    type: "website",
    url: "https://customer-success-copilot.barcai-tech.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Customer Success Copilot - AI-Powered CS Intelligence",
    description:
      "Conversational AI for Customer Success teams. Analyze health, generate QBR outlines, create renewal briefs.",
  },
};

export default function Home() {
  return (
    <div className="w-full h-full overflow-y-auto">
      <LandingHero />
      <Features />
      <CaseStudy />
      <TechStack />
      <CallToAction />
    </div>
  );
}
