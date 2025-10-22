"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // This mount check avoids hydration mismatches with next-themes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const value = theme ?? "system"; // 'light' | 'dark' | 'system'

  return (
    <label className="text-xs inline-flex items-center gap-2">
      <select
        aria-label="Select theme"
        className="text-xs border rounded px-2 py-1 bg-card"
        value={value}
        onChange={(e) => setTheme(e.target.value)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
