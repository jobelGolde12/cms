import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Network } from "lucide-react";
import { db } from "@/db";
import { schoolYears } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  assignmentSections,
  assignmentSubjectOptions,
  assignmentTeacherOptions,
  subjectAssignmentsForSections,
} from "@/lib/assignments";
import { PageHeader } from "@/components/ui/page-header";
import {
  AssignmentManager,
  SchoolYearFilter,
} from "@/components/assignments/assignment-manager";

export const metadata = { title: "Teacher Assignments · Records Management System" };

/**
 * Teacher Assignments — Administrator domain (`academics.config`).
 *
 * The single place where the school attaches a teacher account to a section as
 * Adviser, to a (section, subject) as Subject Teacher, or to both with the same
 * account. Assignment is authoritative for grade encoding; the route guard
 * mirrors the server actions, which re-check the permission and every rule.
 */
export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "academics.config")) redirect("/dashboard");

  const sp = await searchParams;
  const requestedYearId = typeof sp.sy === "string" ? sp.sy : "";

  const [years, currentYearRows] = await Promise.all([
    db
      .select({ id: schoolYears.id, year: schoolYears.year })
      .from(schoolYears)
      .orderBy(desc(schoolYears.year)),
    db
      .select({ id: schoolYears.id })
      .from(schoolYears)
      .where(eq(schoolYears.isCurrent, true))
      .limit(1),
  ]);

  const defaultYearId = currentYearRows[0]?.id ?? years[0]?.id ?? "";
  const yearId = requestedYearId || defaultYearId;

  const [sections, teachers, subjects] = await Promise.all([
    assignmentSections(yearId),
    assignmentTeacherOptions(),
    assignmentSubjectOptions(),
  ]);
  const assignments = await subjectAssignmentsForSections(sections.map((s) => s.id));

  const adviserCount = sections.filter((s) => s.adviserId).length;
  const sectionCount = sections.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academic Setup"
        title="Teacher Assignments"
        description="Attach teacher accounts to sections as Adviser, Subject Teacher, or both. Grade encoding follows these assignments — never the role alone."
        actions={<SchoolYearFilter years={years} selectedYearId={yearId} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-[#64748B]">Active sections</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{sectionCount}</p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-[#64748B]">Adviser assignments</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">
            {adviserCount}
            <span className="ml-1 text-sm font-normal text-[#64748B]">/ {sectionCount}</span>
          </p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-[#64748B]">Subject-teacher loads</p>
          <p className="mt-1 text-2xl font-bold text-brand-900">{assignments.length}</p>
        </div>
      </div>

      {sectionCount === 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Network aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            No active sections exist for this school year. Create a section under{" "}
            <a className="font-medium underline" href="/sections">
              Sections
            </a>{" "}
            first, then return here to assign its teachers.
          </p>
        </div>
      ) : null}

      <AssignmentManager
        sections={sections}
        teachers={teachers}
        subjects={subjects}
        assignments={assignments}
      />
    </div>
  );
}
