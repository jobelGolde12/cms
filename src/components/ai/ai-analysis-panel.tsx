"use client";

import { useActionState, useState } from "react";
import { ClipboardCheck, PanelTop, RotateCcw, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AiActionState, Feature } from "@/actions/ai";
import type {
  DashboardReportSummaryResult,
  DuplicateEvidenceResult,
  GuidanceCaseSummaryResult,
  GuidanceDraftNoteResult,
  InterventionSuggestionsResult,
  PerformanceAnalysisResult,
  StudentSummaryResult,
} from "@/lib/ai/schemas";

/**
 * Shared AI decision-support panel.
 *
 * Presentation rules (plan §11 / §19): the AI panel uses the system's own
 * card/button/spacing primitives — no AI-branded gradients, no chat bubbles,
 * no decorative animations. Facts are rendered verbatim from the server's
 * computed `facts` array (authoritative), and every AI narrative block is
 * visually grouped and labelled as AI-generated interpretation.
 *
 * Behavior:
 *  - the trigger button disables itself while generating (no double submits);
 *  - errors replace the panel content silently-safe (no stack traces);
 *  - regenerate re-runs the action; discard collapses the panel;
 *  - the narrative can be freely edited/here in place (client-side only —
 *    nothing is persisted anywhere by this component).
 */

const cardClasses = "rounded-lg border border-brand-200 bg-white shadow-xs";

const INTERPRETATION_LABELS: Record<Feature, string> = {
  studentSummary: "AI interpretation",
  performance: "AI performance analysis",
  guidanceCase: "AI case summary",
  guidanceNote: "AI draft (review before use)",
  suggestions: "AI-suggested strategies — review before acting",
  duplicateEvidence: "AI evidence explanation (not a decision)",
  dashboardReport: "AI narrative summary",
};

const HINTS: Partial<Record<Feature, string>> = {
  studentSummary:
    "Generated from the records you are authorized to see. Review before relying on it; it is not part of the student record.",
  guidanceNote:
    "Copy or edit this draft into the follow-up field above — it is not saved as part of the incident until you confirm it in the form.",
  suggestions:
    "Suggestions are possibilities to consider with your team, not decisions. Creating interventions remains a manual action.",
  duplicateEvidence:
    "The AI explains indicator agreement only. Record any merge/mark decision yourself through the standard review buttons.",
};

type ResultShape =
  | StudentSummaryResult
  | PerformanceAnalysisResult
  | GuidanceCaseSummaryResult
  | GuidanceDraftNoteResult
  | InterventionSuggestionsResult
  | DuplicateEvidenceResult
  | DashboardReportSummaryResult;

function byDomain(feature: Feature, result: ResultShape): { label: string; text: string }[] {
  if (feature === "studentSummary") {
    const r = result as StudentSummaryResult;
    const sections: [string, string | null][] = [
      ["Academic", r.academic],
      ["Attendance", r.attendance],
      ["Behavior", r.behavior],
      ["Literacy / Numeracy", r.literacyNumeracy],
      ["Interventions", r.interventions],
    ];
    return sections
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([label, text]) => ({ label, text }));
  }
  if (feature === "performance") {
    const r = result as PerformanceAnalysisResult;
    return r.trends.map((t) => ({
      label: `${t.subject} — ${t.direction}`,
      text: t.detail,
    }));
  }
  if (feature === "guidanceNote") {
    const r = result as GuidanceDraftNoteResult;
    return [{ label: "Draft follow-up note", text: r.draftNote }];
  }
  if (feature === "duplicateEvidence") {
    const r = result as DuplicateEvidenceResult;
    return [{ label: "Explanation", text: r.explanation }, { label: "Closing note", text: r.conclusionNote }];
  }
  if (feature === "guidanceCase") {
    const r = result as GuidanceCaseSummaryResult;
    return [{ label: "Summary", text: r.summary }];
  }
  if (feature === "suggestions") {
    const r = result as InterventionSuggestionsResult;
    return r.suggestions.map((s) => ({ label: `${s.area}`, text: s.strategy }));
  }
  const r = result as DashboardReportSummaryResult;
  const dashboardSections = [
    r.headline ? { label: "Headline", text: r.headline } : null,
    ...r.paragraphs.map((p, i) => ({ label: `Observation ${i + 1}`, text: p })),
  ].filter((entry): entry is { label: string; text: string } => entry !== null);
  return dashboardSections;
}

