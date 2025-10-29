"use client";

import { Building2, Check } from "lucide-react";
import { useEffect } from "react";
import { useCopilotStore } from "@/src/store/copilot-store";
import type { Customer } from "@/src/store/copilot-store";
import { cn } from "@/src/lib/utils";

type ViewerCustomer = {
  id: string;
  name: string;
  logo?: string | null;
};

function isViewerCustomer(value: unknown): value is ViewerCustomer {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { name?: unknown }).name === "string"
  );
}

export function CustomerSelector() {
  const { selectedCustomer, setCustomer, status, customers, setCustomers } =
    useCopilotStore();
  const isDisabled = status === "running";

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const { listCompaniesForViewer } = await import("@/app/actions");
        const list = await listCompaniesForViewer();
        if (!ignore && Array.isArray(list)) {
          const normalized: Customer[] = list
            .filter(isViewerCustomer)
            .map((entry) => ({
              id: entry.id,
              name: entry.name,
              logo: entry.logo === null ? undefined : entry.logo,
            }));
          setCustomers(normalized);
        }
      } catch {}
    };
    load();
    return () => {
      ignore = true;
    };
  }, [setCustomers]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Select Customer</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {customers.map((customer) => {
          const isSelected = selectedCustomer?.id === customer.id;

          return (
            <button
              key={customer.id}
              onClick={() => setCustomer(customer)}
              disabled={isDisabled}
              className={cn(
                "relative px-4 py-3 rounded-lg border-2 text-left transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{customer.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {customer.id}
                  </div>
                </div>

                {isSelected && (
                  <div className="shrink-0">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedCustomer && (
        <div className="text-sm text-muted-foreground">
          Selected:{" "}
          <span className="font-medium text-foreground">
            {selectedCustomer.name}
          </span>
        </div>
      )}
    </div>
  );
}
