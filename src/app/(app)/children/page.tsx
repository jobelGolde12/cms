import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileDown } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  listChildren,
  listBarangays,
  listSchools,
  registryStats,
} from "@/lib/queries";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
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

const COHORT_RANGES: Record<string, [number, number]> = {
  "0-4": [0, 4],
  "5-11": [5, 11],
  "12-15": [12, 15],
  "16-17": [16, 17],
};

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
  const cohort = str("cohort");
  const sort = params.sort === "name" || params.sort === "oldest" ? params.sort : "recent";
  const page = parseInt(str("page"), 10) || 1;
  const pageSize = parseInt(str("pageSize"), 10) || 10;
  const cohortRange = COHORT_RANGES[cohort];
  const ageMin = cohortRange ? cohortRange[0] : parseInt(str("ageMin"), 10) || undefined;
  const ageMax = cohortRange ? cohortRange[1] : parseInt(str("ageMax"), 10) || undefined;

  const [result, barangays, schools, stats] = await Promise.all([
    listChildren(user, {
      q,
      barangay,
      status,
      sex,
      education,
      school,
      ageMin,
      ageMax,
      sort,
      page,
      pageSize,
    }),
    listBarangays(),
    listSchools(),
    registryStats(user),
  ]);

  const canEdit = hasPermission(user.role, "children.update");
  const canCreate = hasPermission(user.role, "children.create");

  // Real per-cohort counts for the chip row (active records in scope only).
  const cohortCounts: Record<string, number> = { "": stats.total };
  await Promise.all(
    Object.entries(COHORT_RANGES).map(async ([key, [min, max]]) => {
      const r = await listChildren(user, { ageMin: min, ageMax: max, page: 1, pageSize: 1 });
      cohortCounts[key] = r.total;
    }),
  );

  const filterValues = { q, barangay, status, sex, education, cohort };

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
        cohorts={cohortCounts}
      />

      <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <ChildRegistryTable rows={result.rows} canEdit={canEdit} />
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
