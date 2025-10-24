"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createCustomerAction, seedDemoCustomersAction } from "@/app/dashboard/actions";

export default function DashboardActions() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const seed = () => startTransition(async () => {
    setBusy(true); setMsg(null);
    try { await seedDemoCustomersAction(); router.refresh(); setMsg("Seed complete."); }
    catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  });

  const create = () => startTransition(async () => {
    if (!name || !externalId) return;
    setBusy(true); setMsg(null);
    try { await createCustomerAction({ name, externalId, seed: true }); setOpen(false); setName(""); setExternalId(""); router.refresh(); setMsg("Customer created."); }
    catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  });

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={seed} disabled={busy || isPending}>
        Seed Demo Customers
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Customer</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
            <DialogDescription>Provide a name and a unique external id.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cust-name">Name</Label>
              <Input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cust-id">External ID</Label>
              <Input id="cust-id" value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="acme-001" />
            </div>
            {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={create} disabled={busy || isPending || !name || !externalId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
