import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";
import Providers from "@/src/components/Providers";
import { Toaster } from "@/src/components/ui/sonner";

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

export const metadata: Metadata = {
  title: "Customer Success Copilot",
  description: "AI-powered customer success intelligence platform",
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
        className="flex flex-col min-h-screen w-full"
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
        </Providers>
      </body>
    </html>
  );
}
