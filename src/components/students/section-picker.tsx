"use client";

import { useMemo, useState } from "react";
import { Field, Select } from "@/components/ui/field";

/**
 * Dynamic school-year → grade-level → section picker.
 *
 * A section belongs to exactly one (school year, grade level) pair, so the
 * grade-level list is narrowed to the grade levels that actually have sections
 * in the chosen year, and the section list to the sections of the chosen year +
 * grade level. This is a UX convenience only — the same placement is validated
 * again server-side (`checkSectionPlacement`), so a hand-crafted request with a
 * mismatched combination is still rejected.
 *
 * School years / grade levels / sections are supplied by the server already
 * scoped to the account: an Adviser only ever receives the sections they advise.
 */

export type EnrollmentSection = {
  id: string;
  name: string;
  gradeLevelId: string;
  gradeLevelName: string;
  schoolYearId: string;
  schoolYear: string;
  adviserName: string | null;
};

export type EnrollmentOptions = {
  schoolYears: { id: string; year: string; isCurrent: boolean }[];
  gradeLevels: { id: string; name: string }[];
  sections: EnrollmentSection[];
};

export type EnrollmentSelection = {
  schoolYearId: string;
  gradeLevelId: string;
  sectionId: string;
};

const gradeLevelsForYear = (options: EnrollmentOptions, schoolYearId: string) =>
  options.gradeLevels.filter((g) =>
    options.sections.some((s) => s.schoolYearId === schoolYearId && s.gradeLevelId === g.id),
  );

const sectionsFor = (options: EnrollmentOptions, schoolYearId: string, gradeLevelId: string) =>
  options.sections.filter(
    (s) => s.schoolYearId === schoolYearId && s.gradeLevelId === gradeLevelId,
  );

/** The starting selection, auto-filling any level that has exactly one option. */
export function initialSelection(
  options: EnrollmentOptions,
  defaults?: Partial<EnrollmentSelection>,
): EnrollmentSelection {
  const schoolYearId =
    defaults?.schoolYearId ||
    (options.schoolYears.length === 1 ? options.schoolYears[0].id : "");
  const gradeLevels = gradeLevelsForYear(options, schoolYearId);
  const gradeLevelId =
    defaults?.gradeLevelId || (gradeLevels.length === 1 ? gradeLevels[0].id : "");
  const sections = sectionsFor(options, schoolYearId, gradeLevelId);
  const sectionId =
    defaults?.sectionId || (sections.length === 1 ? sections[0].id : "");
  return { schoolYearId, gradeLevelId, sectionId };
}

export type EnrollmentSelectionController = {
  value: EnrollmentSelection;
  schoolYears: { id: string; year: string; isCurrent: boolean }[];
  gradeLevelsForSchoolYear: { id: string; name: string }[];
  sectionsForGradeLevel: EnrollmentSection[];
  selectedSection: EnrollmentSection | null;
  setSchoolYear: (schoolYearId: string) => void;
  setGradeLevel: (gradeLevelId: string) => void;
  setSection: (sectionId: string) => void;
};

/** Owns the selection state and resets the dependent levels when one changes. */
export function useEnrollmentSelection(
  options: EnrollmentOptions,
  defaults?: Partial<EnrollmentSelection>,
): EnrollmentSelectionController {
  const [value, setValue] = useState<EnrollmentSelection>(() =>
    initialSelection(options, defaults),
  );

  const gradeLevels = useMemo(
    () => gradeLevelsForYear(options, value.schoolYearId),
    [options, value.schoolYearId],
  );
  const sections = useMemo(
    () => sectionsFor(options, value.schoolYearId, value.gradeLevelId),
    [options, value.schoolYearId, value.gradeLevelId],
  );
  const selectedSection = useMemo(
    () => options.sections.find((s) => s.id === value.sectionId) ?? null,
    [options, value.sectionId],
  );

  return {
    value,
    schoolYears: options.schoolYears,
    gradeLevelsForSchoolYear: gradeLevels,
    sectionsForGradeLevel: sections,
    selectedSection,
    setSchoolYear: (schoolYearId) => {
      const levels = gradeLevelsForYear(options, schoolYearId);
      const gradeLevelId = levels.length === 1 ? levels[0].id : "";
      const rows = sectionsFor(options, schoolYearId, gradeLevelId);
      setValue({
        schoolYearId,
        gradeLevelId,
        sectionId: rows.length === 1 ? rows[0].id : "",
      });
    },
    setGradeLevel: (gradeLevelId) => {
      const rows = sectionsFor(options, value.schoolYearId, gradeLevelId);
      setValue({
        ...value,
        gradeLevelId,
        sectionId: rows.length === 1 ? rows[0].id : "",
      });
    },
    setSection: (sectionId) => setValue({ ...value, sectionId }),
  };
}

export function SectionPickerFields({
  controller,
  idPrefix = "enroll",
  required = false,
  errors,
  showAdviser = true,
}: {
  controller: EnrollmentSelectionController;
  idPrefix?: string;
  required?: boolean;
  errors?: { schoolYearId?: string; gradeLevelId?: string; sectionId?: string };
  showAdviser?: boolean;
}) {
  const {
    value,
    schoolYears,
    gradeLevelsForSchoolYear,
    sectionsForGradeLevel,
    selectedSection,
  } = controller;
  const noGradeLevels = gradeLevelsForSchoolYear.length === 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="School year"
        htmlFor={`${idPrefix}-sy`}
        required={required}
        error={errors?.schoolYearId}
      >
        <Select
          id={`${idPrefix}-sy`}
          name="schoolYearId"
          value={value.schoolYearId}
          onChange={(e) => controller.setSchoolYear(e.target.value)}
          required={required}
        >
          <option value="" disabled>
            Select…
          </option>
          {schoolYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.year}
              {y.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Grade level"
        htmlFor={`${idPrefix}-gl`}
        required={required}
        error={errors?.gradeLevelId}
        hint={noGradeLevels ? "No sections available for the selected school year." : undefined}
      >
        <Select
          id={`${idPrefix}-gl`}
          name="gradeLevelId"
          value={value.gradeLevelId}
          onChange={(e) => controller.setGradeLevel(e.target.value)}
          required={required}
          disabled={noGradeLevels}
        >
          <option value="" disabled>
            Select…
          </option>
          {gradeLevelsForSchoolYear.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="sm:col-span-2">
        <Field
          label="Section"
          htmlFor={`${idPrefix}-section`}
          required={required}
          error={errors?.sectionId}
          hint={
            value.gradeLevelId && sectionsForGradeLevel.length === 0
              ? "No sections for this grade level and school year."
              : undefined
          }
        >
          <Select
            id={`${idPrefix}-section`}
            name="sectionId"
            value={value.sectionId}
            onChange={(e) => controller.setSection(e.target.value)}
            required={required}
            disabled={sectionsForGradeLevel.length === 0}
          >
            <option value="" disabled>
              Select…
            </option>
            {sectionsForGradeLevel.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        {showAdviser && selectedSection ? (
          <p className="mt-1.5 text-xs text-[#64748B]">
            Adviser:{" "}
            <span className="font-medium text-brand-800">
              {selectedSection.adviserName ?? "None assigned"}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
