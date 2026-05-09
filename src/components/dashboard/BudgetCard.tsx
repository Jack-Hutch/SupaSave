import React from 'react';
import { formatCurrency } from '../../lib/utils';

interface BudgetCardProps {
  category: string;
  budget: number;
  spent: number;
  currency?: string;
}

export function BudgetCard({ category, budget, spent, currency = 'AUD' }: BudgetCardProps) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = spent > budget;
  const remaining = budget - spent;

  const barColor = over
    ? 'bg-expense'
    : pct > 80
    ? 'bg-warn'
    : 'bg-accent';

  return (
    <div className="rounded-xl border border-border-base bg-surface p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-medium text-foreground">{category}</span>
        <span className={`text-xs font-mono ${over ? 'text-expense' : 'text-foreground-muted'}`}>
          {formatCurrency(spent, currency)} / {formatCurrency(budget, currency)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-foreground-subtle">
          {pct.toFixed(0)}% used
        </span>
        <span className={`text-xs font-mono ${over ? 'text-expense' : 'text-foreground-subtle'}`}>
          {over
            ? `${formatCurrency(Math.abs(remaining), currency)} over`
            : `${formatCurrency(remaining, currency)} left`}
        </span>
      </div>
    </div>
  );
}