function bulletsOf(feature: Feature, result: ResultShape): string[] {
  if (feature === "guidanceNote") return (result as GuidanceDraftNoteResult).considerations ?? [];
  if (feature === "guidanceCase") return (result as GuidanceCaseSummaryResult).openPoints ?? [];
  if (feature === "performance") {
    const supportNote = (result as PerformanceAnalysisResult).supportNote;
    return supportNote ? [supportNote] : [];
  }
  if (feature === "studentSummary") return (result as StudentSummaryResult).followUpConsiderations ?? [];
  if (feature === "suggestions") {
    return (result as InterventionSuggestionsResult).suggestions.map((s) => s.rationale);
  }
  if (feature === "duplicateEvidence") return (result as DuplicateEvidenceResult).matchingEvidence ?? [];
  return (result as DashboardReportSummaryResult).notableObservations ?? [];
}

function narrativeOf(feature: Feature, result: ResultShape): string {
  if (feature === "studentSummary") return (result as StudentSummaryResult).overview;
  if (feature === "performance") return (result as PerformanceAnalysisResult).analysis;
  if (feature === "guidanceCase") {
    const r = result as GuidanceCaseSummaryResult;
    return [r.summary, ...r.recurringPatterns.map((p) => `Pattern: ${p}`)].join("\n");
  }
  if (feature === "guidanceNote") return (result as GuidanceDraftNoteResult).draftNote;
  if (feature === "duplicateEvidence") return (result as DuplicateEvidenceResult).explanation;
  if (feature === "suggestions") return (result as InterventionSuggestionsResult).summary;
  return (result as DashboardReportSummaryResult).paragraphs.join("\n\n");
}

