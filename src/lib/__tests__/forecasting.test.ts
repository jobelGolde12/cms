import { describe, it, expect } from "vitest";
import {
  fillGaps,
  minQuartersFor,
  completedQuarters,
  outlierFlags,
  type TimeSeriesPoint,
} from "../forecasting/time-series";
import { generateForecast } from "../forecasting/arima";

function point(quarter: number, value: number, year = "2025-2026"): TimeSeriesPoint {
  return {
    key: `${year}·Q${quarter}`,
    schoolYear: year,
    quarter,
    value,
    count: 10,
    stdDev: 3,
  };
}

describe("minQuartersFor", () => {
  it("requires more data for school-wide than for narrower scopes", () => {
    expect(minQuartersFor("school")).toBe(4);
    expect(minQuartersFor("grade_level")).toBe(3);
    expect(minQuartersFor("subject")).toBe(3);
  });
});

describe("fillGaps", () => {
  it("returns values unchanged when there are no gaps", () => {
    const series = [point(1, 80), point(2, 82), point(3, 84), point(4, 86)];
    expect(fillGaps(series)).toEqual([80, 82, 84, 86]);
  });

  it("interpolates a mid-series gap (never defaults to zero — plan §9.1)", () => {
    const series = [point(1, 80), point(2, NaN), point(3, 84)];
    const filled = fillGaps(series);
    expect(filled[1]).toBeCloseTo(82, 5);
    expect(filled[0]).toBe(80);
    expect(filled[2]).toBe(84);
  });

  it("leaves leading and trailing gaps null (forecast target anyway)", () => {
    const series = [point(1, NaN), point(2, 80), point(3, 84), point(4, NaN)];
    const filled = fillGaps(series);
    expect(filled[0]).toBeNull();
    expect(filled[3]).toBeNull();
    expect(filled[1]).toBe(80);
    expect(filled[2]).toBe(84);
  });

  it("returns all nulls when too much data is missing (>40% interior)", () => {
    const series = [
      point(1, 80),
      point(2, NaN),
      point(3, NaN),
      point(4, NaN),
      point(4, 10, "2026-2027"),
    ];
    const filled = fillGaps(series);
    expect(filled.every((v) => v === null)).toBe(true);
  });
});

describe("completedQuarters", () => {
  it("counts only finite observations", () => {
    const series = [point(1, 80), point(2, NaN), point(3, 84)];
    expect(completedQuarters(series)).toBe(2);
  });
});

describe("outlierFlags", () => {
  it("flags >3σ observations without removing them (plan §10)", () => {
    // 11 calm points + one extreme value — with 6 points a single outlier can
    // mathematically never exceed 3σ, so a longer series is required.
    const values = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 99];
    const series = values.map((v, i) => point(i + 1, v));
    const flags = outlierFlags(series);
    expect(flags).toContain(11);
  });
});

describe("generateForecast", () => {
  it("returns insufficient_data below the series minimum", () => {
    const result = generateForecast([point(1, 80), point(2, 81)], "subject");
    expect(result.status).toBe("insufficient_data");
    if (result.status === "insufficient_data") {
      expect(result.dataPoints).toBe(2);
      expect(result.message).toMatch(/minimum of 3/);
    }
  });

  it("produces finite, clamped forecasts with valid CI ordering", () => {
    const data = [74, 75, 76, 77, 75, 77, 78, 79, 77, 79, 80, 81, 79, 80, 82, 83];
    const series = data.map((v, i) =>
      point(((i % 4) + 1) as 1 | 2 | 3 | 4, v, i < 4 ? "2024-2025" : i < 8 ? "2025-2026" : "2026-2027"),
    );
    const result = generateForecast(series, "school");
    expect(result.status).toBe("generated");
    if (result.status !== "generated") return;

    expect(result.points).toHaveLength(4);
    for (const p of result.points) {
      expect(p.forecast).toBeGreaterThanOrEqual(0);
      expect(p.forecast).toBeLessThanOrEqual(100);
      expect(p.lowerBound).toBeLessThanOrEqual(p.forecast);
      expect(p.upperBound).toBeGreaterThanOrEqual(p.forecast);
    }
    expect(result.model.observationCount).toBe(16);
    expect(result.model.type).toBe("ARIMA");
  });

  it("is deterministic for identical input", () => {
    const data = [76, 78, 79, 83, 80, 81, 82, 78, 79, 80, 81, 82];
    const series = data.map((v, i) => point(((i % 4) + 1) as 1 | 2 | 3 | 4, v));
    const a = generateForecast(series, "grade_level");
    const b = generateForecast(series, "grade_level");
    expect(a).toEqual(b);
  });

  it("interpolates mid-series gaps into the training set (plan §9.2)", () => {
    const data = [80, NaN, 82, 84, 80, 81, 83, 82, 81, 84, 85, 83];
    const series = data.map((v, i) => point(((i % 4) + 1) as 1 | 2 | 3 | 4, v));
    const result = generateForecast(series, "school");
    if (result.status === "generated") {
      // The gap sits between two observations, so it is interpolated — count
      // stays at 12, and the filled value is never zero.
      expect(result.model.observationCount).toBe(12);
      expect(result.history[1].value).not.toBeNull();
      expect(result.history[1].value).toBeGreaterThan(0);
    }
  });
});
