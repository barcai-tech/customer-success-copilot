"use client";

import { useState, useCallback } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import { Button } from "../ui/button";
import { useEffect } from "react";
import { useCopilotStore } from "../../store/copilot-store";

interface CustomerComboboxProps {
  onSelect?: (customerId: string) => void;
  disabled?: boolean;
}

export function CustomerCombobox({
  onSelect,
  disabled = false,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedCustomer = useCopilotStore((state) => state.selectedCustomer);
  const setCustomer = useCopilotStore((state) => state.setCustomer);
  const customers = useCopilotStore((s) => s.customers);
  const setCustomers = useCopilotStore((s) => s.setCustomers);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch("/api/companies/list", { cache: "no-store" });
        const json = await res.json();
        if (!ignore && json?.ok && Array.isArray(json.customers)) setCustomers(json.customers);
      } catch {}
    };
    load();
    return () => {
      ignore = true;
    };
  }, [setCustomers]);

  const handleSelect = useCallback(
    (customerId: string) => {
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        setCustomer(customer);
        onSelect?.(customerId);
      }
      setOpen(false);
    },
    [customers, setCustomer, onSelect]
  );

  const handleClear = useCallback(() => {
    setCustomer(null);
    setSearch("");
  }, [setCustomer]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full justify-between"
      >
        {selectedCustomer ? (
          <span className="flex items-center gap-2">
            {selectedCustomer.logo && (
              <span className="text-lg">{selectedCustomer.logo}</span>
            )}
            {selectedCustomer.name}
          </span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-2">
            <Search className="h-4 w-4" />
            Select customer...
          </span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-md">
          <Command className="rounded-md">
            <CommandInput
              placeholder="Search customers..."
              value={search}
              onValueChange={setSearch}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>No customer found.</CommandEmpty>
              <CommandGroup>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelect(customer.id)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {customer.logo && (
                        <span className="text-lg">{customer.logo}</span>
                      )}
                      {customer.name}
                    </span>
                    {selectedCustomer?.id === customer.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      {/* Clear button when a customer is selected */}
      {selectedCustomer && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <span className="sr-only">Clear selection</span>×
        </button>
      )}

      {/* Click outside to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
