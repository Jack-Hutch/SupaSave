import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFinanceStore } from '../store/financeStore';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { DonutChart } from '../components/charts/DonutChart';
import { BarChart } from '../components/charts/BarChart';
import { AreaChart } from '../components/charts/AreaChart';
import { formatCurrency } from '../lib/utils';
import {
  getCategoryTotals,
  getMonthlyComparisons,
  getMerchantStats,
  getDashboardStats,
  getChartSeries,
} from '../utils/analyticsUtils';
import { getCategoryDef, getCategoryHex, COLOR_CLASSES } from '../lib/categories';
import { SHARED_ID, sharedTransition, TAB_SPRING } from '../lib/motion';

type Tab = 'overview' | 'performance' | 'breakdown';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',    label: 'Overview'     },
  { id: 'performance', label: 'Performance'  },
  { id: 'breakdown',   label: 'Breakdown'    },
];

export function Analytics() {
  const transactions = useFinanceStore((s) => s.transactions);
  const settings = useFinanceStore((s) => s.settings);

  const [tab, setTab] = useState<Tab>('overview');

  const currency         = settings.currency || 'AUD';
  const customCategories = settings.customCategories ?? [];

  const categoryTotals = useMemo(() => getCategoryTotals(transactions), [transactions]);
  const monthlyData    = useMemo(() => getMonthlyComparisons(transactions), [transactions]);
  const merchantStats  = useMemo(() => getMerchantStats(transactions).slice(0, 10), [transactions]);
  const stats          = useMemo(() => getDashboardStats(transactions), [transactions]);
  const weeklyChart    = useMemo(() => getChartSeries(transactions, 'week'), [transactions]);

  const donutData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const donutColors = donutData.map(({ name }) => getCategoryHex(name, customCategories));

  return (
    <div className="max-w-5xl mx-auto px-8 py-9 space-y-5">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="flex items-center gap-3 mb-[6px]">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Analytics</h1>
          </div>
          <p className="text-[13.5px] text-foreground-muted">Deep-dive into your spending patterns and trends.</p>
        </div>
        <div>
          {/*
            Internal tab bar — uses the same shared-element pill pattern as the
            sidebar. The accent background slides between tabs instead of
            re-rendering as a new element each time.
          */}
          <div className="flex items-center gap-0 rounded-lg border border-border-base bg-surface p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative px-4 py-1.5 text-sm font-medium"
              >
                {tab === t.id && (
                  <motion.div
                    layoutId="analytics-tab-bg"
                    className="absolute inset-0 rounded-md bg-accent shadow-sm"
                    transition={TAB_SPRING}
                    style={{ borderRadius: 6 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors duration-150 ${
                    tab === t.id ? 'text-accent-fg' : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/*
        Tab content — each tab panel slides in/out vertically within the
        Analytics page. This is an INTRA-page transition (within Analytics),
        separate from the cross-page transitions handled by layoutId.
      */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-5"
        >
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/*
                  Donut card — same layoutId as the "Spending by Category" card
                  on Dashboard. Navigate Dashboard → Analytics and this card
                  expands from the narrow left column there to the full
                  half-width grid here, with its border lines reshaping.
                */}
                <motion.div
                  layoutId={SHARED_ID.cardDonut}
                  layout
                  transition={sharedTransition}
                  style={{ borderRadius: 12 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Spending by Category</CardTitle>
                    </CardHeader>
                    <DonutChart data={donutData} currency={currency} height={260} colors={donutColors} />
                  </Card>
                </motion.div>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Merchants</CardTitle>
                  </CardHeader>
                  {merchantStats.length === 0 ? (
                    <p className="text-sm text-foreground-subtle py-8 text-center">No data</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {merchantStats.map((m, i) => (
                        <div key={m.name} className="flex items-center gap-3">
                          <span className="text-xs text-foreground-subtle w-4">{i + 1}</span>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-foreground-muted shrink-0">
                            {m.logo ? (
                              <img
                                src={m.logo}
                                alt={m.name}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              m.name.charAt(0)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{m.name}</p>
                            <p className="text-xs text-foreground-subtle">{m.count} transactions</p>
                          </div>
                          <span className="text-sm font-mono font-semibold text-expense">
                            {formatCurrency(m.totalSpend, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/*
                Area chart — layoutId matches "Cash Flow Trend" card on CashFlow page.
                Navigate Analytics → Cash Flow and this card travels to its position there.
              */}
              <motion.div
                layoutId={SHARED_ID.cardAreaTrend}
                layout
                transition={sharedTransition}
                style={{ borderRadius: 12 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>This Week</CardTitle>
                  </CardHeader>
                  <AreaChart
                    data={weeklyChart}
                    currency={currency}
                    height={200}
                    showIncome
                    showExpense
                  />
                </Card>
              </motion.div>
            </div>
          )}

          {tab === 'performance' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Total Income',
                    value: formatCurrency(stats.totalIncome, currency),
                    color: 'text-income',
                  },
                  {
                    label: 'Total Expenses',
                    value: formatCurrency(stats.totalExpense, currency),
                    color: 'text-expense',
                  },
                  {
                    label: 'Net Cash Flow',
                    value: formatCurrency(stats.netCashFlow, currency),
                    color: stats.netCashFlow >= 0 ? 'text-income' : 'text-expense',
                  },
                  {
                    label: 'Transactions',
                    value: stats.transactionCount.toString(),
                    color: 'text-accent',
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-border-base bg-surface p-4"
                  >
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-foreground-subtle">{s.label}</p>
                    <p className={`mt-2.5 font-mono text-[22px] font-bold leading-none ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/*
                Monthly bar chart — layoutId matches the same card in CashFlow.
                Navigate Analytics (Performance) → Cash Flow and this card
                travels from its position here to its position there.
              */}
              <motion.div
                layoutId={SHARED_ID.cardBarMonthly}
                layout
                transition={sharedTransition}
                style={{ borderRadius: 12 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Income vs Expenses</CardTitle>
                  </CardHeader>
                  <BarChart data={monthlyData.slice(-12)} currency={currency} height={240} />
                </Card>
              </motion.div>
            </div>
          )}

          {tab === 'breakdown' && (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                {Object.keys(categoryTotals).length === 0 ? (
                  <p className="text-sm text-foreground-subtle py-8 text-center">
                    No expense data
                  </p>
                ) : (
                  <div className="space-y-3 mt-2">
                    {Object.entries(categoryTotals)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, amount]) => {
                        const max        = Math.max(...Object.values(categoryTotals));
                        const pct        = (amount / max) * 100;
                        const catDef     = getCategoryDef(cat, customCategories);
                        const swatchCls  = catDef
                          ? COLOR_CLASSES[catDef.color].swatch
                          : 'bg-accent';
                        const total      = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
                        const share      = total > 0 ? Math.round((amount / total) * 100) : 0;
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                {catDef?.icon && (
                                  <span className="text-sm leading-none">{catDef.icon}</span>
                                )}
                                <span className="text-sm text-foreground truncate">{cat}</span>
                                <span className="text-xs text-foreground-subtle shrink-0">{share}%</span>
                              </div>
                              <span className="text-sm font-mono text-foreground-muted shrink-0 ml-3">
                                {formatCurrency(amount, currency)}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-surface-raised">
                              <motion.div
                                className={`h-full rounded-full ${swatchCls}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{
                                  duration: 0.6,
                                  ease: [0.32, 0.72, 0, 1],
                                  delay: 0.05,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
