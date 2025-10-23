import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// Prefer frontend/.env.local (Next.js convention), fall back to .env
loadEnv({ path: ".env.local" });
if (!process.env.DATABASE_URL) {
  loadEnv();
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
