/**
 * Schema drift check: compares columns of each table in the drizzle snapshot
 * (drizzle/meta/0005_snapshot.json) against the remote Turso DB, using the
 * turso CLI (which already carries its own auth; no secrets are read from .env).
 *
 * Usage: node scripts/check-schema-drift.mjs [db-name]
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DB = process.argv[2] || "cms";
const snapshot = JSON.parse(
  readFileSync("drizzle/meta/0005_snapshot.json", "utf8"),
);

const turso = (sql) =>
  execFileSync("turso", ["db", "shell", DB, sql], { encoding: "utf8" });

/** Parse the turso CLI's padded table output: skip the header line and the
 *  dashes line, split rows on runs of whitespace, return the requested field. */
const parseField = (out, idx) =>
  out
    .split("\n")
    .filter((l) => l.trim() && !/^NAME\s/.test(l) && !/^-+$/.test(l.trim()))
    .map((l) => l.trim().split(/\s{2,}|\t/)[idx]);

const remoteTables = new Set(
  parseField(
    turso(
      "select name from sqlite_master where type='table' and name not like '%_backup_%' and name not like 'sqlite_%' and name != '__drizzle_migrations'",
    ),
    0,
  ),
);

let problems = 0;
for (const [table, def] of Object.entries(snapshot.tables)) {
  if (remoteTables.has(table)) {
    const names = parseField(turso(`pragma table_info(${table})`), 1);
    const remoteCols = new Set(names);
    for (const colName of Object.keys(def.columns)) {
      if (!remoteCols.has(colName)) {
        console.log(`MISSING COLUMN: ${table}.${colName}`);
        problems++;
      }
    }
  } else {
    console.log(`MISSING TABLE: ${table}`);
    problems++;
  }
}
console.log(problems === 0 ? "OK: no schema drift found" : `FOUND ${problems} drift issue(s)`);
