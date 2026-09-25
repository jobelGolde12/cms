import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Canonical Turso variables, with LIBSQL_* kept as a legacy fallback.
const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "file:./local.db";
const authToken =
  process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || undefined;

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
    authToken,
  },
});
