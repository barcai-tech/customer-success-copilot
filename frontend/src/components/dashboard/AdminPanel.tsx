"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  BarChart3,
  Database,
  Shield,
} from "lucide-react";
import { seedGlobalCustomersAsAdmin } from "@/app/dashboard/actions";

interface AdminPanelProps {
  isAdmin: boolean;
}

export default function AdminPanel({ isAdmin }: AdminPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (!isAdmin) {
    return null; // Don't render anything for non-admin users
  }

  const handleSeedGlobal = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await seedGlobalCustomersAsAdmin();
      if (result.ok) {
        setMessage({
          type: "success",
          text: "Global customers seeded successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to seed global customers",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Admin Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Administration
        </h2>
        <span className="ml-auto text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
          Admin
        </span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Manage platform operations and run administrative tasks
      </p>

      {/* Quick Actions Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 dark:backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Data Management
        </h3>
        <Button
          onClick={handleSeedGlobal}
          disabled={isLoading}
          size="sm"
          className="w-full justify-start gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Seeding demo data...
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              Seed Global Demo Customers
            </>
          )}
        </Button>
        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded text-sm ${
              message.type === "success"
                ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Tools & Features Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 dark:backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Tools & Features
        </h3>
        <Link href="/eval" className="block">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Evaluation Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
