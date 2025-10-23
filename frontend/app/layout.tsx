import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";
import Providers from "@/src/components/Providers";
import { Toaster } from "@/src/components/ui/sonner";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased scroll-smooth`}
    >
      <body className="flex flex-col min-h-dvh">
        <Providers>
          <Header />
          <main className="flex-1 flex flex-col overflow-hidden mx-auto w-full max-w-[1600px]">
            {children}
          </main>
          <Footer />

          {/* Toast Notifications */}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
