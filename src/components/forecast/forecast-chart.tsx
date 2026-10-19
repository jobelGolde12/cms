"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export type ChartDatum = {
  period: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
};

/**
 * Client-side forecast chart (Recharts requires the browser React runtime —
 * createContext is unavailable in Server Components). Receives fully prepared
 * data from the server panel; renders historical vs. forecast lines with a
 * 95% prediction-interval band (plan §12.2, §25).
 */
export default function ForecastChart({ data }: { data: ChartDatum[] }) {
  return (
    <div className="h-72 w-full overflow-x-auto">
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 2 }}
            formatter={(value, name) =>
              value == null ? [null, String(name)] : [Number(value).toFixed(1), String(name)]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="actual"
            name="Historical"
            stroke="#1f3b99"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#d97706"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="lower"
            name="95% CI Lower"
            stroke="rgba(217, 119, 6, 0.3)"
            strokeWidth={1}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="upper"
            name="95% CI Upper"
            stroke="rgba(217, 119, 6, 0.3)"
            strokeWidth={1}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
