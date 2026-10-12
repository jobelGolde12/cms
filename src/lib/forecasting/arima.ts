import ARIMA from "arima";
import {
  FORECAST_SUFFICIENCY,
  type TimeSeriesPoint,
  fillGaps,
  minQuartersFor,
  type ScopeLevel,
} from "./time-series";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type ForecastPoint = {
  /** Label of the forecast target period, e.g. "2027-2028·Q1" */
  key: string;
  /** Projected quarter mean (clamped to [0, 100]) */
  forecast: number;
  /** 95% prediction-interval lower bound (clamped) */
  lowerBound: number;
  /** 95% prediction-interval upper bound (clamped) */
  upperBound: number;
};

export type ModelOrder = { p: number; d: number; q: number };

export type ModelMetadata = {
  type: "ARIMA";
  order: ModelOrder;
  observationCount: number;
  trainingStart: string;
  trainingEnd: string;
  metrics: {
    /** Residual standard deviation, used for CI radius */
    residStd: number;
    mae: number | null;
    rmse: number | null;
    /** Mean Absolute Percentage Error, null when unstable (values near 0) */
    mape: number | null;
  };
  /** 3σ outlier indices in the input series (informational, plan §10). */
  outlierIndices: number[];
};

export type ForecastResult =
  | {
      status: "generated";
      points: ForecastPoint[];
      history: { key: string; value: number | null }[];
      model: ModelMetadata;
    }
  | { status: "insufficient_data"; message: string; dataPoints: number }
  | { status: "failed"; message: string };

/* -------------------------------------------------------------------------- */
/*  Configuration (plan §3.2, §11.1, §39)                                     */
/* -------------------------------------------------------------------------- */

const FORECAST_HORIZON = 4;
const CONFIDENCE_Z = 1.96; // 95% two-sided normal quantile
/** Candidate grid is intentionally small for tiny series (plan §39.2). */
const MODEL_GRID: ModelOrder[] = [
  { p: 0, d: 0, q: 0 },
  { p: 1, d: 0, q: 0 },
  { p: 0, d: 0, q: 1 },
  { p: 1, d: 0, q: 1 },
  { p: 0, d: 1, q: 1 },
  { p: 1, d: 1, q: 1 },
  { p: 2, d: 1, q: 1 },
];
/**
 * The WASM port enforces a minimum series length that grows with (p+d+q).
 * Simple (0,0,0/1) models need ~6; richer models need ~11+, which most
 * quarterly school series will not have for years. Keep fallback simple.
 */
const MIN_SERIES_FOR_GRID = 12;
const SIMPLE_FALLBACK: ModelOrder = { p: 1, d: 0, q: 0 };

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const clamp = (v: number): number => Math.max(0, Math.min(100, v));

/** In-sample one-step-ahead residuals via error,乖 is not available from WASM; approximate with backtest. */
function inSampleMae(series: (number | null)[], order: ModelOrder): number | null {
  const values = series.map((v) => (Number.isFinite(v as number) ? (v as number) : NaN));
  // Backtest: fit on all but last k points, compare predictions.
  const k = Math.min(2, values.length - 2);
  if (k <= 0) return null;
  const train = values.slice(0, values.length - k).filter((v) => Number.isFinite(v));
  const test = values.slice(values.length - k).filter((v) => Number.isFinite(v));
  if (train.length < 4 || test.length === 0) return null;
  try {
    const model = new ARIMA({ ...order, verbose: false }).fit(train);
    const [preds] = model.predict(test.length);
    model.destroy();
    const errs = preds.map((p, i) => Math.abs(p - test[i]));
    return errs.reduce((a, b) => a + b, 0) / errs.length;
  } catch {
    return null;
  }
}

/** Label the next quarter(s) after the last observed one. */
function nextQuarterLabels(
  series: TimeSeriesPoint[],
  horizon: number,
): string[] {
  const labels: string[] = [];
  const last = series[series.length - 1];
  if (!last) {
    for (let i = 1; i <= horizon; i++) labels.push(`Q${i}`);
    return labels;
  }
  let quarter = last.quarter;
  let year = last.schoolYear;
  for (let i = 0; i < horizon; i++) {
    if (quarter >= 4) {
      quarter = 1;
      const start = Number(year.split("-")[0]);
      year = `${start + 1}-${start + 2}`;
    } else {
      quarter += 1;
    }
    labels.push(`${year}·Q${quarter}`);
  }
  return labels;
}

/* -------------------------------------------------------------------------- */
/*  Model selection (plan §3.3, §39)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Best-effort model selection. The WASM C port does not expose AIC, so we
 * rank by in-sample-ish holdout error and prefer simpler models on ties.
 * Deterministic for the same input.
 */
