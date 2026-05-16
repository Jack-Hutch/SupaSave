import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import type { MonthlyComparison } from '../../types';

interface BarChartProps {
  data: MonthlyComparison[];
  currency?: string;
  height?: number;
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  currency?: string;
}

function CustomTooltip({ active, payload, label, currency = 'AUD' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-gray-400">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-400 capitalize">{item.dataKey}</span>
          </div>
          <span className="font-mono font-medium" style={{ color: item.color }}>
            {formatCurrency(item.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BarChart({ data, currency = 'AUD', height = 240 }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-gray-500"
      >
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#9ca3af', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${Math.round(v)}`}
          width={50}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-gray-400 capitalize">{value}</span>
          )}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
        <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={20} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
