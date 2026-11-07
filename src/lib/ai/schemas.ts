import { z } from "zod";

/**
 * Shared output schemas for every AI feature.
 *
 * All AI responses are parsed against these schemas server-side before they
 * ever reach the UI. A model response that does not validate is rejected —
 * it is never displayed, persisted, "repaired", or partially trusted.
 *
 * Boundaries:
 *  - string fields are bounded so a runaway model response cannot break layout
 *    or blow up payloads;
 *  - numeric facts NEVER come from the model — the server computes facts from
 *    database rows and passes them straight to the UI; the model only
 *    narrates (`ai_interpretation` style fields) and must echo the echoes of
 *    `facts` in its own reasoning only.
 */

const bounded = (max: number) => z.string().trim().min(1).max(max);

const BULLET_MAX = 250;
const bullets = (maxItems: number) => z.array(bounded(BULLET_MAX)).max(maxItems);

const confidence = z.enum(["high", "medium", "low"]);

/** Common safety metadata every feature returns. */
const safetyFields = {
  confidence,
  /** Data gaps, truncation notices, ambiguity acknowledgements. */
  warnings: bullets(4),
};

/* ------------------------- Student summary (Phase 1) --------------------- */

export const studentSummarySchema = z.object({
  /** Concise overall overview of what the records show. */
  overview: bounded(1200),
  /** Domain narratives — null when that domain had no data for this role. */
  academic: bounded(900).nullable(),
  attendance: bounded(700).nullable(),
  behavior: bounded(700).nullable(),
  literacyNumeracy: bounded(700).nullable(),
  interventions: bounded(700).nullable(),
  keyFindings: bullets(6),
  /** Suggestions ONLY — never decisions. */
  followUpConsiderations: bullets(6),
  ...safetyFields,
});

export type StudentSummaryResult = z.infer<typeof studentSummarySchema>;

/* --------------------- Performance analysis (Phase 2) -------------------- */

const TREND_DIRECTIONS = ["improving", "declining", "stable", "insufficient_data"] as const;

export const performanceAnalysisSchema = z.object({
  analysis: bounded(1400),
  trends: z
    .array(
      z.object({
        subject: bounded(150),
        direction: z.enum(TREND_DIRECTIONS),
        detail: bounded(300),
      }),
    )
    .max(12),
  notableObservations: bullets(6),
  /** Support framing (e.g. "may warrant academic follow-up") — never a verdict. */
  supportNote: bounded(600).nullable(),
  ...safetyFields,
});

export type PerformanceAnalysisResult = z.infer<typeof performanceAnalysisSchema>;

/* ---------------- Guidance assistance (Phase 3) --------------------------- */

export const guidanceDraftNoteSchema = z.object({
  /** DRAFT text the counselor edits/confirms before it enters any record. */
  draftNote: bounded(2000),
  evidenceUsed: bullets(6),
  considerations: bullets(6),
  ...safetyFields,
});

export const guidanceCaseSummarySchema = z.object({
  summary: bounded(1400),
  recurringPatterns: bullets(6),
  openPoints: bullets(6),
  considerations: bullets(6),
  ...safetyFields,
});

export type GuidanceDraftNoteResult = z.infer<typeof guidanceDraftNoteSchema>;
export type GuidanceCaseSummaryResult = z.infer<typeof guidanceCaseSummarySchema>;

/* ------------- Student development / intervention suggestions (Phase 4) --- */

const SUGGESTION_AREAS = [
  "academic",
  "attendance",
  "behavior",
  "literacy",
  "numeracy",
  "other",
] as const;

export const interventionSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        area: z.enum(SUGGESTION_AREAS),
        /** The strategy itself, phrased as a "possible intervention". */
        strategy: bounded(350),
        rationale: bounded(350),
      }),
    )
    .max(8),
  summary: bounded(600),
  ...safetyFields,
});

export type InterventionSuggestionsResult = z.infer<typeof interventionSuggestionsSchema>;

/* --------------------- Duplicate evidence (Phase 5) ---------------------- */

export const duplicateEvidenceSchema = z.object({
  explanation: bounded(1000),
  /** Server-computed matching fields, echoed in plain language. */
  matchingEvidence: bullets(8),
  /** Hedged, explicitly non-decisional closing note. */
  conclusionNote: bounded(400),
  ...safetyFields,
});

export type DuplicateEvidenceResult = z.infer<typeof duplicateEvidenceSchema>;

/* --------------------- Dashboard / report summary (Phase 6) -------------- */

export const dashboardReportSummarySchema = z.object({
  headline: bounded(300),
  paragraphs: z.array(bounded(700)).max(4),
  notableObservations: bullets(5),
  ...safetyFields,
});

export type DashboardReportSummaryResult = z.infer<typeof dashboardReportSummarySchema>;
