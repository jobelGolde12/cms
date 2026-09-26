import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  Eye,
  Pencil,
  Search,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RecordStatusBadge } from "@/components/ui/badge";
import { EDUCATION_STATUS_LABELS, type RecordStatus, type EducationStatus } from "@/lib/constants";
import type { ChildRow, RegistryStats } from "@/lib/queries";

/* -------------------------------------------------------------------------- */
/*  Page header                                                               */
/* -------------------------------------------------------------------------- */

export function RegistryPageHeader({ stats }: { stats: RegistryStats }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
          Child Mapping Registry
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[32px] sm:leading-tight">
          Child Registry
        </h1>
        <p className="mt-1 text-sm text-brand-500">
          Official DepEd Form 1 digital master ledger &bull; Municipality of
          Sta. Magdalena, Sorsogon
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-700">
          <span className="numeric font-semibold text-brand-900">{stats.total}</span>
          total records
        </span>
        <span className="hidden items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-700 sm:inline-flex">
          <ClipboardCheck aria-hidden="true" className="h-3.5 w-3.5 text-action-700" />
          Form 1 Master Ledger
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  KPI cards                                                                 */
/* -------------------------------------------------------------------------- */

const KPI_ICON_STYLES: Record<string, string> = {
  green: "text-emerald-700 bg-emerald-100",
  amber: "text-amber-700 bg-amber-100",
  blue: "text-sky-700 bg-sky-100",
  red: "text-red-700 bg-red-100",
  slate: "text-brand-600 bg-brand-100",
  navy: "text-brand-800 bg-brand-100",
};

function RegistryKpiCard({
  label,
  value,
  supporting,
  tone,
}: {
  label: string;
  value: string;
  supporting: string;
  tone: keyof typeof KPI_ICON_STYLES;
}) {
  return (
    <article className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">{label}</h3>
      <p className="numeric mt-1.5 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-brand-500">{supporting}</p>
      <span className={cn("sr-only", KPI_ICON_STYLES[tone])}>{supporting}</span>
    </article>
  );
}

export function RegistryKpiGrid({ stats }: { stats: RegistryStats }) {
  const kpis: {
    label: string;
    value: string;
    supporting: string;
    tone: keyof typeof KPI_ICON_STYLES;
  }[] = [
    {
      label: "Total Records",
      value: stats.total.toLocaleString("en-PH"),
      supporting: "Active child records",
      tone: "navy",
    },
    {
      label: "Enrolled",
      value: stats.enrolled.toLocaleString("en-PH"),
      supporting: "Currently in school",
      tone: "green",
    },
    {
      label: "Verification",
      value: `${stats.verificationRate}%`,
      supporting: `${stats.verified.toLocaleString("en-PH")} verified · ${stats.pendingValidation.toLocaleString("en-PH")} pending`,
      tone: "blue",
    },
    {
      label: "Not Yet in School",
      value: stats.notYetInSchool.toLocaleString("en-PH"),
      supporting: "ECCD / out-of-school follow-up",
      tone: "amber",
    },
    {
      label: "With Disability",
      value: stats.withDisability.toLocaleString("en-PH"),
      supporting: "Identified support needs",
      tone: "slate",
    },
    {
      label: "Open Interventions",
      value: stats.openInterventions.toLocaleString("en-PH"),
      supporting: "Active case management",
      tone: "red",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <RegistryKpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Filters — native GET form, server-side filtering                          */
/* -------------------------------------------------------------------------- */

export type RegistryFilterValues = {
  q: string;
  barangay: string;
  status: string;
  sex: string;
  education: string;
  cohort: string;
};

const COHORTS = [
  { key: "", label: "All Ages" },
  { key: "0-4", label: "0–4 ECCD" },
  { key: "5-11", label: "5–11 Elem" },
  { key: "12-15", label: "12–15 JHS" },
  { key: "16-17", label: "16–17 SHS" },
] as const;

const inputClass =
  "h-9 w-full rounded-md border border-brand-200 bg-white px-3 text-[13px] text-brand-900 placeholder:text-brand-400 focus:border-action-500 focus:outline-none";

const selectWrapperClass = "min-w-0";

function FilterSelect({
  label,
  id,
  name,
  value,
  allLabel,
  options,
}: {
  label: string;
  id: string;
  name: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className={selectWrapperClass}>
      <label htmlFor={id} className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-500">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value} className={inputClass}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RegistryFilters({
  values,
  barangays,
  schools,
  cohorts,
}: {
  values: RegistryFilterValues;
  barangays: { id: string; name: string }[];
  schools: { id: string; name: string }[];
  cohorts: Record<string, number>;
}) {
  const activeCohort = values.cohort;

  return (
    <form
      action="/children"
      method="GET"
      className="rounded-lg border border-brand-200 bg-white shadow-xs"
    >
      <div className="border-b border-brand-100 px-4 py-3">
        <label htmlFor="registry-search" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-500">
          Search
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400"
          />
          <input
            id="registry-search"
            type="search"
            name="q"
            defaultValue={values.q}
            placeholder="Search by learner name or child mapping ID…"
            className={cn(inputClass, "h-10 pl-9")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Barangay"
          id="filter-barangay"
          name="barangay"
          value={values.barangay}
          allLabel="All Barangays"
          options={barangays.map((b) => ({ value: b.id, label: b.name }))}
        />
        <FilterSelect
          label="Assigned School"
          id="filter-school"
          name="school"
          value=""
          allLabel="All Schools"
          options={schools.map((s) => ({ value: s.id, label: s.name }))}
        />
        <FilterSelect
          label="Education Status"
          id="filter-education"
          name="education"
          value={values.education}
          allLabel="All Statuses"
          options={(Object.keys(EDUCATION_STATUS_LABELS) as EducationStatus[]).map((k) => ({
            value: k,
            label: EDUCATION_STATUS_LABELS[k],
          }))}
        />
        <FilterSelect
          label="Sex"
          id="filter-sex"
          name="sex"
          value={values.sex}
          allLabel="All"
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
        />
        <FilterSelect
          label="Verification"
          id="filter-status"
          name="status"
          value={values.status}
          allLabel="All Records"
          options={[
            { value: "verified", label: "Verified" },
            { value: "pending_validation", label: "Pending Validation" },
            { value: "needs_correction", label: "Needs Correction" },
            { value: "draft", label: "Draft" },
          ]}
        />
        {/* Preserve cohort across submits; its chip row is the visible control. */}
        <input type="hidden" name="cohort" value={activeCohort} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Age cohort filters">
          {COHORTS.map((c) => {
            const [min, max] = c.key ? c.key.split("-").map(Number) : [null, null];
            const count = c.key ? (cohorts[c.key] ?? 0) : cohorts[""] ?? 0;
            const active = activeCohort === c.key;
            const params = new URLSearchParams();
            if (values.q) params.set("q", values.q);
            if (values.barangay) params.set("barangay", values.barangay);
            if (values.status) params.set("status", values.status);
            if (values.sex) params.set("sex", values.sex);
            if (values.education) params.set("education", values.education);
            if (c.key) {
              params.set("ageMin", String(min));
              params.set("ageMax", String(max));
            }
            return (
              <Link
                key={c.label}
                href={`/children${params.size ? `?${params}` : ""}`}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
                  active
                    ? "bg-brand-900 text-white"
                    : "bg-brand-100 text-brand-700 hover:bg-brand-200",
                )}
              >
                {c.label}
                <span
                  className={cn(
                    "numeric text-[10px]",
                    active ? "text-brand-300" : "text-brand-400",
                  )}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/children"
            className="inline-flex h-9 items-center rounded-md border border-brand-200 bg-white px-3.5 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            Reset
          </Link>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-action-700 px-4 text-[13px] font-medium text-white transition-colors hover:bg-action-800"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Active filter chips                                                       */
/* -------------------------------------------------------------------------- */

export function ActiveFilterChips({ filters }: { filters: { label: string; value: string }[] }) {
  const active = filters.filter((f) => f.value);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">
        Active filters
      </span>
      {active.map((f) => (
        <span
          key={f.label}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-brand-100 px-2.5 text-xs text-brand-700"
        >
          <span className="font-semibold">{f.label}:</span> {f.value}
        </span>
      ))}
      <Link href="/children" className="text-xs font-medium text-action-700 hover:text-action-800">
        Clear all
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

const SCHOOL_TYPE_LABELS: Record<string, string> = {
  elementary: "Public Elementary",
  high_school: "Public High School",
  integrated: "Integrated School",
  college: "College",
};

const EDU_TONE: Record<string, string> = {
  enrolled: "text-brand-700",
  out_of_school: "font-medium text-red-700",
  not_yet_in_school: "text-amber-700",
  graduated: "text-brand-700",
  unknown: "text-brand-400",
};

export function ChildRegistryTable({
  rows,
  canEdit,
}: {
  rows: ChildRow[];
  canEdit: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <thead>
          <tr className="bg-[#eef3ff] text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            <th scope="col" className="px-4 py-2.5">Child Mapping ID</th>
            <th scope="col" className="px-4 py-2.5">Learner Name</th>
            <th scope="col" className="px-4 py-2.5">Age / Sex</th>
            <th scope="col" className="px-4 py-2.5">Barangay / Sitio</th>
            <th scope="col" className="px-4 py-2.5">School / Facility</th>
            <th scope="col" className="px-4 py-2.5">Grade / Education</th>
            <th scope="col" className="px-4 py-2.5">Status</th>
            <th scope="col" className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-sm font-semibold text-brand-800">No child records found</p>
                <p className="mt-1 text-xs text-brand-500">
                  Try adjusting your search or filters.
                </p>
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const edu = r.educationStatus
                ? (EDUCATION_STATUS_LABELS[r.educationStatus as EducationStatus] ?? r.educationStatus)
                : null;
              return (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/70">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/children/${r.id}`}
                      className="numeric text-[13px] font-semibold text-brand-900 hover:text-action-700"
                    >
                      {r.childCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/children/${r.id}`}
                      className="text-[13px] font-semibold text-brand-900 hover:text-action-700"
                    >
                      {[r.lastName, r.firstName, r.suffix].filter(Boolean).join(", ")}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-brand-600">
                    {r.age ?? "—"} &bull; {r.sex === "male" ? "M" : r.sex === "female" ? "F" : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="block text-[13px] text-brand-700">{r.barangayName}</span>
                    {r.sitio ? (
                      <span className="block text-[11px] text-brand-400">{r.sitio}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.schoolName ? (
                      <>
                        <span className="block max-w-[160px] truncate text-[13px] text-brand-700" title={r.schoolName}>
                          {r.schoolName}
                        </span>
                        <span className="block text-[11px] text-brand-400">
                          {SCHOOL_TYPE_LABELS[r.schoolType ?? ""] ?? ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] text-brand-400">No school</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("block text-[13px]", EDU_TONE[r.educationStatus ?? "unknown"] ?? "text-brand-700")}>
                      {r.gradeLevel ?? edu ?? "—"}
                    </span>
                    {r.gradeLevel && edu ? (
                      <span className="block text-[11px] text-brand-400">{edu}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <RecordStatusBadge status={r.recordStatus as RecordStatus} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/children/${r.id}`}
                        aria-label={`View ${r.firstName} ${r.lastName}`}
                        title="View record"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-900"
                      >
                        <Eye aria-hidden="true" className="h-4 w-4" />
                      </Link>
                      {canEdit ? (
                        <Link
                          href={`/children/${r.id}/edit`}
                          aria-label={`Edit ${r.firstName} ${r.lastName}`}
                          title="Edit record"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-900"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                */
/* -------------------------------------------------------------------------- */

function buildPageHref(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/children?${next}`;
}

export function RegistryPagination({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || typeof value !== "string" || !value) continue;
    params.set(key, value);
  }

  const pageNumbers: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let p = start; p <= Math.min(totalPages, start + 4); p++) pageNumbers.push(p);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-brand-100 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-3">
        <p className="text-xs text-brand-500">
          Showing <span className="numeric font-medium text-brand-700">{from}</span>–
          <span className="numeric font-medium text-brand-700">{to}</span> of{" "}
          <span className="numeric font-medium text-brand-700">{total.toLocaleString("en-PH")}</span> records
        </p>
        <form action="/children" method="GET" className="flex items-center gap-1.5">
          {Object.entries(searchParams).map(([key, value]) =>
            key !== "page" && key !== "pageSize" && typeof value === "string" && value ? (
              <input key={key} type="hidden" name={key} value={value} />
            ) : null,
          )}
          <label htmlFor="page-size" className="text-xs text-brand-500">Rows:</label>
          <select
            id="page-size"
            name="pageSize"
            defaultValue={String(pageSize)}
            className="h-7 rounded-md border border-brand-200 bg-white px-1.5 text-xs text-brand-700"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button type="submit" className="text-xs font-medium text-action-700 hover:text-action-800">
            Set
          </button>
        </form>
      </div>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildPageHref(params, page - 1)}
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 bg-white text-brand-600 hover:bg-brand-50"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
        {pageNumbers.map((p) => (
          <Link
            key={p}
            href={buildPageHref(params, p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium",
              p === page
                ? "bg-brand-900 text-white"
                : "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50",
            )}
          >
            {p}
          </Link>
        ))}
        {page < totalPages ? (
          <Link
            href={buildPageHref(params, page + 1)}
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 bg-white text-brand-600 hover:bg-brand-50"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Information cards (privacy / compliance)                                  */
/* -------------------------------------------------------------------------- */

export function RegistryInformationCards() {
  const cards = [
    {
      icon: Database,
      title: "Single Source of Truth",
      body: "Registry figures are computed live from the municipal database — the same records that feed validation, monitoring, and reports.",
    },
    {
      icon: ShieldCheck,
      title: "Record Status Protocol",
      body: "Barangay encoders submit records for LGU validation. Verified records are eligible for QR generation; corrections are routed back to the encoder.",
    },
    {
      icon: Eye,
      title: "Role-Based Access",
      body: "Barangay users see their own barangay's records; LGU and admin users see the full municipality. Disability data is marked restricted in child profiles.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <section
          key={card.title}
          className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-700">
              <card.icon className="h-4 w-4" />
            </span>
            <h3 className="text-[13px] font-semibold text-brand-900">{card.title}</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-brand-500">{card.body}</p>
        </section>
      ))}
    </div>
  );
}
