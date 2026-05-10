import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
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

// Sparkline path data for each card type — decorative, shows a positive trend
const SPARKLINES: Record<SummaryType, { area: string; line: string; color: string }> = {
  income: {
    area:  'M0 26 L20 24 L40 22 L60 23 L80 18 L100 16 L120 14 L140 12 L160 10 L180 8 L200 6 L200 36 L0 36 Z',
    line:  'M0 26 L20 24 L40 22 L60 23 L80 18 L100 16 L120 14 L140 12 L160 10 L180 8 L200 6',
    color: 'rgba(74,222,128,0.10)',
  },
  expense: {
    area:  'M0 22 L20 20 L40 24 L60 18 L80 22 L100 16 L120 20 L140 14 L160 16 L180 12 L200 14 L200 36 L0 36 Z',
    line:  'M0 22 L20 20 L40 24 L60 18 L80 22 L100 16 L120 20 L140 14 L160 16 L180 12 L200 14',
    color: 'rgba(248,113,113,0.08)',
  },
  net: {
    area:  'M0 28 L20 26 L40 24 L60 22 L80 18 L100 20 L120 14 L140 12 L160 10 L180 6 L200 4 L200 36 L0 36 Z',
    line:  'M0 28 L20 26 L40 24 L60 22 L80 18 L100 20 L120 14 L140 12 L160 10 L180 6 L200 4',
    color: 'rgba(124,108,255,0.10)',
  },
};

const config: Record<SummaryType, {
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  iconBg: string;
  iconBorder: string;
  strokeColor: string;
}> = {
  income: {
    icon: TrendingUp,
    colorClass: 'text-income',
    iconBg: 'var(--income-soft)',
    iconBorder: 'rgba(74,222,128,0.18)',
    strokeColor: 'rgb(var(--income))',
  },
  expense: {
    icon: TrendingDown,
    colorClass: 'text-expense',
    iconBg: 'var(--expense-soft)',
    iconBorder: 'rgba(248,113,113,0.18)',
    strokeColor: 'rgb(var(--expense))',
  },
  net: {
    icon: ArrowRight,
    colorClass: 'text-accent',
    iconBg: 'var(--accent-soft)',
    iconBorder: 'rgba(124,108,255,0.22)',
    strokeColor: 'rgb(var(--accent))',
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
  const { icon: Icon, colorClass, iconBg, iconBorder, strokeColor } = config[type];
  const spark = SPARKLINES[type];

  const deltaUp = trend !== undefined && trend >= 0;
  const deltaDown = trend !== undefined && trend < 0;

  return (
    <motion.div
      layoutId={layoutId}
      layout={!!layoutId}
      transition={layoutId ? sharedTransition : undefined}
      style={{ borderRadius: 14, position: 'relative', overflow: 'hidden' }}
      className="border border-border-base bg-surface px-5 pt-[18px] pb-0 hover:border-border-strong hover:bg-surface-raised transition-colors"
    >
      {/* Icon */}
      <div
        className="absolute top-[18px] right-[18px] flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
      >
        <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
      </div>

      {/* Label */}
      <p className="text-[10.5px] font-semibold text-foreground-subtle uppercase tracking-[0.09em] pr-10">
        {label}
      </p>

      {/* Amount */}
      <p className={`mt-[18px] font-mono text-[28px] font-bold leading-[1.1] tracking-[-0.02em] ${colorClass}`}>
        <span className="text-foreground-subtle font-medium mr-[2px] text-[22px]">$</span>
        {formatCurrency(Math.abs(amount), currency).replace(/^[A-Z$]+/, '')}
      </p>

      {/* Delta / meta */}
      <div className="mt-2 mb-[20px] flex items-center gap-1.5 text-[12px] text-foreground-muted">
        {trend !== undefined ? (
          <>
            <span
              className="font-mono font-medium text-[11.5px] px-1.5 py-[1px] rounded-[5px]"
              style={{
                color: deltaUp ? 'rgb(var(--income))' : deltaDown ? 'rgb(var(--expense))' : 'rgb(var(--foreground-muted))',
                background: deltaUp ? 'var(--income-soft)' : deltaDown ? 'var(--expense-soft)' : 'rgb(var(--surface-raised))',
              }}
            >
              {deltaUp ? '+' : ''}{trend.toFixed(1)}%
            </span>
            <span>vs last period</span>
          </>
        ) : (
          <span className="text-foreground-subtle text-[12px]">this month</span>
        )}
      </div>

      {/* Sparkline — sits flush at bottom */}
      <svg
        viewBox="0 0 200 36"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 right-0 w-full"
        style={{ height: 36, pointerEvents: 'none', opacity: 0.45 }}
        aria-hidden="true"
      >
        <path d={spark.area} fill={spark.color} />
        <path d={spark.line} fill="none" stroke={strokeColor} strokeWidth="1.4" />
      </svg>
    </motion.div>
  );
}
