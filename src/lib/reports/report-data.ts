import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  barangays,
  childEducation,
  childEccd,
  childDisabilities,
  childMonitoring,
  interventions,
  children,
  schools,
} from "@/db/schema";
import type { SessionUser } from "../auth";
import { childScope } from "../scope";
import { ageFromBirthDate, fullName } from "../utils";
import type { ReportType } from "@/lib/constants";
import { REPORT_TYPE_LABELS } from "@/lib/constants";

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
  scope: string;
  columns: string[];
  rows: ReportRow[];
  summary: { label: string; value: number }[];
};

const sumWhen = (cond: SQL) => sql<number>`sum(case when ${cond} then 1 else 0 end)`;

const childName = (r: { firstName: string; lastName: string; sex: string }) =>
  `${fullName({ firstName: r.firstName, lastName: r.lastName })} (${r.sex === "male" ? "M" : "F"})`;

function recordStatusLabel(s: string | null): string {
  const map: Record<string, string> = {
    draft: "Draft",
    pending_validation: "Pending Validation",
    needs_correction: "Needs Correction",
    verified: "Verified",
    marked_duplicate: "Marked Duplicate",
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

  const base = {
    type,
    title: REPORT_TYPE_LABELS[type],
    filters: filters || "Municipality-wide (Sta. Magdalena)",
    generatedAt,
    generatedBy: `${user.firstName} ${user.lastName} (${user.role})`,
    scope: params.barangayId ? "barangay" : params.schoolId ? "school" : "municipality",
  };

  switch (type) {
    case "child_registry":
    case "educational_status": {
      const where = withScope(
        and(
          params.barangayId ? eq(children.barangayId, params.barangayId) : sql`1 = 1`,
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
          recordStatus: children.recordStatus,
          educationStatus: childEducation.educationStatus,
          grade: childEducation.gradeLevel,
          schoolYear: childEducation.schoolYear,
          school: schools.name,
        })
        .from(children)
        .innerJoin(barangays, eq(barangays.id, children.barangayId))
        .leftJoin(
          childEducation,
          and(eq(childEducation.childId, children.id), eq(childEducation.isCurrent, true)),
        )
        .leftJoin(schools, eq(schools.id, childEducation.schoolId))
        .where(where)
        .orderBy(asc(children.lastName), asc(children.firstName));

      const data = rows.map((r) => ({
        "Child Code": r.code,
        "Full Name": `${r.lastName}, ${r.firstName}`,
        Sex: r.sex === "male" ? "Male" : "Female",
        Age: ageFromBirthDate(r.birthDate) ?? "",
        "Birth Date": r.birthDate,
        Barangay: r.barangay,
        "Education Status": r.educationStatus ?? "—",
        School: r.school ?? "—",
        "Grade / Level": r.grade ?? "—",
        "School Year": r.schoolYear ?? "—",
        "Record Status": recordStatusLabel(r.recordStatus),
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
          "Education Status",
          "School",
          "Grade / Level",
          "School Year",
          "Record Status",
        ],
        rows: data,
        summary: summarize(data),
      };
    }

    case "out_of_school_youth":
    case "eccd":
    case "disability":
    case "intervention": {
      // Row-per-child listing for the targeted monitoring reports.
      let conditions: SQL[] = [withScope() ?? sql`1 = 1`];

      if (type === "out_of_school_youth") {
        conditions.push(sql`exists (
          select 1 from ${childEducation}
          where ${childEducation.childId} = ${children.id}
            and ${childEducation.isCurrent} = 1
            and ${childEducation.educationStatus} = 'out_of_school')`);
      } else if (type === "eccd") {
        conditions.push(sql`exists (
          select 1 from ${childEccd}
          where ${childEccd.childId} = ${children.id}
            and ${childEccd.participationStatus} = 'not_participating')`);
      } else if (type === "disability") {
        conditions.push(sql`exists (
          select 1 from ${childDisabilities}
          where ${childDisabilities.childId} = ${children.id}
            and ${childDisabilities.hasDisability} = 1)`);
      } else {
        conditions.push(sql`exists (
          select 1 from ${interventions}
          where ${interventions.childId} = ${children.id})`);
      }

      const rows = await db
        .select({
          code: children.childCode,
          firstName: children.firstName,
          lastName: children.lastName,
          sex: children.sex,
          birthDate: children.birthDate,
          barangay: barangays.name,
          recordStatus: children.recordStatus,
        })
        .from(children)
        .innerJoin(barangays, eq(barangays.id, children.barangayId))
        .where(and(...conditions))
        .orderBy(asc(children.lastName));

      const data = rows.map((r) => ({
        "Child Code": r.code,
        "Full Name": `${r.lastName}, ${r.firstName}`,
        Sex: r.sex === "male" ? "Male" : "Female",
        Age: ageFromBirthDate(r.birthDate) ?? "",
        Barangay: r.barangay,
        "Record Status": recordStatusLabel(r.recordStatus),
      }));

      return {
        ...base,
        columns: ["Child Code", "Full Name", "Sex", "Age", "Barangay", "Record Status"],
        rows: data,
        summary: [{ label: "Total children", value: data.length }],
      };
    }

    case "barangay_summary":
    case "municipal_summary": {
      const byBarangay = await db
        .select({
          barangay: barangays.name,
          total: count(),
          enrolled: sumWhen(sql`exists (
            select 1 from ${childEducation}
            where ${childEducation.childId} = ${children.id}
              and ${childEducation.isCurrent} = 1
              and ${childEducation.educationStatus} = 'enrolled')`),
          osy: sumWhen(sql`exists (
            select 1 from ${childEducation}
            where ${childEducation.childId} = ${children.id}
              and ${childEducation.isCurrent} = 1
              and ${childEducation.educationStatus} = 'out_of_school')`),
          notInSchool: sumWhen(sql`exists (
            select 1 from ${childEducation}
            where ${childEducation.childId} = ${children.id}
              and ${childEducation.isCurrent} = 1
              and ${childEducation.educationStatus} = 'not_yet_in_school')`),
          eccdNonPart: sumWhen(sql`exists (
            select 1 from ${childEccd}
            where ${childEccd.childId} = ${children.id}
              and ${childEccd.participationStatus} = 'not_participating')`),
          withDisability: sumWhen(sql`exists (
            select 1 from ${childDisabilities}
            where ${childDisabilities.childId} = ${children.id}
              and ${childDisabilities.hasDisability} = 1)`),
          verified: sumWhen(eq(children.recordStatus, "verified")),
        })
        .from(children)
        .innerJoin(barangays, eq(barangays.id, children.barangayId))
        .where(withScope(sql`1 = 1`))
        .groupBy(children.barangayId)
        .orderBy(asc(barangays.name));

      const columns = [
        "Barangay",
        "Total",
        "Enrolled",
        "Out-of-School",
        "Not Yet in School",
        "ECCD Non-Participation",
        "With Disability",
        "Verified",
      ];

      const rows = byBarangay.map((r) => ({
        Barangay: r.barangay,
        Total: r.total,
        Enrolled: r.enrolled,
        "Out-of-School": r.osy,
        "Not Yet in School": r.notInSchool,
        "ECCD Non-Participation": r.eccdNonPart,
        "With Disability": r.withDisability,
        Verified: r.verified,
      }));

      const totals: Record<string, number> = {};
      for (const col of columns.slice(1)) {
        totals[col] = rows.reduce((a, r) => a + Number(r[col] ?? 0), 0);
      }

      return {
        ...base,
        columns,
        rows,
        summary: Object.entries(totals).map(([label, value]) => ({ label, value })),
      };
    }

    default: {
      // Monitoring-style fallback: monitoring records joined to children.
      const rows = await db
        .select({
          code: children.childCode,
          firstName: children.firstName,
          lastName: children.lastName,
          sex: children.sex,
          barangay: barangays.name,
          category: childMonitoring.monitoringType,
          status: childMonitoring.status,
          observedAt: childMonitoring.observedAt,
          remarks: childMonitoring.remarks,
        })
        .from(childMonitoring)
        .innerJoin(children, eq(children.id, childMonitoring.childId))
        .innerJoin(barangays, eq(barangays.id, children.barangayId))
        .where(withScope(sql`1 = 1`))
        .orderBy(desc(childMonitoring.observedAt))
        .limit(500);

      const data = rows.map((r) => ({
        "Child Code": r.code,
        "Full Name": childName(r),
        Barangay: r.barangay,
        Category: r.category,
        Status: r.status,
        Observed: r.observedAt.toISOString().slice(0, 10),
        Remarks: r.remarks ?? "—",
      }));

      const counts = data.reduce<Record<string, number>>((acc, r) => {
        acc[String(r.Category)] = (acc[String(r.Category)] ?? 0) + 1;
        return acc;
      }, {});

      return {
        ...base,
        columns: ["Child Code", "Full Name", "Barangay", "Category", "Status", "Observed", "Remarks"],
        rows: data,
        summary: Object.entries(counts).map(([label, value]) => ({
          label: `Monitoring · ${label}`,
          value,
        })),
      };
    }
  }
}

async function barangayName(id: string): Promise<string> {
  const rows = await db
    .select({ name: barangays.name })
    .from(barangays)
    .where(eq(barangays.id, id))
    .limit(1);
  return rows[0]?.name ?? id;
}

async function schoolName(id: string): Promise<string> {
  const rows = await db
    .select({ name: schools.name })
    .from(schools)
    .where(eq(schools.id, id))
    .limit(1);
  return rows[0]?.name ?? id;
}

function summarize(data: ReportRow[]): { label: string; value: number }[] {
  const total = data.length;
  const sex = data.reduce<Record<string, number>>((a, r) => {
    a[String(r.Sex)] = (a[String(r.Sex)] ?? 0) + 1;
    return a;
  }, {});
  const verified = data.filter((r) => String(r["Record Status"]) === "Verified").length;
  return [
    { label: "Total children", value: total },
    ...Object.entries(sex).map(([label, value]) => ({ label, value })),
    { label: "Verified", value: verified },
  ];
}

/** Municipality + province header used by exports. */
export const MUNI_HEADER = {
  name: "Municipality of Sta. Magdalena",
  province: "Province of Sorsogon",
  region: "Region V — Bicol",
};
