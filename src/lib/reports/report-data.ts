import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { barangays, children, monitoringFollowups, schools } from "@/db/schema";
import type { SessionUser } from "../auth";
import { childScope } from "../scope";
import { ageFromBirthDate, fullName } from "../utils";

export type ReportType =
  | "school"
  | "barangay"
  | "municipal"
  | "summary"
  | "planning"
  | "monitoring";

export const REPORT_TYPES: Record<ReportType, string> = {
  school: "School Report",
  barangay: "Barangay Report",
  municipal: "Municipal Consolidated Report",
  summary: "Child Mapping Summary",
  planning: "Educational Planning Report",
  monitoring: "Monitoring Report",
};

export type ReportParams = {
  barangayId?: string;
  schoolId?: string;
};

export type ReportRow = Record<string, string | number | null>;

export type BuiltReport = {
  type: ReportType;
  title: string;
  filters: string;
  generatedAt: Date;
  generatedBy: string;
  columns: string[];
  rows: ReportRow[];
  summary: { label: string; value: number }[];
};

const sumWhen = (cond: SQL) => sql<number>`sum(case when ${cond} then 1 else 0 end)`;

const childName = (r: { firstName: string; lastName: string; sex: string }) =>
  `${fullName({ firstName: r.firstName, lastName: r.lastName })} (${r.sex === "male" ? "M" : "F"})`;

function statusLabel(s: string | null): string {
  const map: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    pending_validation: "Pending Validation",
    needs_correction: "Needs Correction",
    resubmitted: "Resubmitted",
    verified: "Verified",
  };
  return map[s ?? ""] ?? s ?? "";
}

