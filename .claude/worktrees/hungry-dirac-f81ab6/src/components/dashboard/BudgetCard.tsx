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

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-medium text-gray-200">{category}</span>
        <span className={`text-xs font-mono ${over ? 'text-red-400' : 'text-gray-400'}`}>
          {formatCurrency(spent, currency)} / {formatCurrency(budget, currency)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            over
              ? 'bg-red-500'
              : pct > 80
              ? 'bg-yellow-500'
              : 'bg-indigo-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {pct.toFixed(0)}% used
        </span>
        <span className={`text-xs ${over ? 'text-red-400' : 'text-gray-500'}`}>
          {over
            ? `${formatCurrency(Math.abs(remaining), currency)} over`
            : `${formatCurrency(remaining, currency)} left`}
        </span>
      </div>
    </div>
  );
}
