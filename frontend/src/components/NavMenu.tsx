"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Table } from "lucide-react";
import { cn } from "@/src/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Table,
  },
  {
    href: "/docs",
    label: "Docs",
    icon: BookOpen,
  },
];

export function NavMenu() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-md",
              isActive
                ? "text-foreground bg-accent"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