export async function buildReport(
  user: SessionUser,
  type: ReportType,
  params: ReportParams,
): Promise<BuiltReport> {
  const scope = childScope(user);
  const withScope = (extra?: SQL) => (scope ? (extra ? and(scope, extra) : scope) : extra);

  const generatedAt = new Date();
  const filters = [
    params.barangayId ? `Barangay: ${await barangayName(params.barangayId)}` : null,
    params.schoolId ? `School: ${await schoolName(params.schoolId)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const generatedBy = `${user.firstName} ${user.lastName} (${user.role})`;

  const base = {
    type,
    title: REPORT_TYPES[type],
    filters: filters || "Municipality-wide (Sta. Magdalena)",
    generatedAt,
    generatedBy,
  };

  switch (type) {
    case "school":
    case "barangay":
    case "municipal": {
      const where = withScope(
        and(
          params.barangayId ? eq(children.barangayId, params.barangayId) : sql`1 = 1`,
          params.schoolId ? eq(children.schoolId, params.schoolId) : sql`1 = 1`,
        ),
      );

      const rows = await db
        .select({
          code: children.childCode,
          firstName: children.firstName,
          lastName: children.lastName,
          sex: children.sex,
          birthDate: children.birthDate,
          barangay: barangays.name,
          school: schools.name,
          grade: children.gradeLevel,
          schoolYear: children.schoolYear,
          education: children.educationalStatus,
          status: children.validationStatus,
        })
        .from(children)
        .leftJoin(barangays, eq(barangays.id, children.barangayId))
        .leftJoin(schools, eq(schools.id, children.schoolId))
        .where(where)
        .orderBy(asc(children.lastName), asc(children.firstName));

      const data = rows.map((r) => ({
        "Child Code": r.code,
        "Full Name": `${r.lastName}, ${r.firstName}`,
        Sex: r.sex === "male" ? "Male" : "Female",
        Age: ageFromBirthDate(r.birthDate) ?? "",
        "Birth Date": r.birthDate,
        Barangay: r.barangay ?? "—",
        School: r.school ?? "—",
        "Grade / Level": r.grade ?? "—",
        "School Year": r.schoolYear ?? "—",
        "Educational Status": r.education,
        "Validation Status": statusLabel(r.status),
      }));

      return {
        ...base,
        columns: [
          "Child Code",
          "Full Name",
          "Sex",
          "Age",
          "Birth Date",
          "Barangay",
          "School",
          "Grade / Level",
          "School Year",
          "Educational Status",
          "Validation Status",
        ],
        rows: data,
        summary: summarize(data),
      };
    }

    case "summary":
    case "planning": {
      const byBarangay = await db
        .select({
          barangay: barangays.name,
          total: count(),
          enrolled: sumWhen(eq(children.educationalStatus, "enrolled")),
          osy: sumWhen(eq(children.educationalStatus, "out_of_school")),
          als: sumWhen(eq(children.educationalStatus, "als_learner")),
          notEnrolled: sumWhen(eq(children.educationalStatus, "not_yet_enrolled")),
          eccdNonPart: sumWhen(eq(children.eccdStatus, "not_participating")),
          disability: sumWhen(sql`${children.disabilityStatus} != 'none'`),
          verified: sumWhen(eq(children.validationStatus, "verified")),
        })
        .from(children)
        .leftJoin(barangays, eq(barangays.id, children.barangayId))
        .where(withScope(sql`1 = 1`))
        .groupBy(children.barangayId)
        .orderBy(asc(barangays.name));

      const columns =
        type === "planning"
          ? [
              "Barangay",
              "Total",
              "Enrolled",
              "Out-of-School",
              "ALS",
              "Not Yet Enrolled",
              "ECCD Non-Participation",
              "With Disability",
            ]
          : [
              "Barangay",
              "Total",
              "Enrolled",
              "Out-of-School",
              "ALS",
              "Not Yet Enrolled",
              "ECCD Non-Participation",
              "With Disability",
              "Verified",
            ];

      const rows = byBarangay.map((r) => ({
        Barangay: r.barangay ?? "—",
        Total: r.total,
        Enrolled: r.enrolled,
        "Out-of-School": r.osy,
        ALS: r.als,
        "Not Yet Enrolled": r.notEnrolled,
        "ECCD Non-Participation": r.eccdNonPart,
        "With Disability": r.disability,
        ...(type === "summary" ? { Verified: r.verified } : {}),
      }));

      const totals: Record<string, number> = {
        Total: rows.reduce((a, r) => a + Number(r.Total), 0),
        Enrolled: rows.reduce((a, r) => a + Number(r.Enrolled), 0),
        "Out-of-School": rows.reduce((a, r) => a + Number(r["Out-of-School"]), 0),
        ALS: rows.reduce((a, r) => a + Number(r.ALS), 0),
        "Not Yet Enrolled": rows.reduce((a, r) => a + Number(r["Not Yet Enrolled"]), 0),
        "ECCD Non-Participation": rows.reduce(
          (a, r) => a + Number(r["ECCD Non-Participation"]),
          0,
        ),
        "With Disability": rows.reduce((a, r) => a + Number(r["With Disability"]), 0),
      };
      if (type === "summary") totals["Verified"] = rows.reduce((a, r) => a + Number(r.Verified), 0);

      return {
        ...base,
        columns,
        rows,
        summary: Object.entries(totals).map(([label, value]) => ({ label, value })),
      };
    }

    case "monitoring": {
      const rows = await db
        .select({
          code: children.childCode,
          firstName: children.firstName,
          lastName: children.lastName,
          sex: children.sex,
          barangay: barangays.name,
          category: monitoringFollowups.category,
          status: monitoringFollowups.status,
          followupDate: monitoringFollowups.followupDate,
          notes: monitoringFollowups.notes,
        })
        .from(monitoringFollowups)
        .innerJoin(children, eq(children.id, monitoringFollowups.childId))
        .leftJoin(barangays, eq(barangays.id, children.barangayId))
        .where(withScope(sql`1 = 1`))
        .orderBy(desc(monitoringFollowups.createdAt))
        .limit(500);

      const data = rows.map((r) => ({
        "Child Code": r.code,
        "Full Name": childName(r),
        Barangay: r.barangay ?? "—",
        Category: r.category,
        Status: r.status,
        "Follow-up Date": r.followupDate ?? "—",
        Notes: r.notes ?? "—",
      }));

      const counts = data.reduce<Record<string, number>>((acc, r) => {
        acc[String(r.Category)] = (acc[String(r.Category)] ?? 0) + 1;
        return acc;
      }, {});

      return {
        ...base,
        columns: ["Child Code", "Full Name", "Barangay", "Category", "Status", "Follow-up Date", "Notes"],
        rows: data,
        summary: Object.entries(counts).map(([label, value]) => ({ label: `Follow-ups · ${label}`, value })),
      };
    }
  }
}

async function barangayName(id: string): Promise<string> {
  const rows = await db.select({ name: barangays.name }).from(barangays).where(eq(barangays.id, id)).limit(1);
  return rows[0]?.name ?? id;
}

async function schoolName(id: string): Promise<string> {
  const rows = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, id)).limit(1);
  return rows[0]?.name ?? id;
}

function summarize(data: ReportRow[]): { label: string; value: number }[] {
  const total = data.length;
  const sex = data.reduce<Record<string, number>>((a, r) => {
    a[String(r.Sex)] = (a[String(r.Sex)] ?? 0) + 1;
    return a;
  }, {});
  const verified = data.filter((r) => String(r["Validation Status"]) === "Verified").length;
  return [
    { label: "Total children", value: total },
    ...Object.entries(sex).map(([label, value]) => ({ label: label as string, value })),
    { label: "Verified", value: verified },
  ];
}

/** Municipality + province header used by exports. */
export const MUNI_HEADER = {
  name: "Municipality of Sta. Magdalena",
  province: "Province of Sorsogon",
  region: "Region V — Bicol",
};