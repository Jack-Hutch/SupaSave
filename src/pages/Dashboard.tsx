import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore } from '../store/financeStore';
import { useAuth } from '../hooks/useAuth';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { BudgetCard } from '../components/dashboard/BudgetCard';
import { DonutChart } from '../components/charts/DonutChart';
import { TransactionList } from '../components/transactions/TransactionList';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getDashboardStats, getCategoryTotals } from '../utils/analyticsUtils';
import { getCategoryHex } from '../lib/categories';
import { Link as LinkIcon, RefreshCw } from 'lucide-react';
import { SHARED_ID, sharedTransition } from '../lib/motion';

/*
  Stagger only fades children in — no y-movement.
  Y-movement on individual items would fight the shared-element layout
  animations (which handle their own spatial paths via layoutId).
*/
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
};

export function Dashboard() {
  useAuth(); // keep auth context hydrated
  const navigate = useNavigate();
  const transactions = useFinanceStore((s) => s.transactions);
  const budgets = useFinanceStore((s) => s.budgets);
  const settings = useFinanceStore((s) => s.settings);
  const bankConnection = useFinanceStore((s) => s.bankConnection);
  const syncing = useFinanceStore((s) => s.syncing);
  const syncBankTransactions = useFinanceStore((s) => s.syncBankTransactions);

  const currentMonthTx = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions.filter((tx) => tx.date.startsWith(prefix));
  }, [transactions]);

  const stats = useMemo(() => getDashboardStats(currentMonthTx), [currentMonthTx]);
  const categoryTotals = useMemo(() => getCategoryTotals(currentMonthTx), [currentMonthTx]);

  const customCategories = useMemo(
    () => settings.customCategories ?? [],
    [settings.customCategories]
  );

  const donutData = useMemo(
    () => Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value })),
    [categoryTotals]
  );

  const donutColors = useMemo(
    () => donutData.map(({ name }) => getCategoryHex(name, customCategories)),
    [donutData, customCategories]
  );

  const budgetCategories = useMemo(() => Object.entries(budgets), [budgets]);
  const recentTx = useMemo(() => transactions.slice(0, 8), [transactions]);
  const currency = settings.currency || 'AUD';

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto px-8 py-9 space-y-5"
    >
      {/* Page header */}
      <motion.div variants={item} className="flex items-end justify-between mb-1">
        <div>
          <div className="flex items-center gap-3 mb-[6px]">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Dashboard</h1>
            <span
              className="font-mono text-[11px] font-medium px-2 py-[3px] rounded-[5px] tracking-[0.02em]"
              style={{ color: 'rgb(var(--accent))', background: 'var(--accent-soft)' }}
            >
              {monthLabel}
            </span>
          </div>
          <p className="text-[13.5px] text-foreground-muted">
            Your money at a glance — {monthLabel.split(' ')[0]} 1 to {monthLabel.split(' ')[0]} {dayOfMonth}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bankConnection?.status === 'connected' && (
            <Button size="sm" variant="outline" onClick={syncBankTransactions} loading={syncing}>
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </Button>
          )}
        </div>
      </motion.div>

      {/*
        Summary cards — each carries a layoutId that matches the same card
        on the CashFlow page. Navigating Dashboard → Cash Flow makes these
        three cards physically fly from their grid positions here to their
        positions there, with the border lines reshaping to fit.
      */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          layoutId={SHARED_ID.statIncome}
          type="income"
          amount={stats.totalIncome}
          label="Income This Month"
          currency={currency}
        />
        <SummaryCard
          layoutId={SHARED_ID.statExpense}
          type="expense"
          amount={stats.totalExpense}
          label="Spent This Month"
          currency={currency}
        />
        <SummaryCard
          layoutId={SHARED_ID.statNet}
          type="net"
          amount={stats.netCashFlow}
          label="Net Cash Flow"
          currency={currency}
        />
      </motion.div>

      {/* Connect bank banner */}
      {!bankConnection && (
        <motion.div variants={item}>
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-accent">Connect your bank</p>
              <p className="text-xs text-foreground-subtle mt-0.5">
                Sync transactions automatically from Up Bank or use demo data.
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/connect')}>
              <LinkIcon className="h-3.5 w-3.5" />
              Connect
            </Button>
          </div>
        </motion.div>
      )}

      {bankConnection?.status === 'connected' && bankConnection.last_sync_at && (
        <motion.div variants={item}>
          <p className="text-xs text-foreground-subtle">
            Last synced: {new Date(bankConnection.last_sync_at).toLocaleString()}
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/*
          "Spending by Category" card — layoutId matches the same card on
          Analytics. Navigate Dashboard → Analytics and this card grows from
          its ~40% column here to the full card there, chart included.
        */}
        <motion.div
          variants={item}
          layoutId={SHARED_ID.cardDonut}
          transition={sharedTransition}
          style={{ borderRadius: 12 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <DonutChart data={donutData} currency={currency} height={260} colors={donutColors} />
          </Card>
        </motion.div>

        {/*
          "Recent Transactions" card — layoutId matches the full-page list on
          the Transactions route. Navigate Dashboard → Transactions and this
          card expands into the full-width list.
        */}
        <motion.div
          variants={item}
          layoutId={SHARED_ID.cardTransactions}
          transition={sharedTransition}
          style={{ borderRadius: 12 }}
          className="lg:col-span-3"
        >
          <Card padding="none">
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <button
                  onClick={() => navigate('/transactions')}
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  View all
                </button>
              </div>
            </div>
            {recentTx.length === 0 ? (
              <div className="px-4 pb-4">
                <p className="text-sm text-foreground-subtle py-8 text-center">
                  No transactions yet.{' '}
                  <button
                    onClick={() => navigate('/transactions')}
                    className="text-accent hover:underline"
                  >
                    Add one
                  </button>
                </p>
              </div>
            ) : (
              <div className="px-1 pb-2">
                <TransactionList
                  transactions={recentTx}
                  currency={currency}
                  maxItems={8}
                  customCategories={customCategories}
                />
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Budget cards */}
      {budgetCategories.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle>Budget Progress</CardTitle>
              <button
                onClick={() => navigate('/settings?tab=budgets')}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Edit budgets
              </button>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {budgetCategories.map(([category, budget]) => (
                <BudgetCard
                  key={category}
                  category={category}
                  budget={budget}
                  spent={categoryTotals[category] || 0}
                  currency={currency}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {budgetCategories.length === 0 && (
        <motion.div variants={item}>
          <div className="rounded-xl border border-border-base bg-surface/50 p-4 text-center">
            <p className="text-sm text-foreground-subtle">
              No budgets set.{' '}
              <button
                onClick={() => navigate('/settings?tab=budgets')}
                className="text-accent hover:underline"
              >
                Set up budgets
              </button>{' '}
              to track spending by category.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
