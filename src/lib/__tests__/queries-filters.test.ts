import { describe, it, expect } from "vitest";
import type { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import type { SessionUser } from "../auth";
import { childFilters, type ChildQuery } from "../queries";
import { REVIEW_DECISION_TO_RECORD_STATUS } from "../workflow";

/* ---------------------------------------------------------------------------
 * childFilters — pure SQL builder tests (no database connection).
 * Verifies the security-critical properties of the registry query: scope is
 * always applied, duplicates excluded, every UI filter maps to a real
 * condition. SQL is rendered with drizzle's QueryBuilder.
 * ------------------------------------------------------------------------- */

const lguUser: SessionUser = {
  id: "user-1",
  email: "lgu@example.gov",
  firstName: "Lena",
  lastName: "Guard",
  roleId: "role-lgu",
  role: "lgu",
  barangayId: null,
};

const brgyUser: SessionUser = {
  id: "user-2",
  email: "brgy@example.gov",
  firstName: "Ben",
  lastName: "Barangay",
  roleId: "role-barangay",
  role: "barangay",
  barangayId: "brgy-1",
};

const dialect = new SQLiteSyncDialect();

/** Render a WHERE clause to a single string (SQL text + bound params). */
function renderSql(where: SQL | undefined): string {
  if (!where) return "";
  const { sql: text, params } = dialect.sqlToQuery(where);
  return `${text} — params: ${JSON.stringify(params)}`;
}

const build = (user: SessionUser, q: ChildQuery) => renderSql(childFilters(user, q));

describe("childFilters (registry query builder)", () => {
  it("always excludes marked_duplicate records, even with no other filters", () => {
    const sql = build(lguUser, {});
    expect(sql).toContain("marked_duplicate");
  });

  it("applies barangay scope for barangay users (own barangay or own records)", () => {
    const sql = build(brgyUser, {});
    expect(sql).toContain("brgy-1");
    expect(sql).toContain("user-2");
  });

  it("adds no scope restriction for LGU users (municipal-wide)", () => {
    const sql = build(lguUser, {});
    expect(sql).not.toContain("user-1");
    expect(sql).not.toContain("brgy");
  });

  it("searches first name, last name, and child code", () => {
    const sql = build(lguUser, { q: "cruz" });
    expect(sql).toContain("%cruz%");
    expect(sql).toContain("first_name");
    expect(sql).toContain("last_name");
    expect(sql).toContain("child_code");
  });

  it("maps barangay/status/sex filters to their columns", () => {
    const sql = build(lguUser, {
      barangay: "brgy-9",
      status: "verified",
      sex: "female",
    });
    expect(sql).toContain("brgy-9");
    expect(sql).toContain("verified");
    expect(sql).toContain("female");
  });

  it("maps education/school filters to EXISTS subqueries", () => {
    const sql = build(lguUser, { education: "enrolled", school: "school-3" });
    expect(sql).toContain("exists");
    expect(sql).toContain("enrolled");
    expect(sql).toContain("school-3");
    expect(sql).toContain("child_education");
  });

  it("age bounds translate into birth-date ranges", () => {
    const year = new Date().getFullYear();
    const sql = build(lguUser, { ageMin: 5, ageMax: 11 });
    expect(sql).toContain(`${year - 5}-12-31`);
    expect(sql).toContain(`${year - 11}-01-01`);
  });

  it("active=all means no lifecycle filter", () => {
    const sql = build(lguUser, { active: "all" });
    expect(sql).not.toContain("'archived'");
    expect(sql).not.toContain("'inactive'");
    expect(sql).not.toContain("'active'");
  });

  it("active filter targets the status column", () => {
    const sql = build(lguUser, { active: "archived" });
    expect(sql).toContain("archived");
    expect(sql).toContain("status");
  });

  it("combines search + filters into a single AND clause", () => {
    const sql = build(brgyUser, {
      q: "ana",
      status: "pending_validation",
      sex: "male",
    });
    expect(sql).toContain("%ana%");
    expect(sql).toContain("pending_validation");
    expect(sql).toContain("male");
    expect(sql).toContain("brgy-1");
  });
});

describe("decision mapping consistency (validation ↔ registry)", () => {
  it("review decisions never produce a status outside RECORD_STATUSES", () => {
    const legal = new Set([
      "draft",
      "pending_validation",
      "needs_correction",
      "verified",
      "marked_duplicate",
    ]);
    for (const target of Object.values(REVIEW_DECISION_TO_RECORD_STATUS)) {
      expect(legal.has(target)).toBe(true);
    }
  });
});
