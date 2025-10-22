"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Home, BookOpen } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/docs",
    label: "Docs",
    icon: BookOpen,
  },
];

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background bg-opacity-50 text-foreground z-10 flex flex-col h-screen">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="self-end text-3xl"
          aria-label="Close menu"
        >
          <X />
        </Button>

        <div className="text-xl font-bold">Customer Success Copilot</div>

        {/* 
          This placeholder <div> ensures the title remains centered 
          between the close button and an empty space on mobile screens.
        */}
        <div className="sm:hidden"></div>
      </div>

      <nav className="flex flex-col gap-6 text-xl px-4 py-8">
        <ul>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");

            return (
              <li key={item.href} className="mb-4">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 hover:text-primary",
                    isActive && "text-primary font-semibold"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
