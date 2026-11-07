"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { saveAssessment } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";
import {
  ASSESSMENT_DOMAIN_LABELS,
  ASSESSMENT_DOMAINS,
  ASSESSMENT_TYPE_PRESETS,
  type AssessmentDomain,
} from "@/lib/constants";
import type { AssessmentLevels } from "@/lib/assessment-levels";

/**
 * One assessment row as rendered by the profile page (the server query
 * shape). Kept local so the component stays independent of the query layer.
 */
export type AssessmentRow = {
  id: string;
  domain: string;
  assessmentType: string | null;
  skillArea: string | null;
  date: string;
  level: string | null;
  score: number | null;
  notes: string | null;
  assessorFirst?: string | null;
  assessorLast?: string | null;
};

function isDomain(value: string): value is AssessmentDomain {
  return (ASSESSMENT_DOMAINS as readonly string[]).includes(value);
}

/**
 * Add / edit form for a Phil-IRI, Literacy or Numeracy assessment.
 *
 * The Language & Literacy Coordinator records these assessments from the
 * learner's profile. The server action (`saveAssessment`) is the authority:
 * it re-checks `assessments.write`, the learner's row scope and that an
 * edited record really belongs to the submitted student. This component only
 * mirrors the validation for immediate feedback.
 *
 * Data loss is explicitly prevented:
 *  - React 19 resets uncontrolled form fields after every action; the
 *    `useFormResetGuard` cancels that reset so a rejected submission keeps
 *    everything the coordinator typed.
 *  - The proficiency level list is re-read whenever the domain changes and a
 *    level that does not belong to the new domain is cleared (never silently
 *    kept as an invalid value).
 */
export function AssessmentForm({
  studentId,
  levels,
  assessment,
  submitLabel,
  onCancel,
  onSaved,
}: {
  studentId: string;
  levels: AssessmentLevels;
  /** Present → the form edits this existing record instead of creating one. */
  assessment?: AssessmentRow;
  submitLabel?: string;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const { formRef, onReset } = useFormResetGuard();
  const uid = useId().replace(/:/g, "");
  const [state, formAction, pending] = useActionState(saveAssessment, {
    ok: false,
    error: "",
  });

  const initialDomain = assessment?.domain && isDomain(assessment.domain)
    ? assessment.domain
    : "reading";
  const [domain, setDomain] = useState<AssessmentDomain>(initialDomain);
  const [level, setLevel] = useState(assessment?.level ?? "");

  useEffect(() => {
    if (state.ok) onSaved?.();
    // `onSaved` is intentionally not a dependency: the caller passes an
    // inline callback and we only want to react to a NEW action result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const domainLevels = levels[domain] ?? [];

  function handleDomainChange(next: AssessmentDomain) {
    setDomain(next);
    // A level that is not offered for the new domain would be rejected by the
    // form's own rules — clear it instead of keeping an invalid selection.
    if (level && !(levels[next] ?? []).includes(level)) setLevel("");
  }

  const fieldError = (name: string) =>
    state.ok === false ? state.fieldErrors?.[name] : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      onReset={onReset}
      className="space-y-3 rounded-md border border-brand-100 bg-brand-50/40 p-3"
    >
      {assessment ? <input type="hidden" name="id" value={assessment.id} /> : null}
      <input type="hidden" name="studentId" value={studentId} />

      {state.ok === false && state.error ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p role="status" className="text-xs font-medium text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Domain"
          htmlFor={`${uid}-domain`}
          required
          error={fieldError("domain")}
          hint="Reading (Phil-IRI), Literacy or Numeracy."
        >
          <Select
            id={`${uid}-domain`}
            name="domain"
            value={domain}
            onChange={(e) => handleDomainChange(e.target.value as AssessmentDomain)}
          >
            {ASSESSMENT_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {ASSESSMENT_DOMAIN_LABELS[d]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Assessment type"
          htmlFor={`${uid}-type`}
          error={fieldError("assessmentType")}
          hint="e.g. Phil-IRI, Literacy Assessment, Numeracy Assessment."
        >
          <Input
            id={`${uid}-type`}
            name="assessmentType"
            list={`${uid}-type-presets`}
            defaultValue={assessment?.assessmentType ?? ""}
            maxLength={60}
            placeholder="Phil-IRI"
          />
          <datalist id={`${uid}-type-presets`}>
            {ASSESSMENT_TYPE_PRESETS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Assessment date"
          htmlFor={`${uid}-date`}
          required
          error={fieldError("date")}
        >
          <Input
            id={`${uid}-date`}
            name="date"
            type="date"
            required
            defaultValue={assessment?.date ?? new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Field
          label="Proficiency level"
          htmlFor={`${uid}-level`}
          error={fieldError("level")}
          hint={
            domainLevels.length
              ? "Configured in Settings → assessment levels."
              : undefined
          }
        >
          <Select
            id={`${uid}-level`}
            name="level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Not recorded</option>
            {domainLevels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Score (optional)"
          htmlFor={`${uid}-score`}
          error={fieldError("score")}
          hint="0–100, when the instrument is scored numerically."
        >
          <Input
            id={`${uid}-score`}
            name="score"
            type="number"
            min={0}
            max={100}
            step="0.01"
            inputMode="decimal"
            defaultValue={assessment?.score ?? ""}
          />
        </Field>

        <Field
          label="Skill area (optional)"
          htmlFor={`${uid}-skill`}
          error={fieldError("skillArea")}
        >
          <Input
            id={`${uid}-skill`}
            name="skillArea"
            defaultValue={assessment?.skillArea ?? ""}
            maxLength={60}
            placeholder="e.g. Reading comprehension"
          />
        </Field>
      </div>

      <Field
        label="Notes (optional)"
        htmlFor={`${uid}-notes`}
        error={fieldError("notes")}
      >
        <Textarea
          id={`${uid}-notes`}
          name="notes"
          rows={2}
          maxLength={300}
          defaultValue={assessment?.notes ?? ""}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending
            ? "Saving…"
            : submitLabel ?? (assessment ? "Save changes" : "Save assessment")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
