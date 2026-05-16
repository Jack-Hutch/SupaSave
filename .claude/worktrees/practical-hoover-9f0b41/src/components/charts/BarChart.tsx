import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MonthlyComparison } from '../../types';

const INCOME_COLOR  = '#4ade80';
const EXPENSE_COLOR = '#f87171';

interface BarChartProps {
  data:      MonthlyComparison[];
  currency?: string;
  height?:   number;
}

interface TooltipPayloadItem {
  dataKey: string;
  value:   number;
  color:   string;
}

interface RawTooltipProps {
  active?:   boolean;
  payload?:  TooltipPayloadItem[];
  label?:    string;
  currency?: string;
}

function CustomTooltip({ active, payload, label, currency = 'AUD' }: RawTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  const map = Object.fromEntries(payload.map((p) => [p.dataKey, p.value]));

  const rows = [
    { label: 'Income',   value: map['income']  ?? 0, color: INCOME_COLOR  },
    { label: 'Expenses', value: map['expense'] ?? 0, color: EXPENSE_COLOR },
  ];

  // Net delta line
  const net = (map['income'] ?? 0) - (map['expense'] ?? 0);
  const netColor = net >= 0 ? INCOME_COLOR : EXPENSE_COLOR;

  return (
    <div
      style={{
        background:   'rgb(var(--surface-raised))',
        border:       '1px solid rgb(var(--border-strong))',
        borderRadius: 10,
        padding:      '10px 13px',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.15)',
        minWidth:     160,
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          fontSize:      10.5,
          fontWeight:    600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color:         'rgb(var(--foreground-subtle))',
          marginBottom:  8,
        }}
      >
        {label}
      </p>

      {rows.map((row) => (
        <div
          key={row.label}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: row.color, display: 'block', flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: 'rgb(var(--foreground-muted))', fontWeight: 500 }}>{row.label}</span>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12, color: row.color, letterSpacing: '-0.01em' }}>
            {currency === 'AUD' ? 'A$' : '$'}{row.value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}

      {/* Net divider + total */}
      <div
        style={{
          marginTop:   8,
          paddingTop:  8,
          borderTop:   '1px solid rgb(var(--border-base))',
          display:     'flex',
          justifyContent: 'space-between',
          alignItems:  'center',
        }}
      >
        <span style={{ fontSize: 11, color: 'rgb(var(--foreground-subtle))', fontWeight: 500 }}>
          Net
        </span>
        <span
          style={{
            fontFamily:    'JetBrains Mono, Fira Code, monospace',
            fontSize:      12,
            fontWeight:    700,
            color:         netColor,
            letterSpacing: '-0.01em',
          }}
        >
          {net >= 0 ? '+' : ''}{currency === 'AUD' ? 'A$' : '$'}{Math.abs(net).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

export function BarChart({ data, currency = 'AUD', height = 240 }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-foreground-subtle">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={3} barCategoryGap="28%">
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgb(var(--border-default))"
          vertical={false}
          strokeOpacity={0.6}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: 'rgb(var(--foreground-subtle))', fontSize: 10, fontFamily: 'inherit' }}
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
          content={<CustomTooltip currency={currency} />}
          cursor={{
            fill:         'rgb(var(--surface-raised))',
            radius:       4,
            fillOpacity:  0.6,
          }}
        />
        <Bar
          dataKey="income"
          fill={INCOME_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={18}
          fillOpacity={0.85}
        />
        <Bar
          dataKey="expense"
          fill={EXPENSE_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={18}
          fillOpacity={0.85}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
