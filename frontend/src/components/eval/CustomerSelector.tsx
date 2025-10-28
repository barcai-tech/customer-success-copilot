import { Loader2 } from "lucide-react";
import type { CustomerRow } from "@/app/eval/actions";

interface CustomerSelectorProps {
  selectedUserId: string;
  customers: CustomerRow[];
  selectedCustomers: string[];
  loading: boolean;
  onCustomerToggle: (customerId: string) => void;
}

export function CustomerSelector({
  selectedUserId,
  customers,
  selectedCustomers,
  loading,
  onCustomerToggle,
}: CustomerSelectorProps) {
  if (!selectedUserId) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium">Customers</label>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground p-4 text-center">
          Loading customers...
        </div>
      ) : customers.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 text-center">
          No customers found for this user
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {customers.map((customer) => (
              <label
                key={customer.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => onCustomerToggle(customer.id)}
                  className="h-4 w-4 rounded border-input cursor-pointer accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {customer.name}
                  </div>
                  {customer.openTickets !== undefined &&
                    customer.openTickets !== null && (
                      <div className="text-xs text-muted-foreground">
                        {customer.openTickets} tickets
                      </div>
                    )}
                </div>
              </label>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Selected: {selectedCustomers.length} of {customers.length}
          </div>
        </>
      )}
    </div>
  );
}
