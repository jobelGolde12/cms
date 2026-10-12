import { type Permission } from "@/lib/permissions";
import { getCurrentSchoolYear, listGradeLevels, listSubjects } from "@/lib/queries";
import { logAudit } from "@/lib/audit";
import {
  schoolWideSeries,
  gradeLevelSeries,
  subjectSeries,
  minQuartersFor,
  type ScopeLevel,
  type TimeSeriesPoint,
} from "./time-series";
import { generateForecast, type ForecastResult } from "./arima";
import { readCachedForecast, saveForecast, type PersistedForecast } from "./storage";
import { completedQuarters } from "./time-series";

/* -------------------------------------------------------------------------- */
/*  Authorization (plan §27 — reuses existing permission strings so DB seeds   */
/*  stay in sync; no new permission rows required)                            */
/* -------------------------------------------------------------------------- */

export const VIEW_PERMISSION: Permission = "grades.view";
export const GENERATE_PERMISSION: Permission = "reports.generate";
export const MANAGE_PERMISSION: Permission = "settings.manage";

/* -------------------------------------------------------------------------- */
/*  Scope parameter validation (plan §18.1, §29.1)                            */
/* -------------------------------------------------------------------------- */

export type ScopeParams =
  | { type: "school"; scopeLevel: "school" }
  | { type: "grade_level"; scopeLevel: string }
  | { type: "subject"; scopeLevel: string };

export function parseScopeParam(
  type: string | undefined,
  scope: string | undefined,
): { ok: true; params: ScopeParams } | { ok: false; error: string } {
  if (type === "school_wide" || type === "school") {
    return { ok: true, params: { type: "school", scopeLevel: "school" } };
  }
  if (type === "grade_level" || type === "grade-level") {
    if (!scope) return { ok: false, error: "gradeLevelId is required for grade-level forecasts." };
    return { ok: true, params: { type: "grade_level", scopeLevel: scope } };
  }
  if (type === "subject") {
    if (!scope) return { ok: false, error: "subjectId is required for subject forecasts." };
    return { ok: true, params: { type: "subject", scopeLevel: scope } };
  }
  return { ok: false, error: "Unknown forecast type. Use school_wide, grade_level, or subject." };
}

/* -------------------------------------------------------------------------- */
/*  Load series for a scope                                                   */
/* -------------------------------------------------------------------------- */

async function loadSeries(params: ScopeParams): Promise<TimeSeriesPoint[]> {
  const currentYear = await getCurrentSchoolYear();
  const currentSchoolYearId = currentYear?.id ?? null;
  switch (params.type) {
    case "school":
      return schoolWideSeries(currentSchoolYearId);
    case "grade_level":
      return gradeLevelSeries(params.scopeLevel, currentSchoolYearId);
    case "subject":
      return subjectSeries(params.scopeLevel, currentSchoolYearId);
  }
}

/* -------------------------------------------------------------------------- */
/*  Service entrypoint: cached read with on-demand generation (plan §16)      */
/* -------------------------------------------------------------------------- */

export type ServiceResponse = {
  type: ScopeLevel;
  scopeLevel: string;
  status: PersistedForecast["status"];
  message?: string;
  dataPoints: number;
  sufficiencyPct: number;
  horizon: { targetPeriod: string; forecast: number; lowerBound: number; upperBound: number }[];
  history: { targetPeriod: string; value: number | null }[];
  modelInfo?:
    | {
        type: string;
        order: { p: number; d: number; q: number };
        metrics: { mae: number | null; rmse: number | null; mape: number | null };
      }
    | null;
};

