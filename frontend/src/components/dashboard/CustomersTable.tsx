"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Button } from "@/src/components/ui/button";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useCustomerStore, type CustomerRow } from "@/src/store/customer-store";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CustomerActionsMenu } from "./CustomerActionsMenu";
import { ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/src/components/ui/select";

const TREND_RANK: Record<string, number> = { down: 0, flat: 1, up: 2 };

export default function CustomersTable({
  initialRows,
}: {
  initialRows: CustomerRow[];
}) {
  const { rows, setRows, openAddDialog } = useCustomerStore();

  useEffect(() => {
    setRows(initialRows || []);
  }, [initialRows, setRows]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Clamp page index if data size changes
  useEffect(() => {
    const total = rows.length;
    const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
    if (pageIndex > maxPage) setPageIndex(0);
  }, [rows, pageSize, pageIndex]);

  const columns: ColumnDef<CustomerRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            type="button"
            onClick={column.getToggleSortingHandler()}
            className="inline-flex items-center gap-1 hover:underline"
          >
            Customer
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "trend",
        header: ({ column }) => (
          <button
            type="button"
            onClick={column.getToggleSortingHandler()}
            className="inline-flex items-center gap-1 hover:underline"
          >
            Usage Trend
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </button>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          const a = (rowA.getValue(columnId) as string | null) || "";
          const b = (rowB.getValue(columnId) as string | null) || "";
          const ra = TREND_RANK[a] ?? -1;
          const rb = TREND_RANK[b] ?? -1;
          return ra === rb ? 0 : ra < rb ? -1 : 1;
        },
        cell: ({ getValue }) => getValue<string | null>() ?? "-",
      },
      {
        accessorKey: "openTickets",
        header: ({ column }) => (
          <button
            type="button"
            onClick={column.getToggleSortingHandler()}
            className="inline-flex items-center gap-1 hover:underline"
          >
            Open Tickets
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </button>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          return typeof v === "number" ? v : "-";
        },
      },
      {
        accessorKey: "renewalDate",
        header: ({ column }) => (
          <button
            type="button"
            onClick={column.getToggleSortingHandler()}
            className="inline-flex items-center gap-1 hover:underline"
          >
            Renewal
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </button>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          const va = rowA.getValue(columnId) as string | Date | null;
          const vb = rowB.getValue(columnId) as string | Date | null;
          const ta = va ? new Date(va).getTime() : -Infinity;
          const tb = vb ? new Date(vb).getTime() : -Infinity;
          if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
          if (Number.isNaN(ta)) return -1;
          if (Number.isNaN(tb)) return 1;
          return ta === tb ? 0 : ta < tb ? -1 : 1;
        },
        cell: ({ getValue }) => {
          const v = getValue<Date | string | null>();
          if (!v) return "-";
          const d = v instanceof Date ? v : new Date(v);
          return Number.isNaN(d.getTime()) ? "-" : d.toISOString().slice(0, 10);
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <CustomerActionsMenu customer={row.original} />,
        enableSorting: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting: true,
  });

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Customers</h2>
        <Button onClick={openAddDialog}>+ Add Customer</Button>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No customers yet. Use the actions above to seed or add one.
        </div>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {rows.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {(() => {
              const total = table.getSortedRowModel().rows.length;
              const start = total === 0 ? 0 : pageIndex * pageSize + 1;
              const end = Math.min(total, (pageIndex + 1) * pageSize);
              return `Showing ${start}-${end} of ${total}`;
            })()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <DeleteCustomerDialog />
      <CustomerFormDialog />
    </div>
  );
}
