import * as React from "react";
import { cn } from "@/src/lib/utils";

export function Badge({ color = "gray", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { color?: "green" | "yellow" | "red" | "gray" }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-500/15 text-green-500 border-green-500/30",
    yellow: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
    red: "bg-red-500/15 text-red-500 border-red-500/30",
    gray: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
        colorMap[color] || colorMap.gray,
        className
      )}
      {...props}
    />
  );
}