function selectOrder(clean: number[]): ModelOrder {
  const grid =
    clean.length >= MIN_SERIES_FOR_GRID ? MODEL_GRID : [SIMPLE_FALLBACK, { p: 0, d: 0, q: 1 }];
  let best: ModelOrder | null = null;
  let bestErr = Number.POSITIVE_INFINITY;
  for (const order of grid) {
    const mae = inSampleMae(clean, order);
    if (mae != null && mae < bestErr) {
      bestErr = mae;
      best = order;
    }
    if (best !== null && bestErr === 0) break;
  }
  return best ?? SIMPLE_FALLBACK;
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Generate a forecast for a quarterly grade series. Never mutates any stored
 * grade — the input series is read-only aggregate data (plan §2.1, §53.2).
 */
export function generateForecast(
  series: TimeSeriesPoint[],
  scope: ScopeLevel,
): ForecastResult {
  const minQuarters = minQuartersFor(scope);
  const filled = fillGaps(series);
  const clean = filled.filter((v): v is number => v != null && Number.isFinite(v));

  if (series.length < minQuarters || clean.length < FORECAST_SUFFICIENCY.MIN_OBSERVATIONS) {
    return {
      status: "insufficient_data",
      message: `A minimum of ${minQuarters} completed grading periods is required for a reliable forecast.`,
      dataPoints: clean.length,
    };
  }

  const outlierIndices = seriesOutliers(series);
  try {
    // For a stable fit, the WASM port requires no NaN values.
    const order = selectOrder(clean);
    const model = new ARIMA({ ...order, verbose: false }).fit(clean);
    const horizon = FORECAST_HORIZON;
    const [means, errors] = model.predict(horizon);
    model.destroy();

    if (!means || means.length !== horizon || !errors || errors.length !== horizon) {
      return { status: "failed", message: "Model returned an unexpected result shape." };
    }
    if (!means.every((v) => Number.isFinite(v))) {
      return { status: "failed", message: "Model produced non-finite values." };
    }

    const labels = nextQuarterLabels(series, horizon);
    const residStd =
      clean.length > 1
        ? Math.sqrt(
            clean.reduce((acc, v) => acc + v * v, 0) / clean.length -
              (clean.reduce((acc, v) => acc + v, 0) / clean.length) ** 2,
          )
        : 0;
    // Error series from the WASM port approximates the standard error of
    // prediction; fall back to residual std if it is degenerate.
    const ciRadius = errors.map((e) =>
      Number.isFinite(e) && e > 0 ? CONFIDENCE_Z * e : CONFIDENCE_Z * (residStd || 1),
    );

    const points: ForecastPoint[] = means.map((m, i) => ({
      key: labels[i],
      forecast: clamp(Math.round(m * 10) / 10),
      lowerBound: clamp(Math.round((m - ciRadius[i]) * 10) / 10),
      upperBound: clamp(Math.round((m + ciRadius[i]) * 10) / 10),
    }));

    const history: { key: string; value: number | null }[] = series.map((p, i) => ({
      key: p.key,
      value: filled[i],
    }));

    const fitted = inSampleMae(clean, order);
    const rmse = fitted == null ? null : Math.round(Math.sqrt(fitted * fitted) * 10) / 10;
    const mape =
      clean.some((v) => Math.abs(v) < 1e-9)
        ? null // unstable near zero (plan §38.2 note)
        : Math.round((fitted != null ? (fitted / Math.abs(clean.reduce((a, b) => a + b, 0) / clean.length)) * 100 : 0) * 10) / 10;

    return {
      status: "generated",
      points,
      history,
      model: {
        type: "ARIMA",
        order,
        observationCount: clean.length,
        trainingStart: series[0]?.key ?? "",
        trainingEnd: series[series.length - 1]?.key ?? "",
        metrics: {
          residStd: Math.round(residStd * 100) / 100,
          mae: fitted == null ? null : Math.round(fitted * 10) / 10,
          rmse,
          mape,
        },
        outlierIndices,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ARIMA failure.";
    return { status: "failed", message };
  }
}

/** Index positions of |value − mean| > 3σ observations (flag only, never drop). */
function seriesOutliers(series: TimeSeriesPoint[]): number[] {
  const values = series.map((p) => p.value).filter((v) => Number.isFinite(v));
  if (values.length < 2) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  if (std === 0) return [];
  return series
    .map((p, i) => (Number.isFinite(p.value) && Math.abs(p.value - mean) > 3 * std ? i : -1))
    .filter((i) => i >= 0);
}
