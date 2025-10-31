"use client";

import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Calendar,
  TicketIcon,
} from "lucide-react";
import type { Customer } from "@/src/store/copilot-store";

interface CustomerContextCardProps {
  customer: Customer | null;
  health?: number; // 0-100
  trend?: string | null; // "up", "down", "flat"
  renewalDate?: string | Date | null;
  openTickets?: number | null;
}

export function CustomerContextCard({
  customer,
  health,
  trend,
  renewalDate,
  openTickets,
}: CustomerContextCardProps) {
  if (!customer) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Select a customer to view details
        </p>
      </div>
    );
  }

  // Determine risk level based on trend
  const isAtRisk = trend === "down";
  const daysUntilRenewal = renewalDate
    ? Math.ceil(
        (new Date(renewalDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;
  const renewalUrgent = daysUntilRenewal !== null && daysUntilRenewal <= 30;

  return (
    <div
      className={`rounded-lg border transition-all ${
        isAtRisk
          ? "border-amber-200 dark:border-amber-900/30 bg-linear-to-br from-amber-50/50 to-amber-50/25 dark:from-amber-950/20 dark:to-amber-950/10"
          : "border-blue-200 dark:border-blue-900/30 bg-linear-to-br from-blue-50/50 to-blue-50/25 dark:from-blue-950/20 dark:to-blue-950/10"
      } p-4`}
    >
      {/* Header with customer name and risk indicator */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {customer.name}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Active customer
          </p>
        </div>
        {isAtRisk && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 ml-2 shrink-0">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              At Risk
            </span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Health Status */}
        {health !== undefined && (
          <div className="rounded-md bg-white/50 dark:bg-slate-700/30 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Health
              </span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {health}%
            </p>
          </div>
        )}

        {/* Open Tickets */}
        {openTickets !== undefined && openTickets !== null && (
          <div className="rounded-md bg-white/50 dark:bg-slate-700/30 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TicketIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Tickets
              </span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {openTickets}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">open</p>
          </div>
        )}

        {/* Trend */}
        {trend && (
          <div className="rounded-md bg-white/50 dark:bg-slate-700/30 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              {trend === "up" ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : trend === "down" ? (
                <TrendingDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <div className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400">
                  —
                </div>
              )}
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Trend
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-50 capitalize">
              {trend === "up"
                ? "Growing"
                : trend === "down"
                ? "Declining"
                : "Flat"}
            </p>
          </div>
        )}

        {/* Renewal Date */}
        {renewalDate && (
          <div
            className={`rounded-md p-2.5 ${
              renewalUrgent
                ? "bg-amber-100/50 dark:bg-amber-900/30"
                : "bg-white/50 dark:bg-slate-700/30"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar
                className={`h-3.5 w-3.5 ${
                  renewalUrgent
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  renewalUrgent
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Renewal
              </span>
            </div>
            {daysUntilRenewal !== null && (
              <>
                <p
                  className={`text-sm font-bold ${
                    renewalUrgent
                      ? "text-amber-900 dark:text-amber-100"
                      : "text-slate-900 dark:text-slate-50"
                  }`}
                >
                  {daysUntilRenewal} days
                </p>
                {renewalUrgent && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Due soon
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
