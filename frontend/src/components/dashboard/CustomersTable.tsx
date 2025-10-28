"use client";

import { useEffect, useMemo } from "react";
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
  useReactTable,
} from "@tanstack/react-table";
import { useCustomerStore, type CustomerRow } from "@/src/store/customer-store";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CustomerActionsMenu } from "./CustomerActionsMenu";

export default function CustomersTable({
  initialRows,
}: {
  initialRows: CustomerRow[];
}) {
  const { rows, setRows, openAddDialog } = useCustomerStore();

  useEffect(() => {
    setRows(initialRows || []);
  }, [initialRows, setRows]);

  const columns: ColumnDef<CustomerRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Customer",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "trend",
        header: "Usage Trend",
        cell: ({ getValue }) => getValue<string | null>() ?? "-",
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
        cell: ({ row }) => <CustomerActionsMenu customer={row.original} />,
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
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

      {/* Modals */}
      <DeleteCustomerDialog />
      <CustomerFormDialog />
    </div>
  );
}
