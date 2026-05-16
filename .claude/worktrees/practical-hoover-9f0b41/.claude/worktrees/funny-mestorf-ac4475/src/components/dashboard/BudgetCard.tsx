import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { getCategoryHex } from '../../lib/categories';
import type { CategoryDef } from '../../types';

interface BudgetCardProps {
  category: string;
  budget: number;
  spent: number;
  currency?: string;
  customCategories?: CategoryDef[];
}

export function BudgetCard({
  category,
  budget,
  spent,
  currency = 'AUD',
  customCategories,
}: BudgetCardProps): React.ReactElement {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = spent > budget;
  const remaining = budget - spent;

  const baseHex = getCategoryHex(category, customCategories) || '#6366f1';
  const fillHex = over ? '#f87171' : pct > 80 ? '#fbbf24' : baseHex;

  const chartData = [
    {
      name: category,
      value: pct,
      fill: fillHex,
    },
  ];

  return (
    <div className="rounded-xl border border-border-base bg-surface p-4">
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium text-foreground truncate">{category}</span>
        <span className={`text-[10px] font-mono shrink-0 ${over ? 'text-expense' : 'text-foreground-subtle'}`}>
          {pct.toFixed(0)}%
        </span>
      </div>

      <div className="relative h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="74%"
            outerRadius="100%"
            data={chartData}
            startAngle={90}
            endAngle={-270}
            barSize={10}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'rgb(var(--surface-raised))' }}
              dataKey="value"
              cornerRadius={6}
              isAnimationActive={true}
              animationDuration={600}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className={`text-base font-semibold tabular-nums leading-tight ${
              over ? 'text-expense' : 'text-foreground'
            }`}
          >
            {formatCurrency(spent, currency)}
          </span>
          <span className="text-[10px] text-foreground-subtle">
            of {formatCurrency(budget, currency)}
          </span>
        </div>
      </div>

      <div className="mt-1 text-center">
        <span className={`text-xs ${over ? 'text-expense' : 'text-foreground-muted'}`}>
          {over
            ? `${formatCurrency(Math.abs(remaining), currency)} over`
            : `${formatCurrency(remaining, currency)} left`}
        </span>
      </div>
    </div>
  );
}
