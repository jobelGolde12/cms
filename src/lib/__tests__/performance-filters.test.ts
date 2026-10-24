import { describe, it, expect } from "vitest";
import type { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { performanceFilters, type PerformanceFilters } from "../queries";

const dialect = new SQLiteSyncDialect();

/** Render a WHERE clause to a single string (SQL text + bound params). */
function renderSql(where: SQL | undefined): string {
  if (!where) return "";
  const { sql: text, params } = dialect.sqlToQuery(where);
  return `${text} — params: ${JSON.stringify(params)}`;
}

const build = (filters: PerformanceFilters) => renderSql(performanceFilters(filters));

describe("performanceFilters (query builder)", () => {
  it("returns undefined when no filter is active", () => {
    expect(build({})).toBe("");
  });

  it("pins to a single subject by id", () => {
    const sql = build({ subjectId: "subj-1" });
    expect(sql).toContain("subj-1");
    expect(sql).toContain("student_grades");
    expect(sql).not.toContain("LIKE");
  });

  it("searches subject name and code with a LIKE needle", () => {
    const sql = build({ q: "math" });
    expect(sql).toContain("%math%");
    expect(sql).toContain('"subjects"."name"');
    expect(sql).toContain('"subjects"."code"');
  });

  it("pins to a single grading period by id", () => {
    const sql = build({ periodId: "gp-2" });
    expect(sql).toContain("gp-2");
    expect(sql).toContain("grading_period_id");
  });

  it("pins to a single grade level via an enrollment EXISTS subquery", () => {
    const sql = build({ gradeLevelId: "gl-7" });
    expect(sql).toContain("exists");
    expect(sql).toContain("gl-7");
    expect(sql).toContain("student_enrollments");
    expect(sql).toContain("grade_level_id");
  });

  it("combines subject search + period + grade level into a single AND clause", () => {
    const sql = build({ q: "eng", periodId: "gp-1", gradeLevelId: "gl-3" });
    expect(sql).toContain("%eng%");
    expect(sql).toContain("gp-1");
    expect(sql).toContain("gl-3");
  });

  it("subjectId takes precedence over q when both are set", () => {
    const sql = build({ subjectId: "subj-9", q: "ignored" });
    expect(sql).toContain("subj-9");
    expect(sql).not.toContain("%ignored%");
  });
});