/** Generate-and-cache, used by the API endpoint and dashboard loader. */
export async function getForecastWithCache(
  params: ScopeParams,
  userId: string | null,
): Promise<ServiceResponse> {
  const series = await loadSeries(params);
  const minQuarters = minQuartersFor(params.type);
  const usable = completedQuarters(series);
  const sufficiencyPct = Math.min(100, Math.round((usable / minQuarters) * 100));

  // If data is insufficient regardless of cache, report that state directly
  // so the UI shows an accurate explanation (plan §8.2).
  if (series.length < minQuarters) {
    return {
      type: params.type,
      scopeLevel: params.scopeLevel,
      status: "insufficient_data",
      message: `A minimum of ${minQuarters} completed grading periods is required for a reliable forecast.`,
      dataPoints: usable,
      sufficiencyPct,
      horizon: [],
      history: series.map((p) => ({ targetPeriod: p.key, value: Number.isFinite(p.value) ? p.value : null })),
      modelInfo: null,
    };
  }

  // 1. Try cached persisted rows (plan §16.1)
  const cached = await readCachedForecast(params.type, params.scopeLevel);
  const cachedFresh = cached.filter((r) => r.status === "generated" && r.forecastValue > 0);
  if (cachedFresh.length > 0) {
    return {
      type: params.type,
      scopeLevel: params.scopeLevel,
      status: "generated",
      dataPoints: cachedFresh[0].observationCount,
      sufficiencyPct,
      horizon: cachedFresh
        .sort((a, b) => a.targetPeriod.localeCompare(b.targetPeriod))
        .map((r) => ({
          targetPeriod: r.targetPeriod,
          forecast: r.forecastValue,
          lowerBound: r.lowerBound,
          upperBound: r.upperBound,
        })),
      history: series.map((p) => ({ targetPeriod: p.key, value: Number.isFinite(p.value) ? p.value : null })),
      modelInfo: {
        type: cachedFresh[0].modelType,
        order: safeParseOrder(cachedFresh[0].modelOrder),
        metrics: safeParseMetrics(cachedFresh[0].accuracyMetrics),
      },
    };
  }

  // 2. Generate and persist (on-demand generation)
  const result: ForecastResult = generateForecast(series, params.type);
  await saveForecast(result, params.type, params.scopeLevel, userId);

  if (userId) {
    await logAudit({
      userId,
      action: "GENERATE_FORECAST",
      entityType: "forecast",
      entityId: `${params.type}:${params.scopeLevel}`,
      newValues: {
        forecastType: params.type,
        scopeLevel: params.scopeLevel,
        status: result.status,
        observationCount:
          result.status === "generated" ? result.model.observationCount : 0,
        modelOrder:
          result.status === "generated"
            ? `ARIMA(${result.model.order.p},${result.model.order.d},${result.model.order.q})`
            : undefined,
      },
    });
  }

  if (result.status !== "generated") {
    return {
      type: params.type,
      scopeLevel: params.scopeLevel,
      status: result.status,
      message: result.message,
      dataPoints: result.status === "insufficient_data" ? result.dataPoints : usable,
      sufficiencyPct,
      horizon: [],
      history: series.map((p) => ({ targetPeriod: p.key, value: Number.isFinite(p.value) ? p.value : null })),
      modelInfo: null,
    };
  }

  return {
    type: params.type,
    scopeLevel: params.scopeLevel,
    status: "generated",
    dataPoints: result.model.observationCount,
    sufficiencyPct,
    horizon: result.points.map((p) => ({
      targetPeriod: p.key,
      forecast: p.forecast,
      lowerBound: p.lowerBound,
      upperBound: p.upperBound,
    })),
    history: result.history.map((h) => ({ targetPeriod: h.key, value: h.value })),
    modelInfo: {
      type: result.model.type,
      order: result.model.order,
      metrics: result.model.metrics,
    },
  };
}

function safeParseOrder(json: string | null): { p: number; d: number; q: number } {
  try {
    const obj = JSON.parse(json ?? "{}") as { p?: number; d?: number; q?: number };
    return { p: obj.p ?? 0, d: obj.d ?? 0, q: obj.q ?? 0 };
  } catch {
    return { p: 0, d: 0, q: 0 };
  }
}

function safeParseMetrics(json: string | null): { mae: number | null; rmse: number | null; mape: number | null } {
  try {
    const obj = JSON.parse(json ?? "{}") as { mae?: number | null; rmse?: number | null; mape?: number | null };
    return { mae: obj.mae ?? null, rmse: obj.rmse ?? null, mape: obj.mape ?? null };
  } catch {
    return { mae: null, rmse: null, mape: null };
  }
}

/* -------------------------------------------------------------------------- */
/*  Reference-data helpers for the API endpooints (validate IDs exist)         */
/* -------------------------------------------------------------------------- */

export async function gradeLevelExists(id: string): Promise<boolean> {
  const rows = await listGradeLevels();
  return rows.some((r) => r.id === id);
}

export async function subjectExists(id: string): Promise<boolean> {
  const rows = await listSubjects();
  return rows.some((r) => r.id === id);
}

/** Admin-triggered full refresh — marks all forecasts stale, next read regenerates. */
export async function markAllStaleAndAudit(userId: string): Promise<void> {
  const { invalidateAllForecasts } = await import("./storage");
  await invalidateAllForecasts();
  await logAudit({
    userId,
    action: "INVALIDATE_FORECAST",
    entityType: "forecast",
    entityId: "all",
    newValues: { scope: "all", reason: "admin-regenerate" },
  });
}
