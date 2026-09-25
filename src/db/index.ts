import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Database client — server-only.
 *
 * Canonical Turso configuration (never expose to the browser, never prefix
 * with NEXT_PUBLIC_):
 *   TURSO_DATABASE_URL  libsql://... (remote) or file:./local.db (local dev)
 *   TURSO_AUTH_TOKEN    required for remote libsql:// URLs
 *
 * Legacy LIBSQL_URL / LIBSQL_AUTH_TOKEN variables are still honored so
 * existing local setups keep working; TURSO_* takes precedence.
 */

function resolveConnection(): { url: string; authToken?: string } {
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "file:./local.db";
  const authToken =
    process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || undefined;
  return { url, authToken };
}

const globalForDb = globalThis as unknown as { __cmsClient?: Client };

function getClient(): Client {
  if (globalForDb.__cmsClient) return globalForDb.__cmsClient;
  const { url, authToken } = resolveConnection();
  const client = createClient({ url, authToken });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__cmsClient = client;
  }
  return client;
}

export const db = drizzle(getClient(), { schema });
export { schema };
