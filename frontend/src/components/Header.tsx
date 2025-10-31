"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Menu, TrendingUp, LogIn } from "lucide-react";
import PageContainer from "@/src/components/PageContainer";
import { NavMenu } from "@/src/components/NavMenu";
import MobileMenu from "@/src/components/MobileMenu";
import { ModeToggle } from "@/src/components/ModeToggle";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-60 backdrop-blur bg-background/75 border-b border-slate-200/60 dark:border-slate-800/60">
      <PageContainer className="h-16 flex items-center justify-between">
        {/* Mobile Menu Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMenuOpen(true)}
          className="flex items-center sm:hidden text-xl"
          aria-label="Open menu"
        >
          <Menu />
        </Button>

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg text-foreground hover:no-underline"
        >
          <TrendingUp className="h-6 w-6 text-foreground" />
          <span className="hidden sm:inline">Customer Success Copilot</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-2">
          <NavMenu />
          <div className="w-px h-6 bg-foreground/10" />
          <ModeToggle />
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-foreground/10"
                aria-label="Sign in"
              >
                <LogIn className="h-5 w-5" />
              </Button>
            </SignInButton>
          </SignedOut>
        </div>

        {/* Mobile Mode Toggle (visible on small screens) */}
        <div className="sm:hidden flex items-center gap-2">
          <ModeToggle />
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        )}
      </PageContainer>
    </header>
  );
}
