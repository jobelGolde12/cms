import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import {
  ASSESSMENT_DOMAINS,
  DEFAULT_ASSESSMENT_LEVELS,
  type AssessmentDomain,
} from "@/lib/constants";

/**
 * Configurable proficiency levels for the assessment engine.
 *
 * The levels are DATA, not code: `system_settings.assessment_levels` stores a
 * JSON object keyed by domain, e.g.
 * `{"reading":["Beginning","Developing",…],"literacy":[…],"numeracy":[…]}`.
 * The school may change them from Settings without a code change, so every
 * consumer (the assessment form, the development dashboard, the AI context
 * builder) reads them through this helper.
 *
 * The constants in `DEFAULT_ASSESSMENT_LEVELS` are only a FALLBACK for the
 * (unlikely) case where the setting row is missing or malformed — they are
 * placeholders, not official standards.
 */

export type AssessmentLevels = Record<AssessmentDomain, string[]>;

function isLevelList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => typeof v === "string" && v.trim().length > 0)
  );
}

function parseLevels(raw: string | null | undefined): Partial<AssessmentLevels> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<AssessmentLevels> = {};
    for (const domain of ASSESSMENT_DOMAINS) {
      const list = parsed[domain];
      if (isLevelList(list)) out[domain] = list.map((v) => v.trim());
    }
    return out;
  } catch {
    return {};
  }
}

/** Every domain's level list, falling back to the defaults per missing key. */
export async function getAssessmentLevels(): Promise<AssessmentLevels> {
  const rows = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, "assessment_levels"))
    .limit(1);
  const configured = parseLevels(rows[0]?.value);
  return {
    reading: configured.reading ?? DEFAULT_ASSESSMENT_LEVELS.reading,
    literacy: configured.literacy ?? DEFAULT_ASSESSMENT_LEVELS.literacy,
    numeracy: configured.numeracy ?? DEFAULT_ASSESSMENT_LEVELS.numeracy,
  };
}

/** Level list for one domain (never empty — defaults are used as fallback). */
export async function getAssessmentLevelsForDomain(
  domain: AssessmentDomain,
): Promise<string[]> {
  const levels = await getAssessmentLevels();
  return levels[domain] ?? DEFAULT_ASSESSMENT_LEVELS[domain];
}
