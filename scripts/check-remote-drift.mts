/**
 * Schema drift check: compares the Drizzle schema (`src/db/schema.ts`) with
 * the live Turso database and reports every difference.
 *
 * Why this exists: a column was added to `src/db/schema.ts` without a
 * matching migration, so production kept running on the old table shape and
 * every insert into that table failed with
 * `SQLITE_UNKNOWN: table employees has no column named assigned_section_id`.
 * This script is the guard that catches the next one.
 *
 * Remote access uses the `turso` CLI (it carries its own auth — no secret
 * values are read from .env or printed).
 *
 * Usage:
 *   npx tsx scripts/check-remote-drift.mts            # read-only report
 *   npx tsx scripts/check-remote-drift.mts cms        # explicit database
 */
import { execFileSync } from "node:child_process";
import { isTable } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import * as schema from "../src/db/schema";

const DB = process.argv[2] || "cms";

const turso = (sql: string): string =>
  execFileSync("turso", ["db", "shell", DB, sql], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });

/** Split a turso CLI result into rows of cells (the CLI pads columns). */
function rows(out: string, header: string): string[][] {
  const lines = out
    .split("\n")
    .filter((l) => l.trim() && !/^-+$/.test(l.trim()));
  const body = lines[0]?.trim().startsWith(header) ? lines.slice(1) : lines;
  return body.map((l) => l.trim().split(/\s{2,}|\t/));
}

/** Column names + primary-key columns of a remote table. */
function remoteColumns(table: string): { names: string[]; primaryKey: string[] } {
  const out = turso(`pragma table_info(${table});`);
  const cells = rows(out, "CID");
  const names = cells.map((r) => r[1]).filter(Boolean);
  const primaryKey = cells
    .filter((r) => Number(r[5]) > 0)
    .sort((a, b) => Number(a[5]) - Number(b[5]))
    .map((r) => r[1])
    .filter(Boolean);
  return { names, primaryKey };
}

/** Remote index names (SQLite auto-indexes are excluded — they have no name). */
function remoteIndexes(): Set<string> {
  const out = turso("select name from sqlite_master where type='index' and name not like 'sqlite_%';");
  return new Set(rows(out, "NAME").map((r) => r[0]).filter(Boolean));
}

/** Expected tables + columns + index names, straight from the Drizzle schema. */
function expectedTables() {
  const tables: {
    name: string;
    columns: string[];
    indexes: string[];
    primaryKey: string[];
  }[] = [];
  for (const value of Object.values(schema)) {
    if (!isTable(value)) continue;
    const config = getTableConfig(value);
    tables.push({
      name: config.name,
      columns: config.columns.map((c) => c.name),
      indexes: [
        ...config.indexes.map((i) => i.config.name),
        ...config.uniqueConstraints.map((u) => u.getName()),
      ].filter((n): n is string => Boolean(n)),
      // Composite primary keys are declared inline in CREATE TABLE, so SQLite
      // backs them with an unnamed auto-index — they are compared by column,
      // never by index name.
      primaryKey: config.primaryKeys.flatMap((p) => p.columns.map((c) => c.name)),
    });
  }
  return tables.sort((a, b) => a.name.localeCompare(b.name));
}

function main() {
  console.log(`Remote schema drift check → database "${DB}"\n`);

  const expected = expectedTables();
  const indexes = remoteIndexes();
  let problems = 0;

  for (const table of expected) {
    const { names: cols, primaryKey } = remoteColumns(table.name);
    if (cols.length === 0) {
      console.log(`MISSING TABLE: ${table.name}`);
      problems++;
      continue;
    }
    const remote = new Set(cols);
    for (const col of table.columns) {
      if (!remote.has(col)) {
        console.log(`MISSING COLUMN: ${table.name}.${col}`);
        problems++;
      }
    }
    for (const idx of table.indexes) {
      if (!indexes.has(idx)) {
        console.log(`MISSING INDEX: ${idx} (on ${table.name})`);
        problems++;
      }
    }
    if (table.primaryKey.length > 0) {
      const same = table.primaryKey.length === primaryKey.length &&
        table.primaryKey.every((c) => primaryKey.includes(c));
      if (!same) {
        console.log(
          `PRIMARY KEY MISMATCH: ${table.name} — expected (${table.primaryKey.join(", ")}), found (${primaryKey.join(", ") || "none"})`,
        );
        problems++;
      }
    }
  }

  console.log(
    problems === 0
      ? "\nOK: no schema drift found — remote matches src/db/schema.ts"
      : `\nFOUND ${problems} drift issue(s)`,
  );
  process.exit(problems === 0 ? 0 : 1);
}

main();
