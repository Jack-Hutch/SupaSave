import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, subMonths } from 'date-fns';
import { BarChart3, TrendingUp, Trophy } from 'lucide-react';
import { DonutChart } from '../charts/DonutChart';
import { AreaChart } from '../charts/AreaChart';
import { formatCurrency } from '../../lib/utils';
import { getCategoryHex } from '../../lib/categories';
import { toMonthlyEquivalent } from '../../utils/subscriptionUtils';
import { isLinkedToSubscription } from '../../utils/subscriptionUtils';
import type { Membership, Transaction, CategoryDef, ChartDataPoint } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubscriptionAnalyticsProps {
  memberships:       Membership[];
  transactions:      Transaction[];
  currency:          string;
  customCategories?: CategoryDef[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Aggregate each membership's monthly-equivalent cost by its category.
 * Returns a sorted list of { name, value, color } for the donut.
 */
function buildCategoryBreakdown(
  memberships:      Membership[],
  customCategories?: CategoryDef[],
): Array<{ name: string; value: number; color: string }> {
  const totals: Record<string, number> = {};
  for (const m of memberships) {
    const monthly = toMonthlyEquivalent(m.cost, m.billing_cycle);
    totals[m.category] = (totals[m.category] ?? 0) + monthly;
  }
  return Object.entries(totals)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: getCategoryHex(name, customCategories),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Build the last N months of subscription spending from linked transactions.
 * Falls back to a projection of the current monthly equivalent when no
 * linked history exists for that month — so new users still see a chart.
 */
function buildMonthlyTrend(
  memberships:  Membership[],
  transactions: Transaction[],
  months = 6,
): ChartDataPoint[] {
  const now = new Date();
  const buckets: { label: string; key: string }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i));
    buckets.push({ label: format(d, 'MMM'), key: format(d, 'yyyy-MM') });
  }

  // Sum linked subscription transaction amounts per month
  const linkedByMonth: Record<string, number> = {};
  for (const tx of transactions) {
    if (!isLinkedToSubscription(tx.tags)) continue;
    if (tx.is_income) continue;
    const key = tx.date.slice(0, 7); // yyyy-MM
    linkedByMonth[key] = (linkedByMonth[key] ?? 0) + Math.abs(tx.amount);
  }

  // Fallback projection = total monthly equivalent across all memberships
  const projected = memberships.reduce(
    (s, m) => s + toMonthlyEquivalent(m.cost, m.billing_cycle),
    0,
  );

  return buckets.map(({ label, key }) => {
    const actual = linkedByMonth[key];
    const value  = actual ?? projected;
    return { label, income: 0, expense: Math.round(value * 100) / 100, net: 0 };
  });
}

/** Top N largest subscriptions (by monthly equivalent). */
function buildLargest(memberships: Membership[], n = 5) {
  return [...memberships]
    .map((m) => ({
      id:       m.id,
      name:     m.name,
      icon:     m.icon,
      category: m.category,
      cycle:    m.billing_cycle,
      cost:     m.cost,
      monthly:  toMonthlyEquivalent(m.cost, m.billing_cycle),
    }))
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubscriptionAnalytics({
  memberships,
  transactions,
  currency,
  customCategories,
}: SubscriptionAnalyticsProps) {
  const categoryData = useMemo(
    () => buildCategoryBreakdown(memberships, customCategories),
    [memberships, customCategories],
  );

  const trendData = useMemo(
    () => buildMonthlyTrend(memberships, transactions),
    [memberships, transactions],
  );

  const largest = useMemo(() => buildLargest(memberships), [memberships]);

  const largestMax = largest[0]?.monthly ?? 0;

  // Don't render the section at all if nothing to show
  if (memberships.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 px-1">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
          Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* ── Spending by category ─────────────────────────────────── */}
        <div className="rounded-xl border border-border-base bg-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Spending by category
            </span>
          </div>
          <p className="text-[11px] text-foreground-subtle mb-2">
            Monthly equivalent, grouped by category
          </p>
          <DonutChart
            data={categoryData.map(({ name, value }) => ({ name, value }))}
            colors={categoryData.map((c) => c.color)}
            currency={currency}
            height={240}
          />
        </div>

        {/* ── Monthly trend ────────────────────────────────────────── */}
        <div className="rounded-xl border border-border-base bg-surface p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Monthly trend
            </span>
          </div>
          <p className="text-[11px] text-foreground-subtle mb-2">
            Last 6 months — linked payments where available, projected otherwise
          </p>
          <AreaChart
            data={trendData}
            currency={currency}
            height={240}
            showIncome={false}
            showExpense
            showNet={false}
          />
        </div>
      </div>

      {/* ── Largest subscriptions ───────────────────────────────────── */}
      <div className="rounded-xl border border-border-base bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
            Largest subscriptions
          </span>
        </div>

        <div className="space-y-2">
          {largest.map((s) => {
            const pct = largestMax > 0 ? (s.monthly / largestMax) * 100 : 0;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-base select-none">
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {s.name}
                    </p>
                    <p className="font-mono text-xs font-semibold text-foreground shrink-0">
                      {formatCurrency(s.monthly, currency)}
                      <span className="text-foreground-subtle font-normal">/mo</span>
                    </p>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: getCategoryHex(s.category, customCategories) }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
