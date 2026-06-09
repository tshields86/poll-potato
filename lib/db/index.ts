import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.example).",
  );
}

const sql = neon(databaseUrl);

export const db = drizzle({ client: sql, schema, casing: "snake_case" });
export { schema };
export * from "./schema";
