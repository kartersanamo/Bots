"use client";

import type { DailyCount, NamedCount } from "@/lib/analytics/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = {
  primary: "#8b5cf6",
  secondary: "#06b6d4",
  muted: "#64748b",
};

function xTickInterval(length: number): number | "preserveStartEnd" {
  if (length <= 12) return 0;
  if (length <= 24) return 1;
  return Math.ceil(length / 10) - 1;
}

export function DailyLineChart({
  data,
  dataKey = "count",
  color = CHART_COLORS.primary,
}: {
  data: DailyCount[];
  dataKey?: string;
  color?: string;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted">No data in range</p>;
  }

  const tickInterval = xTickInterval(data.length);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          interval={tickInterval}
          tickFormatter={(v) => String(v).slice(5)}
        />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} />
        <Tooltip
          contentStyle={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
          }}
          labelStyle={{ color: "#e2e8f0" }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function NamedBarChart({
  data,
  color = CHART_COLORS.secondary,
  compactLabels = false,
}: {
  data: NamedCount[];
  color?: string;
  /** Fixed small x-axis labels (24h / weekday charts) */
  compactLabels?: boolean;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted">No data</p>;
  }

  const hasAny = data.some((d) => d.count > 0);
  if (!hasAny) {
    return <p className="py-8 text-center text-sm text-muted">No data in range</p>;
  }

  const longestLabel = data.reduce((max, row) => {
    const len = String(row.name ?? "").length;
    return len > max ? len : max;
  }, 0);
  const needsLongLabelLayout = !compactLabels && longestLabel > 16;
  const labelAngle = compactLabels ? 0 : needsLongLabelLayout ? -35 : -25;
  const labelHeight = compactLabels ? 28 : needsLongLabelLayout ? 84 : 56;
  const labelSize = compactLabels ? 9 : needsLongLabelLayout ? 9 : 10;
  const tickFormatter = (v: string | number) => {
    const raw = String(v);
    if (compactLabels || !needsLongLabelLayout) return raw;
    return raw.length > 22 ? `${raw.slice(0, 21)}…` : raw;
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#94a3b8", fontSize: labelSize }}
          interval={0}
          angle={labelAngle}
          textAnchor={compactLabels ? "middle" : "end"}
          height={labelHeight}
          tickFormatter={tickFormatter}
        />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} />
        <Tooltip
          contentStyle={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
          }}
        />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DualDailyLineChart({
  opened,
  closed,
  openedLabel = "Opened",
  closedLabel = "Closed",
}: {
  opened: DailyCount[];
  closed: DailyCount[];
  openedLabel?: string;
  closedLabel?: string;
}) {
  const map = new Map<string, { date: string; opened: number; closed: number }>();
  for (const r of opened) {
    map.set(r.date, { date: r.date, opened: r.count, closed: 0 });
  }
  for (const r of closed) {
    const cur = map.get(r.date) ?? { date: r.date, opened: 0, closed: 0 };
    cur.closed = r.count;
    map.set(r.date, cur);
  }
  const data = [...map.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted">No data in range</p>;
  }

  const tickInterval = xTickInterval(data.length);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          interval={tickInterval}
          tickFormatter={(v) => String(v).slice(5)}
        />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} />
        <Tooltip
          contentStyle={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="opened"
          name={openedLabel}
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="closed"
          name={closedLabel}
          stroke={CHART_COLORS.secondary}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
