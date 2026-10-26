"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Lock, RotateCcw, Save, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/states";
import { collectGradeIssues } from "@/lib/grade-validation";
import type { GradeSheetRow } from "@/lib/grades";
import { removeSectionGrade, reopenSectionGradeSheet, saveSectionGradeDraft, submitSectionGradeSheet } from "@/actions/grades";
import type { ActionState } from "@/actions/helpers";

const inputClass =
  "h-8 w-20 rounded-md border border-brand-200 bg-white px-2 text-right text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500 disabled:cursor-not-allowed disabled:border-brand-100 disabled:bg-brand-100 disabled:text-[#64748B]";

type Values = Record<string, string>;

const GRADE_STATUS_BADGES = {
  submitted: { label: "Submitted", className: "bg-emerald-100 text-emerald-800" },
  draft: { label: "Draft", className: "bg-action-100 text-action-800" },
  not_started: { label: "Not started", className: "bg-brand-100 text-[#64748B]" },
  unsaved: { label: "Unsaved", className: "bg-amber-100 text-amber-800" },
  invalid: { label: "Invalid", className: "bg-red-100 text-red-800" },
} as const;

type RowBadge = keyof typeof GRADE_STATUS_BADGES;

export type SheetContext = {
  sectionId: string;
  subjectId: string;
  gradingPeriodId: string;
  subjectName: string;
  periodName: string;
  sectionName: string;
  schoolYear: string;
  gradeLevelName: string;
  editable: boolean;
  /** latest ledger row is a submission → the sheet is locked until reopened */
  locked: boolean;
};

function draftOrSubmitted(row: GradeSheetRow): string {
  if (row.draftGrade !== null) return String(row.draftGrade);
  if (row.submittedGrade !== null) return String(row.submittedGrade);
  return "";
}

function lockedRow(row: GradeSheetRow): boolean {
  return row.draftGrade === null && row.submittedGrade !== null;
}

/**
 * Grade data-entry sheet for one section × subject × grading period.
 *
 * Drafts are staged locally (dirty tracking, Enter-to-next-student) and
 * persisted with "Save Draft"; "Submit" validates completeness and asks the
 * adviser to explicitly confirm students without a grade (e.g. transferred)
 * before the submission lock takes effect.
 */
