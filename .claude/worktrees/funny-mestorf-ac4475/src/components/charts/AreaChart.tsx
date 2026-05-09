import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import type { ChartDataPoint } from '../../types';

interface AreaChartProps {
  data: ChartDataPoint[];
  currency?: string;
  height?: number;
  showIncome?: boolean;
  showExpense?: boolean;
  showNet?: boolean;
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
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 shadow-xl min-w-[140px]">
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

export function AreaChart({
  data,
  currency = 'AUD',
  height = 240,
  showIncome = true,
  showExpense = true,
  showNet = false,
}: AreaChartProps) {
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
      <RechartsAreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
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
        {(showIncome || showExpense || showNet) && (
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-400 capitalize">{value}</span>
            )}
            iconType="circle"
            iconSize={8}
          />
        )}
        {showIncome && (
          <Area
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#incomeGradient)"
            dot={false}
          />
        )}
        {showExpense && (
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#expenseGradient)"
            dot={false}
          />
        )}
        {showNet && (
          <Area
            type="monotone"
            dataKey="net"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#netGradient)"
            dot={false}
          />
        )}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
