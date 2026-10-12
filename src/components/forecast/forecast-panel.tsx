import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getForecastWithCache } from "@/lib/forecasting/service";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import ForecastChart, { type ChartDatum } from "./forecast-chart";

/**
 * Server component: fetches (or generates) the school-wide forecast with
 * caching, then hands prepared chart data to the client chart. Aggregate data
 * only — no student PII reaches the client (plan §29.2).
 */
export default async function ForecastPanel() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "grades.view")) return null;

  const result = await getForecastWithCache(
    { type: "school", scopeLevel: "school" },
    user.id,
  );

  if (result.status === "insufficient_data") {
    return (
      <Card>
        <CardHeader
          title="Academic Performance Forecast"
          description="Statistical projection based on finalized grades."
        />
        <CardBody>
          <p className="py-6 text-center text-sm text-brand-400">
            Insufficient data for forecasting. A minimum of 4 completed grading
            periods are required ({result.dataPoints} available so far).
          </p>
        </CardBody>
      </Card>
    );
  }

  if (result.status === "failed") {
    return (
      <Card>
        <CardHeader
          title="Academic Performance Forecast"
          description="Statistical projection based on finalized grades."
        />
        <CardBody>
          <p className="py-6 text-center text-sm text-amber-600">
            Forecast generation failed. Please try again.
          </p>
        </CardBody>
      </Card>
    );
  }

  // Merge history + forecast into a single chart dataset.
  const history = result.history.map((h) => ({
    period: h.targetPeriod,
    actual: h.value,
    forecast: null as number | null,
    lower: null as number | null,
    upper: null as number | null,
  }));
  // Anchor the forecast to the last historical value for a continuous line.
  const lastActual = history.length > 0 ? history[history.length - 1].actual : null;
  const forecast = result.horizon.map((p, i) => ({
    period: p.targetPeriod,
    actual: null as number | null,
    forecast: p.forecast,
    lower: i === 0 ? lastActual : p.lowerBound,
    upper: i === 0 ? lastActual : p.upperBound,
  }));
  const data: ChartDatum[] =
    history.length === 0
      ? forecast
      : [
          ...history.slice(0, -1),
          {
            period: history[history.length - 1].period,
            actual: lastActual,
            forecast: lastActual,
            lower: lastActual,
            upper: lastActual,
          },
          ...forecast,
        ];

  return (
    <Card>
      <CardHeader
        title="Academic Performance Forecast"
        description="Statistical projection based on finalized grades."
      />
      <CardBody>
        <ForecastChart data={data} />

        {/* Explanation notice (plan §26) */}
        <div className="mt-4 rounded-md bg-brand-50 p-3 text-xs text-brand-700">
          <p>
            <strong>Forecast Notice:</strong> These projections are statistical
            estimates based on historical finalized academic performance. They
            should be used as decision-support information rather than official
            grades.
          </p>
          <p className="mt-1">
            Requires at least 4 completed grading periods of verified data.
            Prediction intervals indicate uncertainty around the projection.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
