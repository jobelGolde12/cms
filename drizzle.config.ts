import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.LIBSQL_URL ?? "file:./local.db",
    authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
  },
});
