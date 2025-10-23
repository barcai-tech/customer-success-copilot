import { NextRequest } from "next/server";
import { seedGlobalCustomers } from "@/app/seed-actions";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  try {
    const res = await seedGlobalCustomers();
    return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

