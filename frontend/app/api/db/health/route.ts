import { NextRequest } from "next/server";
import { db } from "@/src/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const nowRes = await db.execute(sql`select now() as now`);
    const ts = (nowRes as unknown as { rows?: Array<{ now?: string }> }).rows?.[0]?.now;

    const reg = await db.execute(
      sql`select to_regclass('public.companies') as companies, to_regclass('public.messages') as messages, to_regclass('public.__drizzle_migrations') as drizzle`
    );
    const row = (reg as unknown as { rows?: Array<Record<string, unknown>> }).rows?.[0] || {};

    const hasCompanies = Boolean(row["companies"]);
    const hasMessages = Boolean(row["messages"]);
    const hasDrizzleMigrations = Boolean(row["drizzle"]);

    return new Response(
      JSON.stringify({
        ok: true,
        driver: "neon-http",
        now: ts,
        schema: {
          companies: hasCompanies,
          messages: hasMessages,
          drizzleMigrationsTable: hasDrizzleMigrations,
        },
      }),
      { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  }
}
