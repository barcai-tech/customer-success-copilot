import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  customerFormSchema,
  type CustomerFormData,
} from "@/src/lib/validation";
import type { CustomerRow, CustomerDetails } from "@/src/store/customer-store";

export function useCustomerForm(
  mode: "add" | "edit",
  customer: CustomerRow | null,
  details: CustomerDetails | null
) {
  // React Hook Form setup
  const form = useForm<CustomerFormData>({
    // @ts-expect-error - zodResolver type inference issue with default values
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      externalId: "",
      renewalDate: "",
      arr: 0,
      tickets: [],
      sparkline: "",
    },
  });

  const {
    fields: ticketFields,
    append: appendTicket,
    remove: removeTicket,
  } = useFieldArray({
    control: form.control,
    name: "tickets",
  });

  // Workaround for React Hook Form generic type inference issues with FormField
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formControl = form.control as any;

  // Watch sparkline for computed fields
  const sparklineValue = form.watch("sparkline");
  const [computedTrend, setComputedTrend] = useState<string>("flat");
  const [computedAvgDailyUsers, setComputedAvgDailyUsers] = useState<number>(0);

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (mode === "add") {
      form.reset({
        name: "",
        externalId: "",
        renewalDate: "",
        arr: 0,
        tickets: [],
        sparkline: "",
      });
    } else if (mode === "edit" && customer && details) {
      form.reset({
        name: details.company?.name || customer.name || "",
        externalId: details.company?.id || customer.id,
        renewalDate: details.contract?.renewalDate
          ? String(details.contract.renewalDate).slice(0, 10)
          : "",
        arr:
          typeof details.contract?.arr === "number"
            ? String(details.contract.arr)
            : "",
        tickets: Array.isArray(details.tickets?.recentTickets)
          ? details
              .tickets!.recentTickets.filter(
                (t: { id: string; severity: string }) =>
                  ["low", "medium", "high"].includes(t.severity)
              )
              .map((t: { id: string; severity: string }) => ({
                id: t.id,
                severity: t.severity as "low" | "medium" | "high",
              }))
          : [],
        sparkline: Array.isArray(details.usage?.sparkline)
          ? (details.usage!.sparkline as number[]).join(",")
          : "",
      });
    }
  }, [mode, customer, details, form]);

  // Compute trend and avg when sparkline changes (client-only preview)
  useEffect(() => {
    const arr = sparklineValue
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    if (arr.length === 0) {
      setComputedTrend("flat");
      setComputedAvgDailyUsers(0);
      return;
    }

    // Calculate average daily users
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    setComputedAvgDailyUsers(Math.round(avg));

    if (arr.length < 2) {
      setComputedTrend("flat");
      return;
    }

    const n = arr.length;
    const meanX = (n - 1) / 2;
    const meanY = arr.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;

    for (let i = 0; i < n; i++) {
      const dx = i - meanX;
      const dy = arr[i] - meanY;
      num += dx * dy;
      den += dx * dx;
    }

    const slope = den === 0 ? 0 : num / den;
    const thresh = Math.max(0.1, meanY * 0.001);
    setComputedTrend(slope > thresh ? "up" : slope < -thresh ? "down" : "flat");
  }, [sparklineValue]);

  return {
    form,
    formControl,
    ticketFields,
    appendTicket,
    removeTicket,
    computedTrend,
    computedAvgDailyUsers,
  };
}
