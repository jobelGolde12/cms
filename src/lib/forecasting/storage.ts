import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { forecasts, type NewForecast } from "@/db/schema";
import type { ForecastResult, ForecastPoint, ModelMetadata } from "./arima";
import type { ScopeLevel } from "./time-series";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type StoredForecast = {
  id: string;
  forecastType: string;
  scopeLevel: string;
  targetPeriod: string;
  forecastValue: number;
  lowerBound: number;
  upperBound: number;
  modelType: string;
  modelOrder: string;
  observationCount: number;
  trainingStart: string;
  trainingEnd: string;
  accuracyMetrics: string | null;
  generatedAt: Date;
  status: string;
  errorMessage: string | null;
};

/** One persisted forecast row per (type, scope, target-quarter). */
export type PersistedForecast = {
  type: ScopeLevel;
  scopeLevel: string;
  points: { targetPeriod: string; point: ForecastPoint }[];
  model: ModelMetadata | null;
  status: ForecastResult["status"] | "stale";
  message?: string;
  generatedAt: Date | null;
};

/* -------------------------------------------------------------------------- */
/*  Read (cache)                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Read the persisted forecast for a scope. Returns null when no forecast has
 * ever been generated for this scope. Points come back sorted by target period.
 */
export async function readCachedForecast(
  type: ScopeLevel,
  scopeLevel: string,
): Promise<StoredForecast[]> {
  const rows = await db
    .select({
      id: forecasts.id,
      forecastType: forecasts.forecastType,
      scopeLevel: forecasts.scopeLevel,
      targetPeriod: forecasts.targetPeriod,
      forecastValue: forecasts.forecastValue,
      lowerBound: forecasts.lowerBound,
      upperBound: forecasts.upperBound,
      modelType: forecasts.modelType,
      modelOrder: forecasts.modelOrder,
      observationCount: forecasts.observationCount,
      trainingStart: forecasts.trainingStart,
      trainingEnd: forecasts.trainingEnd,
      accuracyMetrics: forecasts.accuracyMetrics,
      generatedAt: forecasts.generatedAt,
      status: forecasts.status,
      errorMessage: forecasts.errorMessage,
    })
    .from(forecasts)
    .where(and(eq(forecasts.forecastType, type), eq(forecasts.scopeLevel, scopeLevel)))
    .orderBy(desc(forecasts.generatedAt));
  return rows;
}

/* -------------------------------------------------------------------------- */
/*  Write (cache refresh)                                                     */
/* -------------------------------------------------------------------------- */

function serializeResult(result: ForecastResult, type: ScopeLevel, scope: string): NewForecast[] {
  if (result.status === "insufficient_data") {
    return [
      {
        id: crypto.randomUUID(),
        forecastType: type,
        scopeLevel: scope,
        targetPeriod: `insufficient@${new Date().toISOString()}`,
        forecastValue: 0,
        lowerBound: 0,
        upperBound: 0,
        modelType: "ARIMA",
        modelOrder: "{}",
        observationCount: result.dataPoints,
        trainingStart: "",
        trainingEnd: "",
        accuracyMetrics: null,
        status: "insufficient_data",
        errorMessage: result.message,
      },
    ];
  }
  if (result.status === "failed") {
    return [
      {
        id: crypto.randomUUID(),
        forecastType: type,
        scopeLevel: scope,
        targetPeriod: `failed@${new Date().toISOString()}`,
        forecastValue: 0,
        lowerBound: 0,
        upperBound: 0,
        modelType: "ARIMA",
        modelOrder: "{}",
        observationCount: 0,
        trainingStart: "",
        trainingEnd: "",
        accuracyMetrics: null,
        status: "failed",
        errorMessage: result.message,
      },
    ];
  }
  return result.points.map((point) => ({
    id: crypto.randomUUID(),
    forecastType: type,
    scopeLevel: scope,
    targetPeriod: point.key,
    forecastValue: point.forecast,
    lowerBound: point.lowerBound,
    upperBound: point.upperBound,
    modelType: result.model.type,
    modelOrder: JSON.stringify(result.model.order),
    observationCount: result.model.observationCount,
    trainingStart: result.model.trainingStart,
    trainingEnd: result.model.trainingEnd,
    accuracyMetrics: JSON.stringify({
      residStd: result.model.metrics.residStd,
      mae: result.model.metrics.mae,
      rmse: result.model.metrics.rmse,
      mape: result.model.metrics.mape,
    }),
    status: "generated",
  }));
}

/**
 * Persist a fresh forecast, replacing any previous rows of the same scope
 * (multi-row-per-scope strategy: scope, not (scope, target), is the cache key
 * because horizons change as the school year rolls). Idempotent under
 * concurrent writes for the same scope: delete-then-insert keeps cardinality
 * fixed, and the UNIQUE (type, scope, target, model) index guards duplicates.
 */
export async function saveForecast(
  result: ForecastResult,
  type: ScopeLevel,
  scopeLevel: string,
  userId: string | null,
): Promise<void> {
  const rows = serializeResult(result, type, scopeLevel);
  await db
    .delete(forecasts)
    .where(and(eq(forecasts.forecastType, type), eq(forecasts.scopeLevel, scopeLevel)));
  if (rows.length > 0) {
    await db.insert(forecasts).values(rows.map((r) => ({ ...r, generatedBy: userId })));
  }
}

/* -------------------------------------------------------------------------- */
/*  Staleness (plan §19–20)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Mark all cached forecasts for the given scopes stale so the next read
 * regenerates them. Called after grade/record-status writes.
 */
export async function invalidateForecasts(
  scopes: { type: ScopeLevel; scopeLevel: string }[],
): Promise<void> {
  if (scopes.length === 0) return;
  const typeLevelPairs = scopes.map((s) => s.type);
  const levels = scopes.map((s) => s.scopeLevel);
  await db
    .update(forecasts)
    .set({ status: "stale" })
    .where(
      and(
        inArray(forecasts.forecastType, typeLevelPairs),
        inArray(forecasts.scopeLevel, levels),
      ),
    );
}

/** Mark every forecast stale — used after record-status (verification) changes. */
export async function invalidateAllForecasts(): Promise<void> {
  await db.update(forecasts).set({ status: "stale" });
}
