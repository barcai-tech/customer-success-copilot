import { auth } from "@clerk/nextjs/server";
import CustomersTable from "@/src/components/dashboard/CustomersTable";
import DashboardActions from "@/src/components/dashboard/DashboardActions";
import { listCustomersForUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">Please sign in to view your customers and actions.</p>
      </div>
    );
  }

  const rows = await listCustomersForUser();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <DashboardActions />
      </div>
      <CustomersTable initialRows={rows as any} />
    </div>
  );
}
