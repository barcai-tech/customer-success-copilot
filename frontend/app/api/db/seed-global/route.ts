import { seedGlobalCustomers } from "@/app/actions";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = await seedGlobalCustomers();
  return new Response(JSON.stringify(res), {
    headers: { "Content-Type": "application/json" },
  });
}
