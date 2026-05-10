/**
 * Shared tooltip design for all SupaSave charts.
 * Used by AreaChart, BarChart, and DonutChart.
 */
import React from 'react';
import { formatCurrency } from '../../lib/utils';

interface TooltipRow {
  label:  string;
  value:  number;
  color:  string;
  pct?:   number; // optional percentage (donut)
}

interface ChartTooltipProps {
  title:    string;
  rows:     TooltipRow[];
  currency: string;
}

export function ChartTooltip({ title, rows, currency }: ChartTooltipProps) {
  return (
    <div
      style={{
        background:   'rgb(var(--surface-raised))',
        border:       '1px solid rgb(var(--border-strong))',
        borderRadius: 10,
        padding:      '10px 13px',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.15)',
        minWidth:     150,
        pointerEvents: 'none',
      }}
    >
      {/* Title */}
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
        {title}
      </p>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
          >
            {/* Label + swatch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span
                style={{
                  width:        8,
                  height:       8,
                  borderRadius: 2,
                  background:   row.color,
                  flexShrink:   0,
                  display:      'block',
                }}
              />
              <span
                style={{
                  fontSize: 11.5,
                  color:    'rgb(var(--foreground-muted))',
                  fontWeight: 500,
                }}
              >
                {row.label}
              </span>
              {row.pct !== undefined && (
                <span
                  style={{
                    fontSize:   10.5,
                    fontFamily: 'monospace',
                    color:      'rgb(var(--foreground-subtle))',
                  }}
                >
                  {row.pct.toFixed(1)}%
                </span>
              )}
            </div>

            {/* Value */}
            <span
              style={{
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                fontWeight: 600,
                fontSize:   12,
                color:      row.color,
                letterSpacing: '-0.01em',
              }}
            >
              {formatCurrency(row.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
