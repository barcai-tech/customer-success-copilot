import { auth, currentUser } from "@clerk/nextjs/server";
import CustomersTable from "@/src/components/dashboard/CustomersTable";
import DashboardActions from "@/src/components/dashboard/DashboardActions";
import AdminPanel from "@/src/components/dashboard/AdminPanel";
import { listCustomersForUser } from "./actions";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="p-8 space-y-6 h-full flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
          Dashboard
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Please sign in to view your customers and insights.
        </p>
      </div>
    );
  }

  const user = await currentUser();
  const isAdmin = user?.privateMetadata?.role === "admin";

  const rows = await listCustomersForUser();
  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto bg-white dark:bg-linear-to-br dark:from-slate-950 dark:to-slate-900">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage your customers and operations
          </p>
        </div>
        <DashboardActions hasCustomers={rows.length > 0} />
      </div>

      {/* Customers Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Customers
          </h2>
          <span className="ml-auto text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
            {rows.length} total
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg p-0 overflow-hidden shadow-sm dark:shadow-none">
          <CustomersTable initialRows={rows} />
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin && <AdminPanel isAdmin={isAdmin} />}
    </div>
  );
}
