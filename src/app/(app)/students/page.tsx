import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { AddStudentModal } from "@/components/add-student-modal";
import {
  listStudents,
  listGradeLevels,
  listSections,
  listStudentIncidents,
  registryStats,
  gradeLevelCounts,
} from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { RECORD_STATUS_LABELS, type RecordStatus } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import {
  ActiveFilterChips,
  StudentRegistryTable,
  RegistryFilters,
  RegistryInformationCards,
  RegistryKpiGrid,
  RegistryPageHeader,
  RegistryPagination,
} from "@/components/registry/registry-ui";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Invariant gate (all current roles hold students.view) — keeps the
  // registry access model explicit rather than accidental.
  if (!hasPermission(user.role, "students.view")) redirect("/dashboard");

  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const q = str("q");
  const status = str("status");
  const sex = str("sex");
  const gradeLevel = str("gradeLevel");
  const sectionId = str("section");
  // Record lifecycle filter: defaults to active records so the table matches
  // the KPI basis; archived/inactive rows are visible via an explicit choice.
  const lifecycle = ["active", "inactive", "archived", "all"].includes(str("lifecycle"))
    ? str("lifecycle")
    : "active";
  const sort = params.sort === "name" || params.sort === "oldest" ? params.sort : "recent";
  const page = parseInt(str("page"), 10) || 1;
  const pageSize = parseInt(str("pageSize"), 10) || 10;

  const [result, gradeLevels, sections, stats, gradeCounts, incidents] = await Promise.all([
    listStudents(user, {
      q,
      status,
      sex,
      gradeLevel,
      sectionId,
      lifecycle,
      sort,
      page,
      pageSize,
    }),
    listGradeLevels(),
    listSections(),
    registryStats(user),
    gradeLevelCounts(),
    // Guidance-only roster: students with recorded incidents.
    user.role === "guidance" ? listStudentIncidents(user) : Promise.resolve([]),
  ]);

  const canEdit = hasPermission(user.role, "students.update");
  const canCreate = hasPermission(user.role, "students.create");

  const hasFilters = Boolean(
    q || status || sex || gradeLevel || sectionId || lifecycle !== "active",
  );

  const filterValues = { q, status, sex, gradeLevel, sectionId, lifecycle };

  return (
    <div className="space-y-5">
      <RegistryPageHeader stats={stats} />

      <RegistryKpiGrid stats={stats} />

      {/* ------------------- Guidance incident roster -------------------- */}
      {user.role === "guidance" ? (
        <Card>
          <CardHeader
            title="Guidance: Student Incidents"
            description="Students with recorded behavior incidents (latest first)."
            icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
          />
          <TableWrap minWidth={820}>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>LRN</Th>
                <Th>Grade Level</Th>
                <Th>Section</Th>
                <Th>Incident</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {incidents.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  icon={<ShieldCheck className="h-10 w-10" />}
                  title="No incidents recorded"
                  description="Behavior incidents appear here once recorded on student profiles."
                />
              ) : (
                incidents.map((row) => (
                  <tr key={row.behaviorId} className="transition-colors hover:bg-brand-50/70">
                    <Td>
                      <Link
                        href={`/students/${row.studentId}`}
                        className="font-medium text-brand-900 hover:text-action-700"
                      >
                        {row.lastName}, {row.firstName}
                      </Link>
                      <span className="ml-2 text-xs text-[#94A3B8]">{formatDate(row.date)}</span>
                    </Td>
                    <Td className="numeric text-xs text-brand-700">{row.lrn ?? "—"}</Td>
                    <Td className="text-xs text-brand-700">{row.gradeLevel ?? "—"}</Td>
                    <Td className="text-xs text-brand-700">{row.section ?? "—"}</Td>
                    <Td className="max-w-md text-xs text-[#263449]">{row.incident}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ActiveFilterChips
          filters={[
            { label: "Search", value: q },
            {
              label: "Grade Level",
              value: gradeLevels.find((g) => g.id === gradeLevel)?.name ?? "",
            },
            {
              label: "Section",
              value: sections.find((s) => s.id === sectionId)?.name ?? "",
            },
            { label: "Sex", value: sex === "male" ? "Male" : sex === "female" ? "Female" : "" },
            {
              label: "Status",
              value: status
                ? (RECORD_STATUS_LABELS[status as RecordStatus] ?? status)
                : "",
            },
            {
              label: "Records",
              value:
                lifecycle === "active"
                  ? ""
                  : lifecycle === "archived"
                    ? "Archived only"
                    : lifecycle === "inactive"
                      ? "Inactive only"
                      : "",
            },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {canCreate ? <AddStudentModal /> : null}
        </div>
      </div>

      <RegistryFilters
        values={filterValues}
        gradeLevels={gradeLevels}
        sections={sections}
        gradeLevelCounts={gradeCounts}
      />

      <section className="overflow-x-auto rounded-lg border border-brand-200 bg-white shadow-xs">
        <StudentRegistryTable
          rows={result.rows}
          canEdit={canEdit}
          hasFilters={hasFilters}
          activeSort={sort}
          searchParams={params}
        />
        <RegistryPagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          searchParams={params}
        />
      </section>

      <RegistryInformationCards />
    </div>
  );
}
