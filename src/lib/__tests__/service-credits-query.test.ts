import { describe, it, expect } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import type { SQL } from "drizzle-orm";
import {
  serviceCreditOverviewFilters,
  serviceCreditOverviewSort,
  serviceCreditTxConditions,
} from "../employees";

/* ---------------------------------------------------------------------------
 * Pure SQL-builder tests for the Service Credits overview and ledger filters.
 * No database connection — SQL is rendered with drizzle's SQLite dialect and
 * asserted textually, mirroring queries-filters.test.ts conventions.
 * ------------------------------------------------------------------------- */

const dialect = new SQLiteSyncDialect();

function render(sql: SQL): string {
  const { sql: text, params } = dialect.sqlToQuery(sql);
  return `${text} — params: ${JSON.stringify(params)}`;
}

const renderAll = (conditions: SQL[]): string => conditions.map(render).join(" | ");

describe("serviceCreditOverviewFilters", () => {
  it("returns no conditions when nothing is set", () => {
    expect(serviceCreditOverviewFilters({})).toHaveLength(0);
  });

  it("searches the expanded column set (name fields + employment fields)", () => {
    const sql = renderAll(serviceCreditOverviewFilters({ q: "reyes" }));
    for (const col of [
      "first_name",
      "middle_name",
      "last_name",
      "suffix",
      "employee_number",
      "position",
      "designation",
      "department",
      "employment_type",
      "appointment_status",
    ]) {
      expect(sql).toContain(col);
    }
    expect(sql).toContain("%reyes%");
  });

  it("accepts known employee statuses and rejects unknown ones", () => {
    const active = renderAll(serviceCreditOverviewFilters({ status: "active" }));
    expect(active).toContain("active");
    expect(
      serviceCreditOverviewFilters({ status: "DROP TABLE--archived" }),
    ).toHaveLength(0);
  });

  it("maps balance statuses onto the correlated balance aggregate", () => {
    const has = renderAll(serviceCreditOverviewFilters({ balanceStatus: "has_available" }));
    expect(has).toContain("> 0");
    const zero = renderAll(serviceCreditOverviewFilters({ balanceStatus: "zero" }));
    expect(zero).toContain("= 0");
    const neg = renderAll(serviceCreditOverviewFilters({ balanceStatus: "negative" }));
    expect(neg).toContain("< 0");
  });

  it("maps transaction-history statuses onto a correlated count", () => {
    const hasTx = renderAll(serviceCreditOverviewFilters({ txStatus: "has_transactions" }));
    expect(hasTx).toContain("> 0");
    const noTx = renderAll(
      serviceCreditOverviewFilters({ txStatus: "no_transactions" }),
    );
    expect(noTx).toContain("= 0");
  });

  it("rounds credit aggregates to 2 decimals to match computeBalance", () => {
    const sql = renderAll(
      serviceCreditOverviewFilters({ balanceStatus: "has_available" }),
    );
    expect(sql).toContain("round");
  });

  it("correlates the aggregate to the outer employees table (regression)", () => {
    // drizzle strips table qualification when a template is embedded in a
    // select field — the correlated reference must stay fully qualified or
    // SQLite resolves bare "id" to the inner table's own id column and every
    // balance silently becomes 0 (seen in live Turso verification).
    const has = renderAll(serviceCreditOverviewFilters({ balanceStatus: "has_available" }));
    expect(has).toContain("employee_id = employees.id");
    expect(has).toContain("from service_credit_transactions");
  });
});

describe("serviceCreditOverviewSort", () => {
  it("falls back to name ordering for unknown sort keys", () => {
    const sql = renderAll(serviceCreditOverviewSort("attack", "desc"));
    expect(sql).toContain("last_name");
  });

  it("keeps aggregate sorts over earned/consumed/balance expressions", () => {
    for (const key of ["earned", "consumed", "balance"]) {
      const sql = renderAll(serviceCreditOverviewSort(key, "asc"));
      expect(sql).toContain("case when");
    }
  });

  it("always appends a deterministic tiebreaker", () => {
    const sql = renderAll(serviceCreditOverviewSort("position", "desc"));
    expect(sql).toContain("last_name");
    expect(sql).toContain("first_name");
  });
});

describe("serviceCreditTxConditions", () => {
  const id = "employee-1";

  it("always scopes to the employee id", () => {
    const sql = renderAll(serviceCreditTxConditions(id, {}));
    expect(sql).toContain("employee-1");
    expect(sql).toContain("employee_id");
  });

  it("accepts known types and rejects unknown ones", () => {
    expect(renderAll(serviceCreditTxConditions(id, { type: "earned" }))).toContain("earned");
    expect(serviceCreditTxConditions(id, { type: "reverse" })).toHaveLength(1);
  });

  it("uses inclusive bounds for well-formed dates", () => {
    const sql = renderAll(
      serviceCreditTxConditions(id, { from: "2026-01-01", to: "2026-01-31" }),
    );
    expect(sql).toContain(">=");
    expect(sql).toContain("<=");
    expect(sql).toContain("2026-01-01");
    expect(sql).toContain("2026-01-31");
  });

  it("rejects malformed date inputs outright (never in the WHERE)", () => {
    for (const bad of ["', '", "2026-13-01", "01-2026-01", "2026-01-01; DROP"]) {
      expect(serviceCreditTxConditions(id, { from: bad, to: bad })).toHaveLength(1);
    }
  });
});
