import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClass =
  "h-9 w-full rounded-md border border-brand-200 bg-white px-3 text-[13px] text-brand-900 placeholder:text-brand-400 focus:border-action-500 focus:outline-none";

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
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
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

export type PerformanceFilterValues = {
  q: string;
  schoolYear: string;
  gradeLevel: string;
  period: string;
};

export function PerformanceFilters({
  values,
  schoolYears,
  gradeLevels,
  periods,
}: {
  values: PerformanceFilterValues;
  schoolYears: { id: string; year: string }[];
  gradeLevels: { id: string; name: string }[];
  periods: { id: string; name: string; isCurrent: boolean }[];
}) {
  return (
    <form
      action="/performance"
      method="GET"
      className="rounded-lg border border-brand-200 bg-white shadow-xs"
    >
      {/* ------------------------------ Search ------------------------------ */}
      <div className="border-b border-brand-100 px-4 py-3">
        <label htmlFor="performance-search" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
          Search
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400"
          />
          <input
            id="performance-search"
            type="search"
            name="q"
            defaultValue={values.q}
            placeholder="Search subjects by name or code…"
            className={cn(inputClass, "h-10 pl-9")}
          />
        </div>
        <p className="mt-1 text-[10px] text-[#64748B]">
          Matches against subject names and subject codes.
        </p>
      </div>

      {/* ------------------------------ Filters ----------------------------- */}
      <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
        <FilterSelect
          label="School Year"
          id="filter-school-year"
          name="schoolYear"
          value={values.schoolYear}
          allLabel="All School Years (Current)"
          options={schoolYears.map((y) => ({ value: y.id, label: y.year }))}
        />
        <FilterSelect
          label="Grade Level"
          id="filter-grade-level"
          name="gradeLevel"
          value={values.gradeLevel}
          allLabel="All Grade Levels"
          options={gradeLevels.map((g) => ({ value: g.id, label: g.name }))}
        />
        <FilterSelect
          label="Grading Period"
          id="filter-period"
          name="period"
          value={values.period}
          allLabel="All Grading Periods"
          options={periods.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      {/* ----------------------------- Actions ------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/performance"
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

/**
 * Active-filter chips shown under the filter form. Mirrors the registry's
 * `ActiveFilterChips` pattern so the two pages look identical.
 */
export function PerformanceActiveFilterChips({
  filters,
}: {
  filters: { label: string; value: string }[];
}) {
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
      <Link href="/performance" className="text-xs font-medium text-action-700 hover:text-action-800">
        Clear all
      </Link>
    </div>
  );
}
