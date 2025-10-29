import { checkDatabaseHealth } from "@/app/actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkDatabaseHealth();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
