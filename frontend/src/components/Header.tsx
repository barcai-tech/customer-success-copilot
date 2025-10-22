"use client";
import Link from "next/link";
import ThemeSelect from "@/src/components/ThemeSelect";

export default function Header() {
  return (
    <header className="w-full border-b bg-card/80 supports-[backdrop-filter]:backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-primary">Customer Success</span> Copilot
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/docs" className="hover:underline">Docs</Link>
          <ThemeSelect />
        </nav>
      </div>
    </header>
  );
}
