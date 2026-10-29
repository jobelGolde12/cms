import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { GraduationCap, Info, ListChecks } from "lucide-react";
import { db } from "@/db";
import { gradeLevels, gradingPeriods, schoolYears, sections } from "@/db/schema";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getGradeSheet,
  groupAssignmentsBySection,
  resolveGradeSliceContext,
  teacherEncodingSections,
  teacherSubjectAssignments,
} from "@/lib/grades";
import { listSubjects } from "@/lib/queries";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { GradeSheetFilters } from "@/components/grades/grade-sheet-filters";
import { GradeSheetPanel } from "@/components/grades/grade-sheet";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Grade Encoding · Records Management System" };

/**
 * Grade Encoding — the section-oriented grade-entry workflow.
 *
 * Context cascade (all resolved server-side from URL params, so the roster,
 * grades and submission state are always a fresh DB read):
 *   School Year → Grade Level → Section → Subject → Grading Period → Students
 *
 * Authorization: the page is readable with `grades.view` (read-only for every
 * other role — including the Adviser); encoding/submitting is done only by
 * Subject Teachers with an assignment in that (section, subject), re-enforced
 * inside the actions (never here alone).
 */
export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "grades.view")) redirect("/dashboard?denied=grades.view");

  const sp = await searchParams;
  const param = (key: string): string | undefined => {
    const v = sp[key];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  const syParam = param("sy");
  const levelParam = param("level");
  const sectionParam = param("section");
  const subjectParam = param("subject");
  const periodParam = param("period");

  /* ----------------------- candidate sections & refs ---------------------- */
  const isSubjectTeacher = user.role === "subject_teacher";
  if (isSubjectTeacher) {
    // Departmental teaching loads only: the subject dropdown is restricted to
    // the teacher's (section, subject) assignments — wrong-subject encoding is
    // impossible from the UI and re-checked in every action.
    const own = await teacherEncodingSections(user);
    const [subjectRows, periodRows, assignments] = await Promise.all([
      listSubjects(),
      allPeriods(),
      teacherSubjectAssignments(user.id),
    ]);
    const subjectsBySection = groupAssignmentsBySection(assignments);
    return render({
      user,
      isEncoder: true,
      sections: own.map((s) => ({ ...s, editable: true, advisory: s.advisory })),
      allSectionsForFallback: own.map((s) => ({ ...s, editable: true, advisory: s.advisory })),
      subjects: subjectRows.map((s) => ({ id: s.id, name: s.name, code: s.code })),
      subjectsBySection,
      periods: periodRows,
      params: { sy: syParam, level: levelParam, section: sectionParam, subject: subjectParam, period: periodParam },
    });
  }

  // Adviser and every other role: read-only grade view over every active
  // section (any year). Advisers may no longer encode grades (2026-10 rev B).
  const allSections = await allSectionsAcrossYears();
  const [subjectRows, periodRows] = await Promise.all([listSubjects(), allPeriods()]);
  return render({
    user,
    isEncoder: false,
    sections: allSections.map((s) => ({ ...s, editable: false })),
    allSectionsForFallback: allSections.map((s) => ({ ...s, editable: false })),
    subjects: subjectRows.map((s) => ({ id: s.id, name: s.name, code: s.code })),
    subjectsBySection: undefined,
    periods: periodRows,
    params: { sy: syParam, level: levelParam, section: sectionParam, subject: subjectParam, period: periodParam },
  });

  async function render(ctx: {
    user: SessionUser;
    isEncoder: boolean;
    sections: Parameters<typeof GradeSheetFilters>[0]["sections"];
    allSectionsForFallback: Parameters<typeof GradeSheetFilters>[0]["sections"];
    subjects: { id: string; name: string; code: string }[];
    /** subject ids this teacher may encode per departmental section */
    subjectsBySection: Parameters<typeof GradeSheetFilters>[0]["subjectsBySection"];
    periods: { schoolYearId: string; id: string; name: string; isCurrent: boolean }[];
    params: {
      sy?: string;
      level?: string;
      section?: string;
      subject?: string;
      period?: string;
    };
  }) {
    if (ctx.sections.length === 0) {
      return (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Academics"
            title="Grade Encoding"
            description="Encode student grades by section, subject and grading period."
          />
          <Card>
            <CardBody className="py-14 text-center">
              <GraduationCap aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-brand-200" />
            <p className="text-base font-semibold text-brand-800">
              {ctx.isEncoder
                ? "No grade-encoding sections are assigned to you yet"
                : "No active sections found"}
            </p>
              <p className="mt-1 max-w-md text-sm text-[#64748B]">
                {ctx.isEncoder
                  ? "Sections appear here once you are given a subject teaching load in them. Ask the school administrator to set that up."
                  : "Sections appear here once they are configured for a school year."}
              </p>
            </CardBody>
          </Card>
        </div>
      );
    }

    const resolved = await resolveGradeSliceContext(ctx.user, {
      sectionId: ctx.params.section,
      subjectId: ctx.params.subject,
      gradingPeriodId: ctx.params.period,
    });

    if (!resolved.ok) {
      return (
        <div className="space-y-6">
          <PageHeader eyebrow="Academics" title="Grade Encoding" />
          <Card>
            <CardBody className="flex items-start gap-3 py-10">
              <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-action-700" />
              <div>
                <p className="text-sm font-semibold text-brand-900">Cannot load this grade sheet</p>
                <p className="mt-1 text-sm text-[#64748B]">{resolved.error}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    const context = resolved.context;
    const sheet = await getGradeSheet(ctx.user, context);
    const locked = context.submission?.status === "submitted";
    const selected = {
      yearId: ctx.params.sy ?? "",
      gradeLevelId: ctx.params.level ?? "",
      sectionId: context.sectionId,
      subjectId: context.subjectId,
      periodId: context.gradingPeriodId,
    };

    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Academics"
          title="Grade Encoding"
          description={
            ctx.isEncoder && context.editable
              ? "Your assigned subject sheets. Grades are saved as drafts until you submit the sheet."
              : "Section-based grade sheets. Submitted grades are shown for your role."
          }
        />

        <GradeSheetFilters
          sections={ctx.sections}
          subjects={ctx.subjects}
          subjectsBySection={ctx.subjectsBySection}
          periods={ctx.periods}
          selected={selected}
        />

        {/* Academic-context stamp — never leave the viewer guessing. */}
        <Card className="border-brand-200 bg-brand-50/60">
          <CardBody className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
              Sheet context
            </span>
            {[
              context.schoolYear,
              context.gradeLevelName,
              context.sectionName,
              context.subjectName,
              context.periodName,
            ].map((chip) => (
              <Badge key={chip} className="bg-white text-brand-800 ring-1 ring-brand-200">
                {chip}
              </Badge>
            ))}
            {context.submission ? (
              <span className="ml-auto text-xs text-[#64748B]">
                {context.submission.status === "submitted"
                  ? `Submitted ${formatDateTime(context.submission.submittedAt)}${
                      context.submission.submitterName ? ` by ${context.submission.submitterName}` : ""
                    }`
                  : `Reopened after submission${context.submission.submitterName ? ` by ${context.submission.submitterName}` : ""}`}
              </span>
            ) : (
              <span className="ml-auto text-xs text-[#64748B]">Not started</span>
            )}
          </CardBody>
        </Card>

        <GradeSheetPanel
          context={{
            sectionId: context.sectionId,
            subjectId: context.subjectId,
            gradingPeriodId: context.gradingPeriodId,
            subjectName: context.subjectName,
            periodName: context.periodName,
            sectionName: context.sectionName,
            schoolYear: context.schoolYear,
            gradeLevelName: context.gradeLevelName,
            editable: context.editable && !locked,
            locked: context.editable && locked,
          }}
          rows={sheet.rows}
        />

        <p className="flex items-start gap-2 px-1 text-xs text-[#64748B]">
          <ListChecks aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
          Workflow: encode → Save Draft (anytime) → Submit (validates that every active student has
          a grade; submitted sheets lock) → Reopen for correction if needed.
        </p>
      </div>
    );
  }
}

/** Active sections across every school year (for the read-only cascade). */
async function allSectionsAcrossYears() {
  return db
    .select({
      id: sections.id,
      name: sections.name,
      gradeLevelId: gradeLevels.id,
      gradeLevelName: gradeLevels.name,
      gradeLevelOrder: gradeLevels.orderIndex,
      schoolYearId: sections.schoolYearId,
      schoolYear: schoolYears.year,
    })
    .from(sections)
    .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
    .innerJoin(schoolYears, eq(schoolYears.id, sections.schoolYearId))
    .where(eq(sections.isActive, true))
    .orderBy(desc(schoolYears.year), asc(gradeLevels.orderIndex), asc(sections.name));
}

/** All grading periods with their school year (for the cascade). */
async function allPeriods() {
  return db
    .select({
      schoolYearId: gradingPeriods.schoolYearId,
      id: gradingPeriods.id,
      name: gradingPeriods.name,
      isCurrent: gradingPeriods.isCurrent,
    })
    .from(gradingPeriods)
    .orderBy(asc(gradingPeriods.orderIndex));
}
