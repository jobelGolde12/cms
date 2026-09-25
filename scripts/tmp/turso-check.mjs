import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env" });
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
try {
  const res = await client.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' ORDER BY name");
  console.log("objects:", res.rows.length);
  for (const r of res.rows) console.log(r.type, r.name);
} catch (e) {
  console.error("CONNECT-ERROR:", e.message);
}
