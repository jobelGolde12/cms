import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { validateProductionEnv } from "@/lib/env-validation";

/**
 * Database client.
 *
 * - Production: Turso cloud (LIBSQL_URL=libsql://…, LIBSQL_AUTH_TOKEN=…)
 * - Development: local libSQL file (LIBSQL_URL=file:./local.db)
 *
 * The same Drizzle code path serves both — there is no mock database layer.
 */
const url = process.env.LIBSQL_URL ?? "file:./local.db";
const authToken = process.env.LIBSQL_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });

// Validate production environment variables at startup.
if (process.env.NODE_ENV !== "test") {
  try {
    validateProductionEnv();
  } catch (e) {
    // Do not expose the actual error message with variable names in production.
    console.error("[ENV] Production environment validation failed. Check server environment configuration.");
    throw e;
  }
}

export const db = drizzle(client, { schema });
export { schema };
