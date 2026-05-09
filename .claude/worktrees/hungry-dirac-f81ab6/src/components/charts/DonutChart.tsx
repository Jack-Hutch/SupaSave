import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';

// Fallback palette — used when no per-slice colors are supplied
const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#f97316', '#14b8a6', '#a855f7',
];

interface DonutChartProps {
  data:      Array<{ name: string; value: number }>;
  currency?: string;
  height?:   number;
  /** Per-slice hex colors — should match the category color system. */
  colors?:   string[];
}

interface TooltipPayloadItem {
  name:    string;
  value:   number;
  payload: { name: string; value: number };
}

interface CustomTooltipProps {
  active?:   boolean;
  payload?:  TooltipPayloadItem[];
  currency?: string;
}

function CustomTooltip({ active, payload, currency = 'AUD' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border-base bg-surface px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-foreground">{item.name}</p>
      <p className="text-sm font-mono text-accent">
        {formatCurrency(item.value, currency)}
      </p>
    </div>
  );
}

export function DonutChart({ data, currency = 'AUD', height = 280, colors }: DonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-2 px-4"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border-base">
          <span className="text-2xl opacity-40">🍩</span>
        </div>
        <p className="text-sm font-medium text-foreground-muted">No spending data yet</p>
        <p className="text-xs text-foreground-subtle text-center">
          Add transactions to see your category breakdown
        </p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius="55%"
          outerRadius="75%"
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors?.[index] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>

        {/* Centre labels */}
        <text
          x="50%" y="42%"
          textAnchor="middle" dominantBaseline="middle"
          fill="#9ca3af" fontSize={11}
        >
          Total
        </text>
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="middle"
          fill="#e5e7eb" fontSize={14} fontWeight={600}
          fontFamily="JetBrains Mono, monospace"
        >
          {formatCurrency(total, currency)}
        </text>

        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-foreground-muted">{value}</span>
          )}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
