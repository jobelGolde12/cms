import { createClient } from "@libsql/client";

const c = createClient({ url: "file:./local.db" });
try {
  const t = await c.execute(
    "select name from sqlite_master where type='table' order by name",
  );
  console.log(
    "tables:",
    t.rows.map((r) => r.name).join(", ") || "(none)",
  );
} catch (e) {
  console.log("err:", e instanceof Error ? e.message : String(e));
}
