import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { ChartTooltip } from './ChartTooltip';
import type { ChartDataPoint } from '../../types';

interface AreaChartProps {
  data:         ChartDataPoint[];
  currency?:    string;
  height?:      number;
  showIncome?:  boolean;
  showExpense?: boolean;
  showNet?:     boolean;
}

// Design-token colors for chart series
const INCOME_COLOR  = '#4ade80';  // var(--income)
const EXPENSE_COLOR = '#f87171';  // var(--expense)
const NET_COLOR     = '#7c6cff';  // var(--accent)

interface TooltipPayloadItem {
  dataKey: string;
  value:   number;
  color:   string;
}

interface RawTooltipProps {
  active?:    boolean;
  payload?:   TooltipPayloadItem[];
  label?:     string;
  currency?:  string;
  showIncome?:  boolean;
  showExpense?: boolean;
  showNet?:     boolean;
}

function CustomTooltip({ active, payload, label, currency = 'AUD', showIncome, showExpense, showNet }: RawTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  const map = Object.fromEntries(payload.map((p) => [p.dataKey, p.value]));

  const rows = [
    showIncome  && { label: 'Income',  value: map['income']  ?? 0, color: INCOME_COLOR  },
    showExpense && { label: 'Expenses', value: map['expense'] ?? 0, color: EXPENSE_COLOR },
    showNet     && { label: 'Net',      value: map['net']     ?? 0, color: NET_COLOR     },
  ].filter(Boolean) as { label: string; value: number; color: string }[];

  return <ChartTooltip title={label} rows={rows} currency={currency} />;
}

// Custom active dot — glowing circle matching the series colour
function ActiveDot({ cx, cy, fill }: { cx?: number; cy?: number; fill?: string }) {
  if (cx === undefined || cy === undefined) return null;
  return (
    <g>
      {/* Glow ring */}
      <circle cx={cx} cy={cy} r={8}  fill={fill} opacity={0.18} />
      <circle cx={cx} cy={cy} r={4}  fill={fill} opacity={0.35} />
      {/* Core dot */}
      <circle cx={cx} cy={cy} r={3}  fill={fill} />
      <circle cx={cx} cy={cy} r={1.5} fill="#fff" />
    </g>
  );
}

export function AreaChart({
  data,
  currency    = 'AUD',
  height      = 240,
  showIncome  = true,
  showExpense = true,
  showNet     = false,
}: AreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-foreground-subtle">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={INCOME_COLOR}  stopOpacity={0.22} />
            <stop offset="100%" stopColor={INCOME_COLOR}  stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={EXPENSE_COLOR} stopOpacity={0.18} />
            <stop offset="100%" stopColor={EXPENSE_COLOR} stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={NET_COLOR}     stopOpacity={0.22} />
            <stop offset="100%" stopColor={NET_COLOR}     stopOpacity={0}    />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgb(var(--border-default))"
          vertical={false}
          strokeOpacity={0.6}
        />

        <XAxis
          dataKey="label"
          tick={{ fill: 'rgb(var(--foreground-subtle))', fontSize: 11, fontFamily: 'inherit' }}
          axisLine={false}
          tickLine={false}
          dy={4}
        />
        <YAxis
          tick={{ fill: 'rgb(var(--foreground-subtle))', fontSize: 11, fontFamily: 'inherit' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${Math.round(v / 1000) > 0 ? `${Math.round(v / 1000)}k` : Math.round(v)}`}
          width={44}
        />

        <Tooltip
          content={
            <CustomTooltip
              currency={currency}
              showIncome={showIncome}
              showExpense={showExpense}
              showNet={showNet}
            />
          }
          cursor={{
            stroke:       'rgb(var(--border-strong))',
            strokeWidth:  1,
            strokeDasharray: '4 3',
          }}
        />

        {showIncome && (
          <Area
            type="monotone"
            dataKey="income"
            stroke={INCOME_COLOR}
            strokeWidth={2}
            fill="url(#incomeGrad)"
            dot={false}
            activeDot={<ActiveDot fill={INCOME_COLOR} />}
          />
        )}
        {showExpense && (
          <Area
            type="monotone"
            dataKey="expense"
            stroke={EXPENSE_COLOR}
            strokeWidth={2}
            fill="url(#expenseGrad)"
            dot={false}
            activeDot={<ActiveDot fill={EXPENSE_COLOR} />}
          />
        )}
        {showNet && (
          <Area
            type="monotone"
            dataKey="net"
            stroke={NET_COLOR}
            strokeWidth={2}
            fill="url(#netGrad)"
            dot={false}
            activeDot={<ActiveDot fill={NET_COLOR} />}
          />
        )}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
