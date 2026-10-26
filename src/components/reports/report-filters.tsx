import Link from "next/link";
import { listGradeLevels, listSchoolYears, listSections, listSubjects, listGradingPeriods } from "@/lib/queries";

/**
 * Server-side report filter state. Reports apply filters in SQL (backend
 * queries) — this component only renders the pre-fetched option set; the
 * detail page turns them into `buildReport` params, so section filtering
 * affects the database query rather than filtering loaded data client-side.
 */
export type ReportFilterValues = {
  sy?: string;
  gradeLevel?: string;
  section?: string;
  subject?: string;
  period?: string;
};

export async function resolveReportFilterValues(sp: Record<string, string | string[] | undefined>): Promise<ReportFilterValues> {
  const one = (key: string): string | undefined => {
    const v = sp[key];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  return {
    sy: one("sy"),
    gradeLevel: one("gradeLevel"),
    section: one("section"),
    subject: one("subject"),
    period: one("period"),
  };
}

export async function resolveReportQuery(params: ReportFilterValues) {
  // Periods must belong to the selected school year; sections narrowed by grade level.
  const [years, gradeLevels, allSections, subjects] = await Promise.all([
    listSchoolYears(),
    listGradeLevels(),
    listSections(),
    listSubjects(),
  ]);

  const yearId = params.sy ?? years.find((y) => y.isCurrent)?.id ?? years[0]?.id ?? "";
  const periods = await listGradingPeriods(yearId);

  const selected: { label: string; value: string }[] = [];
  if (params.sy) selected.push({ label: "SY", value: years.find((y) => y.id === params.sy)?.year ?? "" });
  if (params.gradeLevel)
    selected.push({ label: "Grade", value: gradeLevels.find((g) => g.id === params.gradeLevel)?.name ?? "" });
  if (params.section)
    selected.push({ label: "Section", value: allSections.find((s) => s.id === params.section)?.name ?? "" });
  if (params.subject)
    selected.push({ label: "Subject", value: subjects.find((s) => s.id === params.subject)?.name ?? "" });
  if (params.period)
    selected.push({ label: "Period", value: periods.find((p) => p.id === params.period)?.name ?? "" });

  return { years, gradeLevels, sections: allSections, subjects, periods, yearId, selected };
}

/** Server-rendered GET filter form for the report pages (no client JS needed). */
export function ReportFilterForm({
  action,
  values,
  years,
  gradeLevels,
  sections,
  subjects,
  periods,
}: {
  action: string;
  values: ReportFilterValues;
  years: { id: string; year: string; isCurrent: boolean }[];
  gradeLevels: { id: string; name: string }[];
  sections: { id: string; name: string; gradeLevelId: string; gradeLevelName: string }[];
  subjects: { id: string; name: string }[];
  periods: { id: string; name: string }[];
}) {
  const inputClass =
    "h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none";

  const select = (id: string, name: string, value: string | undefined, allLabel: string, options: { value: string; label: string }[]) => (
    <div key={name} className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
        {allLabel}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} className={inputClass}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      action={action}
      method="GET"
      className="rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {select("rpt-year", "sy", values.sy, "School Year", years.map((y) => ({ value: y.id, label: y.year + (y.isCurrent ? " (current)" : "") })))}
        {select("rpt-grade", "gradeLevel", values.gradeLevel, "Grade Level", gradeLevels.map((g) => ({ value: g.id, label: g.name })))}
        {select(
          "rpt-section",
          "section",
          values.section,
          "Section",
          sections.map((s) => ({ value: s.id, label: `${s.gradeLevelName} — ${s.name}` })),
        )}
        {select("rpt-subject", "subject", values.subject, "Subject", subjects.map((s) => ({ value: s.id, label: s.name })))}
        <div className="min-w-0">
          <label htmlFor="rpt-period" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
            Grading Period
          </label>
          <PeriodSelect periods={periods} value={values.period ?? ""} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-action-700 px-4 text-[13px] font-medium text-white transition-colors hover:bg-action-800"
        >
          Apply Filters
        </button>
        <Link href={action} className="text-xs font-medium text-action-700 hover:text-action-800">
          Reset
        </Link>
        <span className="ml-auto text-[10px] text-[#64748B]">
          Filters run in the database query — never as client-side row filtering.
        </span>
      </div>
    </form>
  );
}

function PeriodSelect({ periods, value }: { periods: { id: string; name: string }[]; value: string }) {
  return (
    <select
      id="rpt-period"
      name="period"
      defaultValue={value}
      className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none"
    >
      <option value="">All</option>
      {periods.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