export function AiAnalysisPanel({
  action,
  hidden,
  triggerLabel,
  pendingLabel,
  feature,
  className,
}: {
  action: (state: AiActionState, formData: FormData) => Promise<AiActionState>;
  hidden: Record<string, string>;
  triggerLabel: string;
  pendingLabel: string;
  feature: Feature;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false, error: "", retryable: false } as AiActionState);

  // In-place edits/dismissals are keyed to the generation that produced them:
  // a regenerate (new `generatedAt`) implicitly restores the fresh narrative
  // and re-opens the panel — no effects needed.
  const [edit, setEdit] = useState<{ at: string; text: string } | null>(null);
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);
  const result = state.ok ? (state.result as ResultShape) : null;
  const generatedAt = state.ok ? state.generatedAt : "";
  const draftText = result && edit && edit.at === generatedAt ? edit.text : null;

  return (
    <div className={className}>
      <form action={formAction}>
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={cn(buttonStyles("outline", "sm"))}
        >
          <ClipboardCheck aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
          {pending ? pendingLabel : triggerLabel}
        </button>
      </form>

      {!pending && !state.ok && "error" in state && (state as { error?: string }).error ? (
        <p role="alert" className="mt-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900">
          {(state as { error: string }).error}
        </p>
      ) : null}

      {pending ? (
        <div className={cn(cardClasses, "mt-3 px-4 py-4")}>
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-brand-300 border-t-transparent" aria-hidden="true" />
            <span aria-live="polite">{pendingLabel}</span>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="mt-3 h-3 animate-pulse rounded bg-brand-100" style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
      ) : null}

      {!pending && state.ok && result && dismissedAt !== state.generatedAt ? (
        <div
          tabIndex={-1}
          aria-label="AI decision support panel"
          className={cn(cardClasses, "mt-3 outline-none")}
        >
          <div className="flex items-start justify-between gap-2 border-b border-brand-100 px-4 py-3">
            <div className="flex items-start gap-2">
              <PanelTop aria-hidden="true" className="mt-0.5 h-4 w-4 text-brand-500" />
              <div>
                <h3 className="text-[13px] font-semibold text-brand-900">{INTERPRETATION_LABELS[feature]}</h3>
                <p className="mt-0.5 max-w-xl text-[11px] text-[#64748B]">{HINTS[feature]}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                result.confidence === "high" ? "bg-action-100 text-action-800" : result.confidence === "medium" ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-800",
              )}>
                {result.confidence} confidence
              </span>
              <button
                type="button"
                onClick={() => setDismissedAt(state.generatedAt)}
                aria-label="Discard summary"
                className="rounded p-1 text-[#64748B] transition-colors hover:bg-brand-100 hover:text-brand-900"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-4 px-4 py-3">
            {/* ---- Authoritative, server-computed facts ---- */}
            {state.facts.length > 0 ? (
              <section aria-label="Database facts (verified)">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">
                  Database facts (verified from records)
                </h4>
                <ul className="mt-1.5 space-y-1 text-xs text-brand-700">
                  {state.facts.map((fact, i) => (
                    <li key={i} className="leading-relaxed">{fact}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ---- AI interpretation ---- */}
            <section aria-label="AI-generated interpretation">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">
                  AI-generated (review before use)
                </h4>
                <div className="flex gap-1.5">
                  {draftText === null ? (
                    <button
                      type="button"
                      onClick={() => setEdit({ at: state.generatedAt, text: narrativeOf(feature, result) })}
                      className={cn(buttonStyles("ghost", "sm"), "h-6 px-2 text-[11px]")}
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEdit(null)}
                      className={cn(buttonStyles("ghost", "sm"), "h-6 px-2 text-[11px]")}
                    >
                      Restore original
                    </button>
                  )}
                </div>
              </div>

              {draftText === null ? (
                <div className="space-y-2.5">
                  {byDomain(feature, result).map((block, i) => (
                    <div key={i} className="rounded-md border border-brand-100 bg-white px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-brand-400">{block.label}</p>
                      <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-brand-800">{block.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <label className="mt-2 block">
                  <span className="sr-only">Edited narrative</span>
                  <textarea
                    value={draftText}
                    onChange={(e) => setEdit({ at: state.generatedAt, text: e.target.value })}
                    rows={8}
                    className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-xs leading-relaxed text-brand-800 focus:border-action-500 focus:outline-none"
                  />
                </label>
              )}
            </section>

            {/* ---- Bullets: findings / considerations / evidence ---- */}
            {bulletsOf(feature, result).length > 0 ? (
              <section aria-label="Findings and considerations">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">
                  {feature === "duplicateEvidence"
                    ? "Matching evidence"
                    : feature === "suggestions" || feature === "guidanceNote" || feature === "guidanceCase"
                      ? "Considerations"
                      : "Key findings"}
                </h4>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-brand-700">
                  {bulletsOf(feature, result).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ---- Warnings ---- */}
            {result.warnings.length > 0 ? (
              <section aria-label="Data warnings" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <ul className="space-y-0.5 text-[11px] leading-relaxed text-amber-800">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="border-t border-brand-100 pt-2 text-[11px] text-[#64748B]">{state.scopeNote}</p>

            <div className="flex flex-wrap items-center gap-2">
              <form action={formAction}>
                {Object.entries(hidden).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(buttonStyles("outline", "sm"))}
                >
                  <RotateCcw aria-hidden="true" className="mr-1.5 h-3 w-3" />
                  Regenerate
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(draftText ?? narrativeOf(feature, result));
                }}
                className={cn(buttonStyles("outline", "sm"))}
              >
                Copy text
              </button>
              <button
                type="button"
                onClick={() => setDismissedAt(state.generatedAt)}
                className={cn(buttonStyles("ghost", "sm"))}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
