import { defineConfig } from "drizzle-kit";

// drizzle-kit `generate` only needs the schema; `migrate` / `studio` need a URL.
// We keep this config tolerant so generate works before .env.local is set.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
