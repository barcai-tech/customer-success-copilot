import type { Metadata, Viewport } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";
import Providers from "@/src/components/Providers";
import { Toaster } from "@/src/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Primary font - Inter (used for body text)
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

// Secondary fonts - Geist (used for UI elements)
// Only preload if immediately needed, otherwise load on demand
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Don't preload - load on demand
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Don't preload - load on demand
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://customer-success-copilot.barcai-tech.com"),
  title: {
    default: "Customer Success Copilot - AI-Powered CS Intelligence Platform",
    template: "%s | Customer Success Copilot",
  },
  description:
    "Agentic AI assistant for Customer Success teams. Analyze customer health, generate QBR outlines, and create renewal briefs through conversational AI. Built with production-grade security and OWASP LLM compliance.",
  keywords: [
    "customer success",
    "AI copilot",
    "customer health scoring",
    "QBR automation",
    "renewal insights",
    "CSM tools",
    "agentic AI",
    "OpenAI GPT-4o",
    "customer intelligence",
    "multi-tool orchestration",
    "serverless architecture",
    "AWS Lambda",
    "Next.js",
    "TypeScript",
  ],
  authors: [{ name: "Barcai Technology", url: "https://barcai-tech.com" }],
  creator: "Barcai Technology",
  publisher: "Barcai Technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://customer-success-copilot.barcai-tech.com",
    siteName: "Customer Success Copilot",
    title: "Customer Success Copilot - AI-Powered CS Intelligence",
    description:
      "Conversational AI that analyzes customer health, generates insights, and produces business-ready outputs for Customer Success teams.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Customer Success Copilot - AI-Powered CS Intelligence",
    description:
      "Conversational AI for Customer Success teams. Analyze health, generate QBR outlines, create renewal briefs.",
    creator: "@barcaitech",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body
        suppressHydrationWarning
        className="flex flex-col h-full w-full overflow-hidden"
      >
        <Providers>
          <Header />
          <main className="flex-1 w-full min-w-0 overflow-hidden">
            <div className="mx-auto w-full h-full max-w-[1600px] min-w-0">
              {children}
            </div>
          </main>
          <Footer />

          {/* Toast Notifications */}
          <Toaster position="top-center" />

          {/* Vercel Analytics and Speed Insights (enabled automatically in production) */}
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
