"use client";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Debug: Check Clerk configuration and suppress development warnings
  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    console.log("Clerk Publishable Key available:", !!publishableKey);
    if (!publishableKey) {
      console.error("ERROR: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set!");
    }

    if (process.env.NODE_ENV !== "development") return;

    const originalWarn = console.warn;
    const originalError = console.error;

    const filteredWarn = (...args: Parameters<typeof originalWarn>) => {
      const message = args[0]?.toString?.() ?? "";
      if (
        message.includes("development keys") ||
        message.includes("strict usage limits")
      ) {
        return;
      }
      originalWarn(...args);
    };

    const filteredError = (...args: Parameters<typeof originalError>) => {
      const message = args[0]?.toString?.() ?? "";
      if (message.includes("development keys")) {
        return;
      }
      originalError(...args);
    };

    console.warn = filteredWarn;
    console.error = filteredError;

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "hsl(217, 91%, 60%)", // Your brand blue
          colorBackground: "hsl(222, 47%, 11%)", // Dark background
          colorInputBackground: "hsl(217, 33%, 17%)", // Input background
          colorInputText: "hsl(210, 40%, 98%)", // Input text
          colorText: "hsl(210, 40%, 98%)", // General text
          colorTextSecondary: "hsl(215, 16%, 65%)", // Secondary text
          colorDanger: "hsl(0, 63%, 31%)", // Error color
          borderRadius: "0.5rem", // Match your design system
        },
      }}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="theme"
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </ClerkProvider>
  );
}
