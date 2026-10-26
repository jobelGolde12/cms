"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500 disabled:bg-brand-100 disabled:text-[#64748B]";

function FilterSelect({
  label,
  id,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export type FilterSection = {
  id: string;
  name: string;
  gradeLevelId: string;
  gradeLevelName: string;
  gradeLevelOrder: number;
  schoolYearId: string;
  schoolYear: string;
  editable: boolean;
  /** true → the user advises this section (may encode every subject) */
  advisory?: boolean;
};

/**
 * Grade-sheet context selector.
 *
 * The full option set is precomputed server-side (no client data fetching);
 * changes navigate the server component via URL search params, so the roster,
 * grades and lock state are always fetched fresh from the database with the
 * correct academic context.
 */
export function GradeSheetFilters({
  sections,
  subjects,
  /**
   * Optional restriction map: for departmental sections the subject dropdown
   * only offers the teacher's assigned subject ids; sections absent from the
   * map (advisory or read-only views) offer every subject.
   */
  subjectsBySection,
  periods,
  selected,
}: {
  sections: FilterSection[];
  subjects: { id: string; name: string; code: string }[];
  subjectsBySection?: Record<string, string[]>;
  /** grading periods grouped by school year id (covers every candidate year) */
  periods: { schoolYearId: string; id: string; name: string; isCurrent: boolean }[];
  selected: {
    yearId: string;
    gradeLevelId: string;
    sectionId: string;
    subjectId: string;
    periodId: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selectedSection = sections.find((s) => s.id === selected.sectionId);
  const effectiveYearId = selectedSection?.schoolYearId ?? selected.yearId;

  /** URL search-param keys (independent of the resolved `selected` shape). */
  const update = (patch: {
    sy?: string;
    level?: string;
    section?: string;
    subject?: string;
    period?: string;
  }) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => {
      router.push(`/grades?${next.toString()}`, { scroll: false });
    });
  };

  // Sections visible for the effective year; a grade-level choice narrows further.
  const yearSections = sections.filter((s) => s.schoolYearId === effectiveYearId);
  const levelOptions = Array.from(
    new Map(
      [...yearSections]
        .sort((a, b) => a.gradeLevelOrder - b.gradeLevelOrder)
        .map((s) => [s.gradeLevelId, s.gradeLevelName]),
    ).entries(),
  ).map(([value, label]) => ({ value, label }));
  const visibleSections = selected.gradeLevelId
    ? yearSections.filter((s) => s.gradeLevelId === selected.gradeLevelId)
    : yearSections;
  const sectionOptions = visibleSections.map((s) => ({
    value: s.id,
    label: s.advisory ? `${s.name} · advises` : s.editable ? `${s.name} · assigned` : s.name,
  }));

  // Departmental sections only allow their assigned subjects.
  const allowedSubjectIds = selected.sectionId
    ? subjectsBySection?.[selected.sectionId]
    : undefined;
  const subjectOptions = (
    allowedSubjectIds ? subjects.filter((s) => allowedSubjectIds.includes(s.id)) : subjects
  ).map((s) => ({ value: s.id, label: s.name }));

  const periodOptions = periods
    .filter((p) => p.schoolYearId === effectiveYearId)
    .map((p) => ({ value: p.id, label: p.name + (p.isCurrent ? " (current)" : "") }));

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs sm:grid-cols-3 lg:grid-cols-5",
        pending && "opacity-70",
      )}
      aria-busy={pending}
    >
      <FilterSelect
        label="School Year"
        id="gs-year"
        value={selectedSection ? selectedSection.schoolYearId : selected.yearId}
        onChange={(v) => {
          // Changing the year resets the level + section + period context.
          const firstSection = sections.find((s) => s.schoolYearId === v);
          const allowed = firstSection ? subjectsBySection?.[firstSection.id] : undefined;
          const subjectFallback =
            allowed && !allowed.includes(selected.subjectId) ? (allowed[0] ?? "") : selected.subjectId;
          update({
            sy: v,
            level: "",
            section: firstSection?.id ?? "",
            subject: subjectFallback,
            period: periods.find((p) => p.schoolYearId === v && p.isCurrent)?.id ?? "",
          });
        }}
        options={Array.from(
          new Map(sections.map((s) => [s.schoolYearId, s.schoolYear])).entries(),
        )
          .map(([value, label]) => ({ value, label }))}
      />
      <FilterSelect
        label="Grade Level"
        id="gs-level"
        value={selected.gradeLevelId}
        onChange={(v) => {
          const first = yearSections.find((s) => s.gradeLevelId === v);
          const allowed = first ? subjectsBySection?.[first.id] : undefined;
          const subjectFallback =
            allowed && !allowed.includes(selected.subjectId) ? (allowed[0] ?? "") : selected.subjectId;
          update({ level: v, section: first?.id ?? "", subject: subjectFallback });
        }}
        options={levelOptions.length > 0 ? levelOptions : [{ value: "", label: "— no sections —" }]}
      />
      <FilterSelect
        label="Section"
        id="gs-section"
        value={selected.sectionId}
        onChange={(v) => {
          const section = sections.find((s) => s.id === v);
          const allowed = v ? subjectsBySection?.[v] : undefined;
          // Switching into a departmental section whose subject list does not
          // include the currently picked subject falls back to its first one.
          const subjectFallback =
            allowed && !allowed.includes(selected.subjectId) ? (allowed[0] ?? "") : selected.subjectId;
          update({
            section: v,
            subject: subjectFallback,
            period: section ? (periods.find((p) => p.schoolYearId === section.schoolYearId && p.isCurrent)?.id ?? "") : "",
          });
        }}
        options={sectionOptions.length > 0 ? sectionOptions : [{ value: "", label: "— no sections —" }]}
      />
      <FilterSelect
        label="Subject"
        id="gs-subject"
        value={selected.subjectId}
        onChange={(v) => update({ subject: v })}
        options={subjectOptions.length > 0 ? subjectOptions : [{ value: "", label: "— none assigned —" }]}
      />
      <FilterSelect
        label="Grading Period"
        id="gs-period"
        value={selected.periodId}
        onChange={(v) => update({ period: v })}
        options={periodOptions.length > 0 ? periodOptions : [{ value: "", label: "— none —" }]}
      />
    </div>
  );
}
