import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  listChildren,
  listBarangays,
  listSchools,
  registryStats,
  cohortCounts,
} from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { EDUCATION_STATUS_LABELS, RECORD_STATUS_LABELS, type EducationStatus, type RecordStatus } from "@/lib/constants";
import {
  ActiveFilterChips,
  ChildRegistryTable,
  RegistryFilters,
  RegistryInformationCards,
  RegistryKpiGrid,
  RegistryPageHeader,
  RegistryPagination,
} from "@/components/registry/registry-ui";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const q = str("q");
  const barangay = str("barangay");
  const status = str("status");
  const sex = str("sex");
  const education = str("education");
  const school = str("school");
  // Record lifecycle filter: defaults to active records so the table matches
  // the KPI basis; archived/inactive rows are visible via an explicit choice.
  const active = ["active", "inactive", "archived", "all"].includes(str("active"))
    ? str("active")
    : "active";
  const sort = params.sort === "name" || params.sort === "oldest" ? params.sort : "recent";
  const page = parseInt(str("page"), 10) || 1;
  const pageSize = parseInt(str("pageSize"), 10) || 10;

  // Cohort chips work through ageMin/ageMax URL params; derive the active
  // cohort label from them so filters and chips stay in sync.
  const ageMin = parseInt(str("ageMin"), 10) || undefined;
  const ageMax = parseInt(str("ageMax"), 10) || undefined;
  const cohort =
    ageMin !== undefined && ageMax !== undefined ? `${ageMin}-${ageMax}` : str("cohort");

  const [result, barangays, schools, stats, cohorts] = await Promise.all([
    listChildren(user, {
      q,
      barangay,
      status,
      sex,
      education,
      school,
      active,
      ageMin,
      ageMax,
      sort,
      page,
      pageSize,
    }),
    listBarangays(),
    listSchools(),
    registryStats(user),
    cohortCounts(user),
  ]);

  const canEdit = hasPermission(user.role, "children.update");
  const canCreate = hasPermission(user.role, "children.create");

  const hasFilters = Boolean(q || barangay || status || sex || education || school || ageMin !== undefined || ageMax !== undefined || status !== "" || active !== "active");

  const filterValues = { q, barangay, status, sex, education, school, cohort, active };

  return (
    <div className="space-y-5">
      <RegistryPageHeader stats={stats} />

      <RegistryKpiGrid stats={stats} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ActiveFilterChips
          filters={[
            { label: "Search", value: q },
            { label: "Barangay", value: barangays.find((b) => b.id === barangay)?.name ?? "" },
            { label: "School", value: schools.find((s) => s.id === school)?.name ?? "" },
            {
              label: "Education",
              value: education
                ? (EDUCATION_STATUS_LABELS[education as EducationStatus] ?? education)
                : "",
            },
            { label: "Sex", value: sex === "male" ? "Male" : sex === "female" ? "Female" : "" },
            {
              label: "Status",
              value: status
                ? (RECORD_STATUS_LABELS[status as RecordStatus] ?? status)
                : "",
            },
            {
              label: "Age",
              value:
                ageMin !== undefined && ageMax !== undefined ? `${ageMin}–${ageMax} yrs` : "",
            },
            {
              label: "Records",
              value:
                active === "active"
                  ? ""
                  : active === "archived"
                    ? "Archived only"
                    : active === "inactive"
                      ? "Inactive only"
                      : "",
            },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {canCreate ? (
            <Link
              href="/children/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Child Record
            </Link>
          ) : null}
        </div>
      </div>

      <RegistryFilters
        values={filterValues}
        barangays={barangays}
        schools={schools}
        cohorts={cohorts}
      />

      <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <ChildRegistryTable
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