export function GradeSheetPanel({ context, rows }: { context: SheetContext; rows: GradeSheetRow[] }) {
  const { editable, locked } = context;
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, draftOrSubmitted(r)])),
  );
  const [removing, setRemoving] = useState<string | null>(null);

  const [saveState, saveAction, saving] = useActionState<ActionState, void>(
    () => saveSectionGradeDraft(buildPayload(values, rows, context)),
    { ok: true, message: undefined },
  );
  const [submitState, submitActionFn, submitting] = useActionState<SubmitResult, void>(
    () => runSubmit(values, rows, context),
    { ok: true },
  );

  const dirty = useMemo(
    () => rows.some((r) => (values[r.studentId] ?? "") !== draftOrSubmitted(r)),
    [values, rows],
  );

  // Unsaved-change protection (never blocks server navigation, only reloads).
  useEffect(() => {
    if (!editable || locked) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = ""; // legacy Chromium support
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, editable, locked]);

  if (rows.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-sm font-semibold text-brand-800">No active students in this section</p>
          <p className="mt-1 text-xs text-[#64748B]">
            Students appear here once they are actively enrolled in this section for {context.schoolYear}.
          </p>
        </CardBody>
      </Card>
    );
  }

  const statusFor = (row: GradeSheetRow, value: string): RowBadge => {
    if (!editable) {
      if (value === "") return "not_started";
      return row.draftGrade !== null ? "draft" : "submitted";
    }
    if (value === "") return draftOrSubmitted(row) === "" ? "not_started" : "not_started";
    const n = Number(value);
    if (!Number.isFinite(n) || n < 60 || n > 100) return "invalid";
    if (value !== draftOrSubmitted(row)) return "unsaved";
    if (row.draftGrade !== null) return "draft";
    if (row.submittedGrade !== null) return "submitted";
    return "not_started";
  };

  return (
    <Card>
      <CardHeader
        title={`${context.subjectName} — ${context.periodName}`}
        description={`${rows.length} student${rows.length === 1 ? "" : "s"} · drafts persist across sessions`}
        actions={
          editable ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveAction()}
                disabled={saving || submitting || !dirty || locked}
              >
                {saving ? <Spinner className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                Save Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => submitActionFn()}
                disabled={saving || submitting || locked}
              >
                {submitting ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                Submit Grades
              </Button>
            </div>
          ) : (
            <Badge className="bg-brand-100 text-[#64748B]">Read-only</Badge>
          )
        }
      />

      <CardBody className="p-0">
        {!editable && (
          <p className="border-b border-brand-100 bg-brand-50 px-4 py-2 text-xs text-brand-700">
            Only the section adviser (Teacher) can encode or modify grades here. You are viewing the
            submitted grades.
          </p>
        )}
        {editable && locked && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-100 bg-emerald-50 px-4 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
              These grades were submitted. Reopen to make corrections (recorded in the audit log).
            </span>
            <ReopenButton context={context} />
          </div>
        )}

        {saveState.ok === false ? (
          <p role="alert" className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {saveState.error}
          </p>
        ) : saveState.message ? (
          <p role="status" className="flex items-start gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {saveState.message}
          </p>
        ) : null}

        {submitState.ok === false && (
          <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
            <p className="flex items-start gap-2 font-medium">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {submitState.error}
            </p>
            {submitState.issues && submitState.issues.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 pl-7">
                {submitState.issues.slice(0, 10).map((i, idx) => (
                  <li key={`${i.studentName}-${idx}`}>
                    <span className="font-medium">{i.studentName}</span> — {i.detail}
                    {i.kind === "invalid" ? " (invalid grade)" : ""}
                  </li>
                ))}
                {submitState.issues.length > 10 ? (
                  <li>…and {submitState.issues.length - 10} more.</li>
                ) : null}
              </ul>
            )}
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm" style={{ minWidth: 660 }}>
            <thead>
              <tr>
                <th scope="col" className="border-b border-[#DCE4F0] bg-[#EEF4FF]/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#14295F]">
                  #
                </th>
                <th scope="col" className="border-b border-[#DCE4F0] bg-[#EEF4FF]/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#14295F]">
                  Student No.
                </th>
                <th scope="col" className="border-b border-[#DCE4F0] bg-[#EEF4FF]/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#14295F]">
                  Student Name
                </th>
                <th scope="col" className="border-b border-[#DCE4F0] bg-[#EEF4FF]/40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-[#14295F]">
                  Grade (60–100)
                </th>
                <th scope="col" className="border-b border-[#DCE4F0] bg-[#EEF4FF]/40 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-[#14295F]">
                  Status
                </th>
                <th scope="col" className="w-10 border-b border-[#DCE4F0] bg-[#EEF4FF]/40 px-2 py-2.5">
                  <span className="sr-only">Clear draft</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {rows.map((row, idx) => {
                const value = values[row.studentId] ?? "";
                const badge = statusFor(row, value);
                return (
                  <tr key={row.studentId} className="transition-colors hover:bg-brand-50/70">
                    <td className="numeric px-4 py-2 text-xs text-[#64748B]">{idx + 1}</td>
                    <td className="numeric px-4 py-2 text-[13px] text-[#64748B]">{row.studentNumber}</td>
                    <td className="break-words px-4 py-2 text-[13px] font-medium text-brand-900">
                      {row.studentName}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editable ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          min={60}
                          max={100}
                          step={1}
                          value={value}
                          disabled={locked}
                          aria-label={`Grade for ${row.studentName}`}
                          aria-invalid={badge === "invalid"}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [row.studentId]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const inputs = Array.from(
                                document.querySelectorAll<HTMLInputElement>("input[data-grade-input]"),
                              );
                              inputs[inputs.indexOf(e.currentTarget) + 1]?.focus();
                              e.preventDefault();
                            }
                          }}
                          data-grade-input=""
                          className={inputClass}
                          placeholder="—"
                        />
                      ) : (
                        <span className="numeric text-[13px] font-semibold text-brand-900">
                          {value === "" ? "—" : value}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Badge className={cn(GRADE_STATUS_BADGES[badge].className)}>
                        {GRADE_STATUS_BADGES[badge].label}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      {editable && row.draftGrade !== null ? (
                        <button
                          type="button"
                          title="Remove this draft"
                          aria-label={`Clear draft grade for ${row.studentName}`}
                          disabled={removing === row.studentId}
                          onClick={async () => {
                            setRemoving(row.studentId);
                            const res = await removeSectionGrade({
                              studentId: row.studentId,
                              subjectId: context.subjectId,
                              gradingPeriodId: context.gradingPeriodId,
                            });
                            setRemoving(null);
                            if (res.ok) setValues((prev) => ({ ...prev, [row.studentId]: "" }));
                          }}
                          className="rounded p-1 text-[#64748B] transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        >
                          {removing === row.studentId ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function buildPayload(
  values: Values,
  rows: GradeSheetRow[],
  context: SheetContext,
): Parameters<typeof saveSectionGradeDraft>[0] {
  return {
    sectionId: context.sectionId,
    subjectId: context.subjectId,
    gradingPeriodId: context.gradingPeriodId,
    entries: rows
      .filter((r) => !lockedRow(r) && (values[r.studentId] ?? "") !== "")
      .map((r) => ({ studentId: r.studentId, grade: Number(values[r.studentId]) })),
  };
}

type SubmitResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      issues?: { kind: "missing" | "invalid"; studentName: string; detail: string }[];
    };

async function runSubmit(
  values: Values,
  rows: GradeSheetRow[],
  context: SheetContext,
): Promise<SubmitResult> {
  const roster = rows.map((r) => ({ studentId: r.studentId, studentName: r.studentName }));
  const entries = rows
    .filter((r) => !lockedRow(r))
    .map((r) => ({
      studentId: r.studentId,
      grade: (values[r.studentId] ?? "") === "" ? null : Number(values[r.studentId]),
    }));

  const localIssues = collectGradeIssues(roster, entries);
  const invalid = localIssues.filter((i) => i.kind === "invalid");
  if (invalid.length > 0) {
    return {
      ok: false,
      error: invalid.length === 1 ? `Fix the invalid grade before submitting: ${invalid[0].detail}.` : "Fix the invalid grade values before submitting.",
      issues: invalid.map((i) => ({ kind: "invalid" as const, studentName: i.studentName, detail: i.detail })),
    };
  }

  const missing = localIssues.filter((i) => i.kind === "missing");
  if (missing.length > 0) {
    const list = missing.map((i) => `• ${i.studentName}`).join("\n");
    const question =
      missing.length === 1
        ? `${missing[0].studentName} has no grade entered.`
        : `${missing.length} students have no grade entered:\n${list}`;
    const confirmed = window.confirm(
      `${question}\n\nSubmit anyway (explicit confirmation, e.g. the student left mid-quarter)?\nChoose Cancel to continue encoding.`,
    );
    if (!confirmed) {
      return {
        ok: false,
        error: `${missing.length} student${missing.length === 1 ? " still needs" : "s still need"} a grade before submission.`,
        issues: missing.map((i) => ({ kind: "missing" as const, studentName: i.studentName, detail: i.detail })),
      };
    }
  }

  const res = await submitSectionGradeSheet({
    sectionId: context.sectionId,
    subjectId: context.subjectId,
    gradingPeriodId: context.gradingPeriodId,
    missingConfirmed: missing.map((i) => i.studentId),
  });
  if (!res.ok) return { ok: false, error: res.error };
  window.alert(
    `Submitted — ${res.submitted} grade${res.submitted === 1 ? "" : "s"} recorded for ${res.roster} students` +
      (res.missingConfirmed > 0 ? ` (${res.missingConfirmed} confirmed without a grade).` : "."),
  );
  return { ok: true };
}

function ReopenButton({ context }: { context: SheetContext }) {
  const [state, action, loading] = useActionState<ActionState, void>(
    () => reopenSectionGradeSheet(context),
    { ok: true },
  );
  return (
    <button type="button" onClick={() => action()} disabled={loading} className={buttonStyles("outline", "sm")}>
      {loading ? <Spinner className="h-3.5 w-3.5" /> : <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />}
      Reopen for Correction
      {state.ok === false ? (
        <span className="sr-only" role="alert">
          {state.error}
        </span>
      ) : null}
    </button>
  );
}
