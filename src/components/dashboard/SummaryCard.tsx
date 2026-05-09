import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { sharedTransition } from '../../lib/motion';

type SummaryType = 'income' | 'expense' | 'net';

interface SummaryCardProps {
  type: SummaryType;
  amount: number;
  label: string;
  currency?: string;
  trend?: number;
  /** When provided, this card participates in cross-page shared-element transitions. */
  layoutId?: string;
}

const config: Record<SummaryType, {
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  income: {
    icon: TrendingUp,
    colorClass: 'text-income',
    bgClass: 'bg-income/10',
    borderClass: 'border-income/25',
  },
  expense: {
    icon: TrendingDown,
    colorClass: 'text-expense',
    bgClass: 'bg-expense/10',
    borderClass: 'border-expense/25',
  },
  net: {
    icon: Minus,
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
    borderClass: 'border-accent/25',
  },
};

export function SummaryCard({
  type,
  amount,
  label,
  currency = 'AUD',
  trend,
  layoutId,
}: SummaryCardProps) {
  const { icon: Icon, colorClass, bgClass, borderClass } = config[type];

  return (
    /*
      When `layoutId` is set, Framer Motion tracks this element's position.
      If the same layoutId appears on another page, the element physically
      animates from one page's position to the other — the card border lines
      literally travel through space and reshape into the new layout.

      `style={{ borderRadius: 12 }}` is required: without it, Framer Motion
      can't smoothly interpolate the border-radius during layout animation
      (it reads the actual computed value instead of knowing what we want).
    */
    <motion.div
      layoutId={layoutId}
      layout={!!layoutId}
      transition={layoutId ? sharedTransition : undefined}
      style={{ borderRadius: 12 }}
      className={`rounded-xl border bg-surface p-4 ${borderClass} relative`}
    >
      <div className={`absolute top-4 right-4 rounded-lg p-1.5 shrink-0 ${bgClass}`}>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </div>
      <p className="text-[10.5px] font-semibold text-foreground-subtle uppercase tracking-[0.09em] truncate pr-10">
        {label}
      </p>
      <p className={`mt-3 font-mono text-[26px] font-bold leading-none ${colorClass}`}>
        {formatCurrency(Math.abs(amount), currency)}
      </p>
      {trend !== undefined && (
        <p className="mt-2 text-xs text-foreground-subtle">
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last period
        </p>
      )}
    </motion.div>
  );
}
