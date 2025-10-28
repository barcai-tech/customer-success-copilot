"use client";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function Providers({ children }: { children: React.ReactNode }) {
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
