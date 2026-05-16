import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { ChartTooltip } from './ChartTooltip';

const FALLBACK_COLORS = [
  '#6cb6ff', '#f5b461', '#c692ff', '#8a8d97',
  '#6ce5d0', '#ff8fb1', '#b6e36b', '#7c6cff',
];

interface DonutChartProps {
  data:      Array<{ name: string; value: number }>;
  currency?: string;
  height?:   number;
  colors?:   string[];
}

interface TooltipPayloadItem {
  name:    string;
  value:   number;
  payload: { name: string; value: number };
}

interface RawTooltipProps {
  active?:   boolean;
  payload?:  TooltipPayloadItem[];
  currency?: string;
  total?:    number;
  colors?:   string[];
  data?:     Array<{ name: string; value: number }>;
}

function CustomTooltip({ active, payload, currency = 'AUD', total = 1, colors = FALLBACK_COLORS, data = [] }: RawTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const idx  = data.findIndex((d) => d.name === item.name);
  const color = colors[idx] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  const pct  = total > 0 ? (item.value / total) * 100 : 0;

  return (
    <ChartTooltip
      title={item.name}
      rows={[{ label: item.name, value: item.value, color, pct }]}
      currency={currency}
    />
  );
}

// Active slice — slightly expanded with an outer ring glow
function ActiveSlice({
  cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill,
}: {
  cx: number; cy: number;
  innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number;
  fill: string;
}) {
  return (
    <g>
      {/* Glow layer behind the slice */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.18}
      />
      {/* Main slice — slightly expanded */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.95}
      />
    </g>
  );
}

export function DonutChart({ data, currency = 'AUD', height = 280, colors }: DonutChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center gap-2 px-4">
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
  const resolvedColors = data.map((_, i) => colors?.[i] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]);

  const activeItem = activeIdx !== null ? data[activeIdx] : null;
  const activeColor = activeIdx !== null ? resolvedColors[activeIdx] : undefined;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="48%"
          innerRadius="52%"
          outerRadius="70%"
          paddingAngle={2}
          dataKey="value"
          stroke="none"
          activeIndex={activeIdx ?? undefined}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activeShape={(props: any) => <ActiveSlice {...props} />}
          onMouseEnter={(_, index) => setActiveIdx(index)}
          onMouseLeave={() => setActiveIdx(null)}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={resolvedColors[index]}
              opacity={activeIdx === null || activeIdx === index ? 1 : 0.35}
              style={{ cursor: 'pointer', transition: 'opacity 160ms' }}
            />
          ))}
        </Pie>

        {/* Centre text — changes to active slice when hovering */}
        <text
          x="50%" y="43%"
          textAnchor="middle" dominantBaseline="middle"
          fill={activeColor ?? 'rgb(var(--foreground-subtle))'}
          fontSize={10.5}
          fontWeight={600}
          letterSpacing="0.08em"
          style={{ textTransform: 'uppercase', transition: 'fill 160ms' }}
        >
          {activeItem ? activeItem.name : 'Total'}
        </text>
        <text
          x="50%" y="52%"
          textAnchor="middle" dominantBaseline="middle"
          fill={activeColor ?? 'rgb(var(--foreground))'}
          fontSize={15}
          fontWeight={700}
          fontFamily="JetBrains Mono, Fira Code, monospace"
          letterSpacing="-0.02em"
        >
          {activeItem
            ? formatCurrency(activeItem.value, currency)
            : formatCurrency(total, currency)}
        </text>
        {activeItem && (
          <text
            x="50%" y="61%"
            textAnchor="middle" dominantBaseline="middle"
            fill="rgb(var(--foreground-subtle))"
            fontSize={10.5}
            fontFamily="JetBrains Mono, Fira Code, monospace"
          >
            {((activeItem.value / total) * 100).toFixed(1)}%
          </text>
        )}

        <Tooltip
          content={
            <CustomTooltip
              currency={currency}
              total={total}
              colors={resolvedColors}
              data={data}
            />
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
