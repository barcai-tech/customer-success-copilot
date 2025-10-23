import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Neon HTTP driver works well in server actions and edge runtimes
const sql = neon(mustEnv("DATABASE_URL"));

export const db = drizzle(sql, {
  logger: process.env.NODE_ENV !== "production",
});
