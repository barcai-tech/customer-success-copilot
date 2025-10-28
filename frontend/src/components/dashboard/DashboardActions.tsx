"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { seedDemoCustomersAction } from "@/app/dashboard/actions";

export default function DashboardActions({
  hasCustomers,
}: {
  hasCustomers: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const seed = () =>
    startTransition(async () => {
      setBusy(true);
      setMsg(null);
      try {
        await seedDemoCustomersAction();
        router.refresh();
        setMsg("Seed complete.");
      } catch (e) {
        setMsg((e as Error).message);
      } finally {
        setBusy(false);
      }
    });

  // Hide seed button if there are already customers
  if (hasCustomers) {
    return msg ? (
      <span className="text-xs text-muted-foreground">{msg}</span>
    ) : null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={seed} disabled={busy || isPending}>
        Seed Demo Customers
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
