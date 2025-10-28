"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  createCustomerAction,
  updateCompanyIdentityAction,
  upsertContractAction,
  upsertTicketsAction,
  upsertUsageAction,
} from "@/app/dashboard/actions";
import { customerFormSchemaTransformed } from "@/src/lib/validation";
import { useCustomerStore } from "@/src/store/customer-store";
import { useCustomerForm } from "@/src/hooks/useCustomerForm";

export function CustomerFormDialog() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { modals, closeFormDialog } = useCustomerStore();
  const { isOpen, mode, customer, details } = modals.formDialog;

  const {
    form,
    formControl,
    ticketFields,
    appendTicket,
    removeTicket,
    computedTrend,
    computedAvgDailyUsers,
  } = useCustomerForm(mode, customer, details);

  const isAddingNew = mode === "add";

  const handleSubmit = form.handleSubmit(async (values) => {
    // Validate using the transformed schema
    const validatedData = customerFormSchemaTransformed.safeParse(values);

    if (!validatedData.success) {
      // Let form errors show in the UI
      return;
    }

    const { name, externalId, renewalDate, arr, tickets, sparkline } =
      validatedData.data;

    startTransition(async () => {
      if (isAddingNew) {
        // Create new customer - insert company record first
        await createCustomerAction({
          name,
          externalId,
          seed: false, // Don't seed demo data
        });
      } else {
        // Update existing customer
        const currentId = customer?.id;
        if (!currentId) return;
        await updateCompanyIdentityAction({
          oldExternalId: currentId,
          newExternalId: externalId,
          name,
        });
      }

      // Upsert contract, tickets, and usage for both create and update
      await upsertContractAction({
        externalId,
        renewalDate,
        arr,
      });
      await upsertTicketsAction({ externalId, tickets });
      if (sparkline.length > 0) {
        await upsertUsageAction({
          externalId,
          sparkline,
        });
      }

      closeFormDialog();
      router.refresh();
    });
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) closeFormDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isAddingNew ? "Add New Customer" : "Edit Customer"}
          </DialogTitle>
          <DialogDescription>
            {isAddingNew
              ? "Enter customer information. Company name and renewal date are required."
              : "Update company, contract, tickets and usage details."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6 px-6">
            {/* Company Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={formControl}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">
                        Company Name{" "}
                        {isAddingNew && <span className="text-red-500">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Acme Corp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formControl}
                  name="externalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">
                        External ID{" "}
                        {isAddingNew && (
                          <span className="text-muted-foreground/60">
                            (optional)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={
                            isAddingNew
                              ? "Auto-generated from company name"
                              : "acme-001"
                          }
                        />
                      </FormControl>
                      {isAddingNew && !field.value && form.watch("name") && (
                        <p className="text-xs text-muted-foreground">
                          Will be:{" "}
                          <span className="font-mono">
                            {generateExternalId(form.watch("name"))}
                          </span>
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Contract Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Contract Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={formControl}
                  name="renewalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">
                        Renewal Date{" "}
                        {isAddingNew && <span className="text-red-500">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formControl}
                  name="arr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">
                        Annual Recurring Revenue{" "}
                        {isAddingNew && (
                          <span className="text-muted-foreground/60">
                            (optional, defaults to $0)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          value={formatCurrencyInput(String(field.value))}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="$250,000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Tickets Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Recent Tickets{" "}
                  {isAddingNew && (
                    <span className="text-muted-foreground/60 font-normal">
                      (optional)
                    </span>
                  )}
                </h3>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                  {ticketFields.length} open{" "}
                  {ticketFields.length === 1 ? "ticket" : "tickets"}
                </span>
              </div>
              <div className="space-y-2">
                {ticketFields.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                    No tickets yet. Click &ldquo;Add Ticket&rdquo; to create
                    one.
                  </div>
                ) : (
                  ticketFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-3 items-end p-3 border rounded-md bg-muted/50"
                    >
                      <FormField
                        control={formControl}
                        name={`tickets.${index}.id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">
                              Ticket ID
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="TICKET-001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={formControl}
                        name={`tickets.${index}.severity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-muted-foreground">
                              Severity
                            </FormLabel>
                            <FormControl>
                              <SeveritySelect
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="default"
                          type="button"
                          onClick={() => removeTicket(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => appendTicket({ id: "", severity: "low" })}
                className="w-full"
              >
                + Add Ticket
              </Button>
            </div>

            <Separator />

            {/* Usage Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Usage Metrics{" "}
                {isAddingNew && (
                  <span className="text-muted-foreground/60 font-normal">
                    (optional)
                  </span>
                )}
              </h3>
              <div className="space-y-4">
                <FormField
                  control={formControl}
                  name="sparkline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">
                        Sparkline Data
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="77,81,85,89" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Enter comma-separated numbers to track usage over time
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/50 rounded-md border">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Average Daily Users
                    </Label>
                    <div className="text-2xl font-semibold text-foreground">
                      {computedAvgDailyUsers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto-calculated from sparkline
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Trend
                    </Label>
                    <div className="flex items-center gap-2">
                      <Badge
                        color={
                          computedTrend === "up"
                            ? "green"
                            : computedTrend === "down"
                            ? "red"
                            : "gray"
                        }
                        className="text-sm"
                      >
                        {computedTrend === "up"
                          ? "↑ Trending Up"
                          : computedTrend === "down"
                          ? "↓ Trending Down"
                          : "→ Stable"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Based on linear regression
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeFormDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : isAddingNew
                  ? "Create Customer"
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function formatCurrencyInput(input: string) {
  const digits = input.replace(/[^0-9]/g, "");
  if (!digits) return "";
  const num = Number(digits);
  if (!Number.isFinite(num)) return input;
  return `$${new Intl.NumberFormat("en-US").format(num)}`;
}

function generateExternalId(companyName: string): string {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

// Severity select component
function SeveritySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const v = ["low", "medium", "high"].includes(value) ? value : "";
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
