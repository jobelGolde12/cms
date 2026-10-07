import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  listStudents,
  listGradeLevels,
  listSections,
  registryStats,
  gradeLevelCounts,
} from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { RECORD_STATUS_LABELS, type RecordStatus } from "@/lib/constants";
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

  const [result, gradeLevels, sections, stats, gradeCounts] = await Promise.all([
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
          {canCreate ? (
            <Link
              href="/students/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Student Record
            </Link>
          ) : null}
        </div>
      </div>

      <RegistryFilters
        values={filterValues}
        gradeLevels={gradeLevels}
        sections={sections}
        gradeLevelCounts={gradeCounts}
      />

      <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
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
