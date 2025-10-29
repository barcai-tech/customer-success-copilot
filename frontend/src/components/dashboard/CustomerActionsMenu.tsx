"use client";

import { Button } from "@/src/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { getCustomerDetails } from "@/app/dashboard/actions";
import { useCustomerStore, type CustomerRow } from "@/src/store/customer-store";

interface CustomerActionsMenuProps {
  customer: CustomerRow;
}

export function CustomerActionsMenu({ customer }: CustomerActionsMenuProps) {
  const { openEditDialog, openDeleteDialog } = useCustomerStore();

  const runPreset = (externalId: string, task: string) => {
    const url = new URL(window.location.origin);
    url.pathname = "/";
    url.searchParams.set("selectedCustomerId", externalId);
    url.searchParams.set("task", task);
    window.location.href = url.toString();
  };

  const handleEdit = async (e: Event) => {
    e.preventDefault();
    try {
      const details = await getCustomerDetails(customer.id);
      openEditDialog(customer, details);
    } catch {
      // Fallback to row-only data
      openEditDialog(customer, {
        company: {
          id: customer.id,
          name: customer.name,
        },
      });
    }
  };

  const handleDelete = (e: Event) => {
    e.preventDefault();
    openDeleteDialog(customer);
  };

  return (
    <div className="text-right">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="min-w-[200px] rounded-md border bg-popover p-1 text-sm shadow-md">
            <DropdownMenu.Item
              className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              onSelect={handleEdit}
            >
              Edit customer
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              onSelect={handleDelete}
            >
              Delete customer
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Label className="px-2 py-1 text-muted-foreground">
              Quick Actions
            </DropdownMenu.Label>
            <DropdownMenu.Item
              className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              onSelect={() => runPreset(customer.id, "health")}
            >
              Health Check
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              onSelect={() => runPreset(customer.id, "renewal")}
            >
              Renewal Brief
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              onSelect={() => runPreset(customer.id, "qbr")}
            >
              QBR Prep
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              onSelect={() => runPreset(customer.id, "email")}
            >
              Follow-up Email
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              onSelect={() => runPreset(customer.id, "churn")}
            >
              Churn Review
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
