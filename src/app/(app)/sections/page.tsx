import { redirect } from "next/navigation";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { Network } from "lucide-react";
import { db } from "@/db";
import {
  gradeLevels,
  roles,
  schoolYears,
  sections,
  studentEnrollments,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasUserPermission } from "@/lib/permissions";
import { setSectionActiveForm } from "@/actions/sections";
import { AddSectionButton, SectionEditButton } from "@/components/sections/section-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { ClientNavForm } from "@/components/ui/client-nav-form";
import { SubmitButton } from "@/components/ui/form-status";
import { buttonStyles } from "@/components/ui/button";

export const metadata = { title: "Sections · Records Management System" };

type Option = { id: string; label: string };

/**
 * Section Management — Administrator domain.
 *
 * Route guard: `academics.config` — every other role is redirected here, so a
 * manually typed URL can never view or mutate the academic structure.
 */
export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasUserPermission(user.roles, "academics.config")) redirect("/dashboard");

  const sp = await searchParams;
  const param = (key: string): string => {
    const v = sp[key];
    return typeof v === "string" ? v : "";
  };
  const q = param("q").trim();
  const status = ["active", "inactive", "all"].includes(param("status")) ? param("status") : "active";
  const gradeLevelId = param("gradeLevel");

  /* ------------------------- reference dropdowns ------------------------- */
  const [yearRows, gradeRows, adviserRows, currentYearRows] = await Promise.all([
    db.select({ id: schoolYears.id, year: schoolYears.year }).from(schoolYears).orderBy(desc(schoolYears.year)),
    db.select({ id: gradeLevels.id, name: gradeLevels.name }).from(gradeLevels).orderBy(asc(gradeLevels.orderIndex)),
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        middleName: users.middleName,
        lastName: users.lastName,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(roles.id, users.roleId))
      // Dummy/test accounts never appear as an adviser option.
      .where(and(eq(users.isActive, true), eq(users.isDummy, false)))
      .orderBy(asc(users.lastName)),
    db
      .select({ id: schoolYears.id, year: schoolYears.year })
      .from(schoolYears)
      .where(eq(schoolYears.isCurrent, true))
      .limit(1),
  ]);

  const schoolYearOptions: Option[] = yearRows.map((y) => ({ id: y.id, label: `SY ${y.year}` }));
  const gradeLevelOptions: Option[] = gradeRows.map((g) => ({ id: g.id, label: g.name }));
  const adviserOptions: Option[] = adviserRows.map((u) => ({
    id: u.id,
    label: [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" "),
  }));

  // Default filter: the current school year ( installa-time fallback: latest ).
  const defaultYearId = currentYearRows[0]?.id ?? schoolYearOptions[0]?.id ?? "";
  const schoolYearId = param("sy") || defaultYearId;

  /* ------------------------------ main query ----------------------------- */
  const conditions = [
    schoolYearId ? eq(sections.schoolYearId, schoolYearId) : undefined,
    gradeLevelId ? eq(sections.gradeLevelId, gradeLevelId) : undefined,
    status === "active" ? eq(sections.isActive, true) : undefined,
    status === "inactive" ? eq(sections.isActive, false) : undefined,
  ];
  const rows = await db
    .select({
      id: sections.id,
      name: sections.name,
      isActive: sections.isActive,
      gradeLevelName: gradeLevels.name,
      gradeLevelId: sections.gradeLevelId,
      adviserId: sections.adviserId,
      schoolYearId: sections.schoolYearId,
      schoolYear: schoolYears.year,
      adviserFirstName: users.firstName,
      adviserMiddleName: users.middleName,
      adviserLastName: users.lastName,
    })
    .from(sections)
    .innerJoin(gradeLevels, eq(gradeLevels.id, sections.gradeLevelId))
    .innerJoin(schoolYears, eq(schoolYears.id, sections.schoolYearId))
    .leftJoin(users, eq(users.id, sections.adviserId))
    .where(
      and(
        ...conditions.filter(Boolean),
        q
          ? or(
              ilike(sections.name, `%${q}%`),
              ilike(users.firstName, `%${q}%`),
              ilike(users.lastName, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(schoolYears.year), asc(gradeLevels.orderIndex), asc(sections.name));

  // Enrolled students per section (active enrollments only) — one grouped
  // query, never a per-row lookup.
  const enrollRows = await db
    .select({ sectionId: studentEnrollments.sectionId, n: count() })
    .from(studentEnrollments)
    .where(eq(studentEnrollments.status, "active"))
    .groupBy(studentEnrollments.sectionId);
  const enrolledBySection = new Map(enrollRows.map((r) => [r.sectionId, Number(r.n)]));

  const adviserLabel = (r: (typeof rows)[number]) =>
    [r.adviserFirstName, r.adviserMiddleName, r.adviserLastName].filter(Boolean).join(" ") || null;

  const sectionData = rows.map((r) => ({
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    gradeLevelId: r.gradeLevelId,
    gradeLevelName: r.gradeLevelName,
    schoolYearId: r.schoolYearId,
    schoolYear: r.schoolYear,
    adviserId: r.adviserId,
    adviser: adviserLabel(r),
    enrolled: enrolledBySection.get(r.id) ?? 0,
  }));

  const totalActive = sectionData.filter((s) => s.isActive).length;
  const hasFilters = Boolean(q || gradeLevelId || (status !== "active" && status !== "all") || (schoolYearId && schoolYearId !== defaultYearId));

  // The active school year sections for the quick Activate/Deactivate toggle.
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Academic Structure"
        title="Sections"
        description="Grade-level sections per school year, with their advisers and active enrollment counts."
        actions={
          <AddSectionButton
            schoolYearOptions={schoolYearOptions}
            gradeLevelOptions={gradeLevelOptions}
            adviserOptions={adviserOptions}
          />
        }
      />

      {/* Filters (GET form → server-rendered results, preserves URL state) */}
      <ClientNavForm
        action="/sections"
        className="grid grid-cols-1 gap-3 rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs sm:grid-cols-4"
      >
        <div>
          <label htmlFor="sec-q" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
            Search
          </label>
          <input
            id="sec-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Section or adviser name…"
            className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          />
        </div>
        <div>
          <label htmlFor="sec-sy" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
            School year
          </label>
          <select
            id="sec-sy"
            name="sy"
            defaultValue={schoolYearId}
            className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          >
            {schoolYearOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sec-grade" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
            Grade level
          </label>
          <select
            id="sec-grade"
            name="gradeLevel"
            defaultValue={gradeLevelId}
            className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          >
            <option value="">All grade levels</option>
            {gradeLevelOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="sec-status" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              Status
            </label>
            <select
              id="sec-status"
              name="status"
              defaultValue={status}
              className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            >
              <option value="active">Active only</option>
              <option value="inactive">Deactivated only</option>
              <option value="all">All</option>
            </select>
          </div>
          <button type="submit" className={buttonStyles("secondary", "sm")}>
            Filter
          </button>
        </div>
      </ClientNavForm>

      <Card>
        <CardHeader
          title={`${totalActive} active section${totalActive === 1 ? "" : "s"}`}
          description={hasFilters ? "Filtered view — clear filters to see the full academic structure." : "Most sections carry an active adviser and enrollment."}
          icon={<Network aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={820}>
          <thead>
            <tr>
              <Th>Section</Th>
              <Th>Grade level</Th>
              <Th>School year</Th>
              <Th>Adviser</Th>
              <Th align="right">Enrolled</Th>
              <Th>Status</Th>
              {hasUserPermission(user.roles, "academics.config") ? (
                <Th align="right">Actions</Th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {sectionData.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={<Network className="h-10 w-10" />}
                title={hasFilters ? "No sections match the filters" : "No sections created yet"}
                description={
                  hasFilters
                    ? "Try a different school year, grade level, or search term."
                    : "Use “Add Section” to create the school's first grade-level section."
                }
              />
            ) : (
              sectionData.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-brand-50/70">
                  <Td className="text-[13px] font-semibold text-brand-900">{s.name}</Td>
                  <Td className="text-xs text-brand-700">{s.gradeLevelName}</Td>
                  <Td className="text-xs text-brand-600">SY {s.schoolYear}</Td>
                  <Td className="text-xs text-brand-700">{s.adviser ?? "—"}</Td>
                  <Td className="numeric text-xs text-brand-700" align="right">
                    {s.enrolled}
                  </Td>
                  <Td>
                    <Badge tone={s.isActive ? "verified" : "neutral"}>{s.isActive ? "Active" : "Deactivated"}</Badge>
                  </Td>
                  <Td align="right">
                    <span className="inline-flex items-center gap-3">
                      <SectionEditButton
                        section={{
                          id: s.id,
                          name: s.name,
                          schoolYearId: s.schoolYearId,
                          gradeLevelId: s.gradeLevelId,
                          adviserId: s.adviserId,
                        }}
                        schoolYearOptions={schoolYearOptions}
                        gradeLevelOptions={gradeLevelOptions}
                        adviserOptions={adviserOptions}
                      />
                      <form action={setSectionActiveForm} className="contents">
                        <input type="hidden" name="sectionId" value={s.id} />
                        <input type="hidden" name="isActive" value={s.isActive ? "false" : "true"} />
                        <SubmitButton
                          className="text-xs font-medium text-brand-600 hover:text-brand-900"
                          pendingLabel="Saving…"
                        >
                          {s.isActive ? "Deactivate" : "Activate"}
                        </SubmitButton>
                      </form>
                    </span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
