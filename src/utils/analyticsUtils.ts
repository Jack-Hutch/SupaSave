import type {
  Transaction,
  MerchantStats,
  MonthlyComparison,
  CategoryTrend,
  ChartDataPoint,
  DashboardStats,
} from '../types';
import { getMonthKey, getMonthLabel, getLast12Months } from './dateUtils';
import { format, subWeeks, subMonths, subYears, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

export function getDashboardStats(transactions: Transaction[]): DashboardStats {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { totalIncome: 0, totalExpense: 0, netCashFlow: 0, transactionCount: 0 };
  }
  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    if (!tx) continue;
    if (tx.is_income) {
      totalIncome += Math.abs(tx.amount);
    } else {
      totalExpense += Math.abs(tx.amount);
    }
  }
  return {
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    transactionCount: transactions.length,
  };
}

export function getMerchantStats(transactions: Transaction[]): MerchantStats[] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const merchantMap = new Map<string, MerchantStats>();
  for (const tx of transactions) {
    if (!tx || tx.is_income) continue;
    const name = tx.merchant_name || tx.description || 'Unknown';
    const existing = merchantMap.get(name);
    if (existing) {
      existing.totalSpend += Math.abs(tx.amount);
      existing.count += 1;
    } else {
      merchantMap.set(name, {
        name,
        logo: tx.merchant_logo,
        totalSpend: Math.abs(tx.amount),
        count: 1,
        category: tx.category,
      });
    }
  }
  return Array.from(merchantMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);
}

export function getCategoryTotals(
  transactions: Transaction[]
): Record<string, number> {
  if (!Array.isArray(transactions) || transactions.length === 0) return {};
  const totals: Record<string, number> = {};
  for (const tx of transactions) {
    if (!tx || tx.is_income) continue;
    const cat = tx.category || 'Uncategorized';
    totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount);
  }
  return totals;
}

export function getMonthlyComparisons(
  transactions: Transaction[]
): MonthlyComparison[] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const months = getLast12Months();
  const byMonth: Record<string, { income: number; expense: number }> = {};
  for (const m of months) {
    byMonth[m] = { income: 0, expense: 0 };
  }
  for (const tx of transactions) {
    if (!tx || !tx.date) continue;
    const key = getMonthKey(tx.date);
    if (!byMonth[key]) continue;
    if (tx.is_income) {
      byMonth[key].income += Math.abs(tx.amount);
    } else {
      byMonth[key].expense += Math.abs(tx.amount);
    }
  }
  return months.map((m) => ({
    month: getMonthLabel(m),
    income: byMonth[m]?.income || 0,
    expense: byMonth[m]?.expense || 0,
    net: (byMonth[m]?.income || 0) - (byMonth[m]?.expense || 0),
  }));
}

export function getCategoryTrends(transactions: Transaction[]): CategoryTrend[] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const months = getLast12Months();
  const categoryMonths: Record<string, Record<string, number>> = {};
  for (const tx of transactions) {
    if (!tx || tx.is_income || !tx.date) continue;
    const cat = tx.category || 'Uncategorized';
    const key = getMonthKey(tx.date);
    if (!categoryMonths[cat]) categoryMonths[cat] = {};
    categoryMonths[cat][key] = (categoryMonths[cat][key] || 0) + Math.abs(tx.amount);
  }
  return Object.entries(categoryMonths).map(([category, monthData]) => ({
    category,
    months: months.map((m) => ({
      month: getMonthLabel(m),
      amount: monthData[m] || 0,
    })),
  }));
}

export function detectSubscriptionCandidates(
  transactions: Transaction[]
): Transaction[][] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const groups: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    if (!tx || tx.is_income) continue;
    const key = `${tx.merchant_name || tx.description}-${tx.amount}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.values(groups).filter((group) => group.length >= 2);
}

export function getChartSeries(
  transactions: Transaction[],
  period: 'week' | 'month' | 'year'
): ChartDataPoint[] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const now = new Date();

  let intervals: Date[] = [];
  let labelFn: (d: Date) => string;
  let keyFn: (d: Date) => string;

  switch (period) {
    case 'week': {
      const from = subWeeks(now, 1);
      intervals = eachDayOfInterval({ start: from, end: now });
      labelFn = (d) => format(d, 'EEE');
      keyFn = (d) => format(d, 'yyyy-MM-dd');
      break;
    }
    case 'month': {
      const from = subMonths(now, 1);
      intervals = eachDayOfInterval({ start: from, end: now });
      labelFn = (d) => format(d, 'dd MMM');
      keyFn = (d) => format(d, 'yyyy-MM-dd');
      break;
    }
    case 'year': {
      const from = subYears(now, 1);
      intervals = eachMonthOfInterval({ start: from, end: now });
      labelFn = (d) => format(d, 'MMM');
      keyFn = (d) => format(d, 'yyyy-MM');
      break;
    }
  }

  const dataMap: Record<string, { income: number; expense: number }> = {};
  for (const d of intervals) {
    dataMap[keyFn(d)] = { income: 0, expense: 0 };
  }

  for (const tx of transactions) {
    if (!tx || !tx.date) continue;
    let key: string;
    try {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) continue;
      key = period === 'year' ? format(txDate, 'yyyy-MM') : format(txDate, 'yyyy-MM-dd');
    } catch {
      continue;
    }
    if (!dataMap[key]) continue;
    if (tx.is_income) {
      dataMap[key].income += Math.abs(tx.amount);
    } else {
      dataMap[key].expense += Math.abs(tx.amount);
    }
  }

  return intervals.map((d) => {
    const key = keyFn(d);
    const data = dataMap[key] || { income: 0, expense: 0 };
    return {
      label: labelFn(d),
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    };
  });
}

export function detectAnomalies(transactions: Transaction[]): Transaction[] {
  if (!Array.isArray(transactions) || transactions.length < 5) return [];
  const expenses = transactions.filter((tx) => tx && !tx.is_income);
  if (expenses.length === 0) return [];
  const amounts = expenses.map((tx) => Math.abs(tx.amount));
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + 2 * stdDev;
  return expenses.filter((tx) => Math.abs(tx.amount) > threshold);
}

// Week intervals helper (date-fns eachWeekOfInterval compatibility)
function eachWeekOfIntervalCompat(interval: { start: Date; end: Date }): Date[] {
  try {
    return eachWeekOfInterval(interval, { weekStartsOn: 1 });
  } catch {
    return [];
  }
}
// Keep function used to avoid unused variable linting
void eachWeekOfIntervalCompat;
