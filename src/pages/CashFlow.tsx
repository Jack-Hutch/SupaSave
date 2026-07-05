import React, { useMemo, useState, useDeferredValue } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { AreaChart } from '../components/charts/AreaChart';
import { BarChart } from '../components/charts/BarChart';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { getDashboardStats, getMonthlyComparisons, getChartSeries } from '../utils/analyticsUtils';
import { formatCurrency } from '../lib/utils';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { SHARED_ID, sharedTransition, TAB_SPRING } from '../lib/motion';

type Period = 'week' | 'month' | 'year';

export function CashFlow() {
  const transactions = useFinanceStore((s) => s.transactions);
  const settings = useFinanceStore((s) => s.settings);
  const currency = settings.currency || 'AUD';

  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0);

  const currentDate = useMemo(() => {
    if (period === 'month') return subMonths(new Date(), Math.abs(offset));
    return new Date();
  }, [period, offset]);

  const periodLabel = useMemo(() => {
    if (period === 'month') return format(currentDate, 'MMMM yyyy');
    if (period === 'week') return 'Last 7 days';
    return 'Last 12 months';
  }, [period, currentDate]);

  // Defer heavy derived computations so the page paints before O(n) work blocks the thread.
  const deferredTransactions = useDeferredValue(transactions);

  const filteredTx = useMemo(() => {
    if (period === 'month') {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      return deferredTransactions.filter((tx) => tx.date >= start && tx.date <= end);
    }
    return deferredTransactions;
  }, [deferredTransactions, period, currentDate]);

  const stats = useMemo(() => getDashboardStats(filteredTx), [filteredTx]);
  const chartData = useMemo(() => getChartSeries(deferredTransactions, period), [deferredTransactions, period]);
  const monthlyData = useMemo(() => getMonthlyComparisons(deferredTransactions), [deferredTransactions]);

  const savingsRate =
    stats.totalIncome > 0
      ? ((stats.netCashFlow / stats.totalIncome) * 100).toFixed(1)
      : '0.0';

  const periods: Period[] = ['week', 'month', 'year'];

  return (
    <div className="max-w-5xl mx-auto px-8 py-9 space-y-5">
      {/* Period selector — sliding pill indicator */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex items-center rounded-lg border border-border-base bg-surface overflow-hidden">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setOffset(0); }}
              className="relative px-3 py-1.5 text-sm font-medium capitalize z-10"
            >
              {/*
                Sliding background pill — same layoutId technique as the
                sidebar indicator. The highlight physically slides between
                period options instead of cutting.
              */}
              {period === p && (
                <motion.div
                  layoutId="cashflow-period-pill"
                  className="absolute inset-0 bg-accent/20 border border-accent/30"
                  transition={TAB_SPRING}
                  style={{ borderRadius: 6 }}
                />
              )}
              <span
                className={`relative z-10 transition-colors duration-150 ${
                  period === p ? 'text-accent' : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {p}
              </span>
            </button>
          ))}
        </div>

        {period === 'month' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((o) => o - 1)}
              className="rounded p-1.5 text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {/* Keyed remount, enter-only — mode="wait" wedges under StrictMode in dev */}
            <motion.span
              key={periodLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="text-sm font-medium text-foreground min-w-[120px] text-center"
            >
              {periodLabel}
            </motion.span>
            <button
              onClick={() => setOffset((o) => Math.min(o + 1, 0))}
              disabled={offset === 0}
              className="rounded p-1.5 text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/*
        Summary cards — same layoutIds as Dashboard.
        These three boxes physically fly from the Dashboard grid to
        this grid when navigating between the two pages.
        Their border lines stretch and reshape to fit the new column width.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          layoutId={SHARED_ID.statIncome}
          type="income"
          amount={stats.totalIncome}
          label="Income"
          currency={currency}
        />
        <SummaryCard
          layoutId={SHARED_ID.statExpense}
          type="expense"
          amount={stats.totalExpense}
          label="Expenses"
          currency={currency}
        />
        <SummaryCard
          layoutId={SHARED_ID.statNet}
          type="net"
          amount={stats.netCashFlow}
          label="Net"
          currency={currency}
        />
      </div>

      {/* Savings rate card */}
      <div className="rounded-xl border border-border-base bg-surface p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-foreground-subtle uppercase tracking-wider">Savings Rate</p>
          <p
            className={`mt-1 text-2xl font-bold font-mono ${
              parseFloat(savingsRate) >= 0 ? 'text-income' : 'text-expense'
            }`}
          >
            {savingsRate}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-foreground-subtle">Transactions</p>
          <p className="text-2xl font-bold text-foreground">{stats.transactionCount}</p>
        </div>
      </div>

      {/*
        Area chart — layoutId matches the "This Week" card on Analytics Overview.
        Navigate CashFlow → Analytics and this card travels to the bottom of
        the overview section, the border lines reshaping as it moves.
      */}
      <motion.div
        layoutId={SHARED_ID.cardAreaTrend}
        transition={sharedTransition}
        style={{ borderRadius: 12 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Trend</CardTitle>
          </CardHeader>
          <AreaChart
            data={chartData}
            currency={currency}
            height={220}
            showIncome
            showExpense
            showNet={false}
          />
        </Card>
      </motion.div>

      {/*
        Monthly comparison bar chart — layoutId matches the same card inside
        Analytics > Performance tab. Switching between those two pages
        animates this card's border rectangle from one position to the other.
      */}
      <motion.div
        layoutId={SHARED_ID.cardBarMonthly}
        transition={sharedTransition}
        style={{ borderRadius: 12 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Monthly Income vs Expenses</CardTitle>
          </CardHeader>
          <BarChart data={monthlyData.slice(-6)} currency={currency} height={220} />
        </Card>
      </motion.div>

      {/* P&L table */}
      <Card>
        <CardHeader>
          <CardTitle>P&L Summary</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-base">
                <th className="text-left py-2 text-xs font-medium text-foreground-subtle">Month</th>
                <th className="text-right py-2 text-xs font-medium text-foreground-subtle">Income</th>
                <th className="text-right py-2 text-xs font-medium text-foreground-subtle">Expenses</th>
                <th className="text-right py-2 text-xs font-medium text-foreground-subtle">Net</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.slice(-6).reverse().length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-foreground-subtle">
                    No data for this period
                  </td>
                </tr>
              ) : (
                monthlyData
                  .slice(-6)
                  .reverse()
                  .map((row) => (
                    <tr
                      key={row.month}
                      className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                    >
                      <td className="py-2 text-foreground">{row.month}</td>
                      <td className="py-2 text-right font-mono text-income">
                        {formatCurrency(row.income, currency)}
                      </td>
                      <td className="py-2 text-right font-mono text-expense">
                        {formatCurrency(row.expense, currency)}
                      </td>
                      <td
                        className={`py-2 text-right font-mono font-semibold ${
                          row.net >= 0 ? 'text-income' : 'text-expense'
                        }`}
                      >
                        {row.net >= 0 ? '+' : ''}
                        {formatCurrency(row.net, currency)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
