"use client";

import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";
import type { Email } from "@/src/contracts/tools";
import { Button } from "@/src/components/ui/button";

interface EmailDraftCardProps {
  email: Email;
}

export function EmailDraftCard({ email }: EmailDraftCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Email Draft</h3>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopy(`${email.subject}\n\n${email.body}`, "all")}
        >
          {copiedField === "all" ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy All
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Subject
            </div>
            <button
              onClick={() => handleCopy(email.subject, "subject")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedField === "subject" ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div className="font-medium italic">{email.subject}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Body
            </div>
            <button
              onClick={() => handleCopy(email.body, "body")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedField === "body" ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed p-4 rounded-md bg-muted border">
            {email.body}
          </pre>
        </div>
      </div>
    </div>
  );
}
