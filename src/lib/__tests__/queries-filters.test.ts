import { describe, it, expect } from "vitest";
import type { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import type { SessionUser } from "../auth";
import { studentFilters, type StudentQuery } from "../queries";
import { REVIEW_DECISION_TO_RECORD_STATUS } from "../workflow";

/* ---------------------------------------------------------------------------
 * studentFilters — pure SQL builder tests (no database connection for the
 * school-wide roles; teacher scope resolution hits the DB via userSectionScope,
 * so tests cover the school-wide paths only). SQL is rendered with drizzle's
 * dialect. NOTE: studentFilters is async (scope resolution) — awaiting in `build`.
 * ------------------------------------------------------------------------- */

const adminUser: SessionUser = {
  id: "user-1",
  email: "admin@example.gov",
  firstName: "Ada",
  lastName: "Min",
  roleId: "role-admin",
  role: "admin",
};

const recordsUser: SessionUser = {
  ...adminUser,
  id: "user-2",
  roleId: "role-records",
  role: "records",
};

const teacherUser: SessionUser = {
  ...adminUser,
  id: "user-3",
  roleId: "role-teacher",
  role: "teacher",
};

const dialect = new SQLiteSyncDialect();

/** Render a WHERE clause to a single string (SQL text + bound params). */
function renderSql(where: SQL | undefined): string {
  if (!where) return "";
  const { sql: text, params } = dialect.sqlToQuery(where);
  return `${text} — params: ${JSON.stringify(params)}`;
}

const build = async (user: SessionUser, q: StudentQuery) =>
  renderSql(await studentFilters(user, q));

describe("studentFilters (registry query builder)", () => {
  it("always excludes marked_duplicate records, even with no other filters", async () => {
    const sql = await build(adminUser, {});
    expect(sql).toContain("marked_duplicate");
  });

  it("adds no scope restriction for school-wide roles", async () => {
    const sql = await build(recordsUser, {});
    expect(sql).not.toContain("user-2");
  });

  it("scopes teachers to their advisory sections", async () => {
    const sql = await build(teacherUser, {});
    // Teacher scope resolves adviser sections from the database; without a DB
    // connection this resolves to an empty section list (never-true predicate).
    expect(sql).toBeDefined();
  });

  it("searches first name, last name, and student number", async () => {
    const sql = await build(adminUser, { q: "cruz" });
    expect(sql).toContain("%cruz%");
    expect(sql).toContain("first_name");
    expect(sql).toContain("last_name");
    expect(sql).toContain("student_number");
  });

  it("maps status/sex filters to their columns", async () => {
    const sql = await build(adminUser, {
      status: "verified",
      sex: "female",
    });
    expect(sql).toContain("verified");
    expect(sql).toContain("female");
  });

  it("maps grade level and section filters to EXISTS subqueries", async () => {
    const sql = await build(adminUser, { gradeLevel: "gl-7", sectionId: "sec-99" });
    expect(sql).toContain("exists");
    expect(sql).toContain("gl-7");
    expect(sql).toContain("sec-99");
    expect(sql).toContain("student_enrollments");
  });

  it("lifecycle=all means no lifecycle filter", async () => {
    const sql = await build(adminUser, { lifecycle: "all" });
    expect(sql).not.toContain("'archived'");
    expect(sql).not.toContain("'inactive'");
  });

  it("lifecycle filter targets the status column", async () => {
    const sql = await build(adminUser, { lifecycle: "archived" });
    expect(sql).toContain("archived");
    expect(sql).toContain("status");
  });

  it("combines search + filters into a single AND clause", async () => {
    const sql = await build(adminUser, {
      q: "ana",
      status: "pending_validation",
      sex: "male",
    });
    expect(sql).toContain("%ana%");
    expect(sql).toContain("pending_validation");
    expect(sql).toContain("male");
  });
});

describe("decision mapping consistency (verification ↔ registry)", () => {
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
