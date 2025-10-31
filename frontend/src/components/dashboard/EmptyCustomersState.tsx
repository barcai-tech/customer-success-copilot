"use client";

import { Button } from "@/src/components/ui/button";
import { Sparkles, Plus } from "lucide-react";

interface EmptyCustomersStateProps {
  onSeedDemo: () => void;
  onAddCustomer: () => void;
  isLoadingDemo?: boolean;
}

export function EmptyCustomersState({
  onSeedDemo,
  onAddCustomer,
  isLoadingDemo = false,
}: EmptyCustomersStateProps) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50/50 to-slate-50/50 dark:from-blue-950/20 dark:to-slate-900/20 p-12">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        {/* Icon */}
        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No Customers Yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
            Get started by adding your first customer or seeding demo data to
            explore the dashboard features.
          </p>
        </div>

        {/* Quick Start Metrics Preview */}
        <div className="grid grid-cols-3 gap-3 py-4 px-4 bg-white/50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
          <div className="text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              0
            </p>
          </div>
          <div className="text-center border-l border-r border-slate-200 dark:border-slate-700/50">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Healthy
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              —
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              At Risk
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              —
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            onClick={onSeedDemo}
            disabled={isLoadingDemo}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
          >
            {isLoadingDemo ? (
              <>
                <span className="inline-block animate-spin mr-2">⚡</span>
                Seeding...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Seed Demo Data
              </>
            )}
          </Button>
          <Button
            onClick={onAddCustomer}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Demo data includes sample companies with usage trends, open tickets,
          and renewal dates to explore all dashboard features.
        </p>
      </div>
    </div>
  );
}
