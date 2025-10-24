"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Button } from "@/src/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import {
  deleteCustomerAction,
  updateCompanyIdentityAction,
  upsertContractAction,
  upsertTicketsAction,
  upsertUsageAction,
  getCustomerDetails,
} from "@/app/dashboard/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { Badge } from "@/src/components/ui/badge";

type Row = {
  id: string;
  name: string;
  trend?: string | null;
  openTickets?: number | null;
  renewalDate?: string | null;
};

export default function CustomersTable({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows || []);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [pendingEdit, setPendingEdit] = useState<Row | null>(null);
  // Company
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editExternalId, setEditExternalId] = useState("");
  // Contract
  const [editContractRenewal, setEditContractRenewal] = useState("");
  const [editContractArr, setEditContractArr] = useState("");
  // Tickets
  const [editTickets, setEditTickets] = useState<Array<{ id: string; severity: string }>>([]);
  // Usage
  const [editSparkline, setEditSparkline] = useState<string>("");
  const [computedTrend, setComputedTrend] = useState<string>("flat");

  useEffect(() => { setRows(initialRows || []); }, [initialRows]);

  const runPreset = (externalId: string, task: string) => {
    const url = new URL(window.location.origin);
    url.pathname = "/";
    url.searchParams.set("selectedCustomerId", externalId);
    url.searchParams.set("task", task);
    window.location.href = url.toString();
  };

  const columns: ColumnDef<Row>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "trend",
      header: "Usage Trend",
      cell: ({ getValue }) => (getValue<string | null>() ?? "-"),
    },
    {
      accessorKey: "openTickets",
      header: "Open Tickets",
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        return typeof v === "number" ? v : "-";
      },
    },
    {
      accessorKey: "renewalDate",
      header: "Renewal",
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? new Date(v).toISOString().slice(0, 10) : "-";
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="outline" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-[200px] rounded-md border bg-popover p-1 text-sm shadow-md">
                <DropdownMenu.Item
                  className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                  onSelect={async (e) => {
                    e.preventDefault();
                    const base = row.original;
                    setPendingEdit(base);
                    try {
                      const details = await getCustomerDetails(base.id);
                      setEditCompanyName(details.company?.name || base.name || "");
                      setEditExternalId(details.company?.id || base.id);
                      setEditContractRenewal(
                        details.contract?.renewalDate ? String(details.contract.renewalDate).slice(0, 10) : ""
                      );
                      setEditContractArr(
                        typeof details.contract?.arr === "number" ? String(details.contract.arr) : ""
                      );
                      setEditTickets(Array.isArray(details.tickets?.recentTickets) ? (details.tickets!.recentTickets as any) : []);
                      setEditTrend(String(details.usage?.trend || ""));
                      setEditSparkline(
                        Array.isArray(details.usage?.sparkline)
                          ? (details.usage!.sparkline as any[]).join(",")
                          : ""
                      );
                    } catch {
                      // Fallback to row-only data
                      setEditCompanyName(base.name || "");
                      setEditExternalId(base.id);
                    }
                  }}
                >
                  Edit customer
                </DropdownMenu.Item>
                <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={(e) => {
                  e.preventDefault();
                  setPendingDelete(row.original);
                }}>Delete customer</DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Label className="px-2 py-1 text-muted-foreground">Quick Actions</DropdownMenu.Label>
                <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={() => runPreset(row.original.id, "health")}>Show health</DropdownMenu.Item>
                <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={() => runPreset(row.original.id, "qbr")}>Prepare QBR</DropdownMenu.Item>
                <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer" onSelect={() => runPreset(row.original.id, "renewal")}>Prepare renewal</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      ),
    },
  ], [router]);

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  // Compute trend when sparkline changes (client-only preview)
  useEffect(() => {
    const arr = editSparkline
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (arr.length < 2) { setComputedTrend("flat"); return; }
    const n = arr.length;
    const meanX = (n - 1) / 2;
    const meanY = arr.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { const dx = i - meanX; const dy = arr[i] - meanY; num += dx * dy; den += dx * dx; }
    const slope = den === 0 ? 0 : num / den;
    const thresh = Math.max(0.1, meanY * 0.001);
    setComputedTrend(slope > thresh ? "up" : slope < -thresh ? "down" : "flat");
  }, [editSparkline]);

  function formatCurrencyInput(input: string) {
    // Show $ and comma-format while editing. Keep user's typing; parse digits to format.
    const digits = input.replace(/[^0-9]/g, "");
    if (!digits) return "";
    const num = Number(digits);
    if (!Number.isFinite(num)) return input;
    return `$${new Intl.NumberFormat("en-US").format(num)}`;
  }
  function parseCurrency(input: string) {
    const digits = input.replace(/[^0-9]/g, "");
    const num = Number(digits);
    return Number.isFinite(num) ? num : undefined;
  }

  return (
    <div className="rounded-md border bg-card p-4">
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No customers yet. Use the actions above to seed or add one.</div>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {/* Delete Confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>This will remove <span className="font-medium">{pendingDelete.name}</span> and associated summaries. This action cannot be undone.</>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = pendingDelete?.id;
                if (!id) return;
                startTransition(async () => {
                  await deleteCustomerAction(id);
                  setPendingDelete(null);
                  router.refresh();
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!pendingEdit} onOpenChange={(o) => { if (!o) setPendingEdit(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
            <DialogDescription>Update company, contract, tickets and usage details.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="company">
            <TabsList>
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="contract">Contract</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              {/* Company */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Company</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-company-name">Name</Label>
                  <Input id="edit-company-name" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-external-id">External ID</Label>
                  <Input id="edit-external-id" value={editExternalId} onChange={(e) => setEditExternalId(e.target.value)} />
                </div>
              </div>
            </div>

            </TabsContent>

            <TabsContent value="contract">
            {/* Contract */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Contract</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-contract-renewal">Renewal Date</Label>
                  <Input id="edit-contract-renewal" type="date" value={editContractRenewal} onChange={(e) => setEditContractRenewal(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-contract-arr">ARR ($)</Label>
                  <Input id="edit-contract-arr" type="text" value={formatCurrencyInput(editContractArr)} onChange={(e) => setEditContractArr(e.target.value)} placeholder="$250,000" />
                </div>
              </div>
            </div>

            </TabsContent>

            <TabsContent value="tickets">
            {/* Tickets */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Tickets</div>
              <div className="space-y-2">
                {editTickets.map((t, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end border rounded-md p-3">
                    <div className="space-y-1">
                      <Label>Ticket ID</Label>
                      <Input value={t.id} onChange={(e) => {
                        const v = e.target.value; setEditTickets((list) => list.map((x,i)=> i===idx? { ...x, id: v }: x));
                      }} />
                    </div>
                    <div className="space-y-1">
                      <Label>Severity</Label>
                      <SeveritySelect
                        value={t.severity}
                        onChange={(v) => setEditTickets((list) => list.map((x,i)=> i===idx? { ...x, severity: v }: x))}
                      />
                    </div>
                    <div>
                      <Button variant="outline" onClick={() => setEditTickets((list) => list.filter((_,i)=> i!==idx))}>Remove</Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={() => setEditTickets((list) => [...list, { id: "", severity: "" }])}>Add ticket</Button>
                <div className="text-xs text-muted-foreground">Open tickets is automatically set to the count of recent tickets.</div>
              </div>
            </div>

            </TabsContent>

            <TabsContent value="usage">
            {/* Usage */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Usage</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-spark">Sparkline (comma-separated numbers)</Label>
                  <Input id="edit-spark" value={editSparkline} onChange={(e) => setEditSparkline(e.target.value)} placeholder="77,81,85,89" />
                </div>
                <div className="space-y-1">
                  <Label>Trend (auto)</Label>
                  <Badge color={computedTrend === "up" ? "green" : computedTrend === "down" ? "red" : "yellow"} className="w-fit">{computedTrend}</Badge>
                </div>
              </div>
            </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingEdit(null)}>Cancel</Button>
            <Button onClick={() => {
              const currentId = pendingEdit?.id;
              if (!currentId) return;
              const newId = editExternalId.trim() || currentId;
              const name = editCompanyName.trim();
              const renew = editContractRenewal ? new Date(editContractRenewal).toISOString() : undefined;
              const arr = editContractArr ? Number(editContractArr) : undefined;
              const tickets = editTickets.filter(t => t.id && t.severity).map(t => ({ id: String(t.id), severity: String(t.severity) }));
              const spark = editSparkline.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n));
              startTransition(async () => {
                await updateCompanyIdentityAction({ oldExternalId: currentId, newExternalId: newId, name });
                await upsertContractAction({ externalId: newId, renewalDate: renew, arr });
                await upsertTicketsAction({ externalId: newId, tickets });
                await upsertUsageAction({ externalId: newId, sparkline: spark });
                setPendingEdit(null);
                router.refresh();
              });
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Small helper select for severity using shadcn Select
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
function SeveritySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const v = ["low","medium","high"].includes(value) ? value : "";
  return (
    <Select value={v} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select severity" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="high">High</SelectItem>
      </SelectContent>
    </Select>
  );
}
