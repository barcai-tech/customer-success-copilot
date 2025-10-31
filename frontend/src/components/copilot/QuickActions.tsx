"use client";

import { useEffect, useState } from "react";
import { useCopilotStore, TASKS } from "../../store/copilot-store";
import type { TaskType } from "../../store/copilot-store";
import { CustomerContextCard } from "./CustomerContextCard";
import { EnhancedQuickActionCard } from "./EnhancedQuickActionCard";
import { getCustomerDetails } from "@/app/dashboard/actions";

interface QuickActionsProps {
  disabled?: boolean;
}

interface CustomerData {
  company?: { id: string; name: string };
  contract?: { renewalDate?: string | Date; arr?: number } | null;
  tickets?: { openTickets?: number | null; recentTickets?: unknown[] };
  usage?: {
    trend?: string | null;
    avgDailyUsers?: number;
    sparkline?: number[];
  };
}

export function QuickActions({ disabled = false }: QuickActionsProps) {
  const selectedCustomer = useCopilotStore((state) => state.selectedCustomer);
  const setInputValue = useCopilotStore((state) => state.setInputValue);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  // Fetch customer details when customer changes
  useEffect(() => {
    if (!selectedCustomer?.id) {
      return;
    }

    const fetchDetails = async () => {
      try {
        const details = await getCustomerDetails(selectedCustomer.id);
        setCustomerData(details);
      } catch (error) {
        console.error("Failed to fetch customer details:", error);
        setCustomerData(null);
      }
    };

    fetchDetails();
  }, [selectedCustomer?.id]);

  const handleQuickAction = (taskType: TaskType) => {
    const customerName = selectedCustomer?.name || "[Customer]";

    let prompt = "";
    switch (taskType) {
      case "health":
        prompt = `What's the health status of ${customerName}?`;
        break;
      case "renewal":
        prompt = `Generate a renewal brief for ${customerName}`;
        break;
      case "qbr":
        prompt = `Create a QBR outline for ${customerName}`;
        break;
      case "email":
        prompt = `Draft a check-in email for ${customerName}`;
        break;
      case "churn":
        prompt = `Analyze churn risk for ${customerName}`;
        break;
    }

    setInputValue(prompt);
  };

  return (
    <div className="space-y-4">
      {/* Customer Context Card */}
      <CustomerContextCard
        customer={selectedCustomer}
        health={undefined} // Calculate from planner results if available
        trend={customerData?.usage?.trend ?? null}
        renewalDate={customerData?.contract?.renewalDate ?? null}
        openTickets={customerData?.tickets?.openTickets ?? null}
      />

      {/* Quick Actions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Quick Actions
          </h3>
          <span className="text-xs text-muted-foreground">
            {selectedCustomer
              ? `for ${selectedCustomer.name}`
              : "Select a customer"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 w-full">
          {(Object.keys(TASKS) as TaskType[]).map((taskType) => {
            const task = TASKS[taskType];

            return (
              <EnhancedQuickActionCard
                key={taskType}
                taskType={taskType}
                label={task.label}
                description={task.description}
                onClick={() => handleQuickAction(taskType)}
                disabled={disabled}
              />
            );
          })}
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 Click any action to populate the chat input, or type your own
            question
          </p>
        </div>
      </div>
    </div>
  );
}
