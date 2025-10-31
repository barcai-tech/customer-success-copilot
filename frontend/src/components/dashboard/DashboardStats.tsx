"use client";

import { useMemo } from "react";
import { TrendingUp, AlertCircle, Calendar, Users } from "lucide-react";
import type { CustomerRow } from "@/src/store/customer-store";

interface DashboardStatsProps {
  customers: CustomerRow[];
}

export function DashboardStats({ customers }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    
    const healthyCount = customers.filter(c => c.trend === "up").length;
    const atRiskCount = customers.filter(c => c.trend === "down").length;
    
    const upcomingRenewals = customers.filter(c => {
      if (!c.renewalDate) return false;
      const daysUntilRenewal = Math.ceil(
        (new Date(c.renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilRenewal >= 0 && daysUntilRenewal <= 30;
    }).length;

    return {
      totalCustomers,
      healthyCount,
      healthyPercent: totalCustomers > 0 ? Math.round((healthyCount / totalCustomers) * 100) : 0,
      atRiskCount,
      upcomingRenewals,
    };
  }, [customers]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Customers */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-900/30 bg-linear-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/40 dark:to-blue-950/20 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Customers</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{stats.totalCustomers}</p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
        </div>
      </div>

      {/* Healthy Accounts */}
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/30 bg-linear-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-950/40 dark:to-emerald-950/20 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Healthy Accounts</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{stats.healthyCount}</p>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{stats.healthyPercent}%</p>
            </div>
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          </div>
        </div>
      </div>

      {/* At Risk */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-900/30 bg-linear-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/40 dark:to-amber-950/20 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">At Risk</p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">{stats.atRiskCount}</p>
          </div>
          <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
          </div>
        </div>
      </div>

      {/* Upcoming Renewals */}
      <div className="rounded-lg border border-purple-200 dark:border-purple-900/30 bg-linear-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/40 dark:to-purple-950/20 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Next 30 Days</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">{stats.upcomingRenewals}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">renewals</p>
          </div>
          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
