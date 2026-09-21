import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

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

export const db = drizzle(client, { schema });
export { schema };
