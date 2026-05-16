import { describe, it, expect } from 'vitest';
import {
  getDashboardStats,
  getMerchantStats,
  getCategoryTotals,
  getMonthlyComparisons,
  detectSubscriptionCandidates,
  detectAnomalies,
} from '../utils/analyticsUtils';
import type { Transaction } from '../types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2)}`,
    user_id: 'user-1',
    amount: 50,
    description: 'Test transaction',
    category: 'Groceries',
    date: '2024-03-15',
    is_income: false,
    direction: 'DEBIT',
    source: 'manual',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('getDashboardStats', () => {
  it('returns zeros for empty array', () => {
    const stats = getDashboardStats([]);
    expect(stats.totalIncome).toBe(0);
    expect(stats.totalExpense).toBe(0);
    expect(stats.netCashFlow).toBe(0);
    expect(stats.transactionCount).toBe(0);
  });

  it('calculates income and expense correctly', () => {
    const txs = [
      makeTx({ amount: 1000, is_income: true }),
      makeTx({ amount: 300, is_income: false }),
      makeTx({ amount: 200, is_income: false }),
    ];
    const stats = getDashboardStats(txs);
    expect(stats.totalIncome).toBe(1000);
    expect(stats.totalExpense).toBe(500);
    expect(stats.netCashFlow).toBe(500);
    expect(stats.transactionCount).toBe(3);
  });

  it('handles all income', () => {
    const txs = [makeTx({ amount: 500, is_income: true })];
    const stats = getDashboardStats(txs);
    expect(stats.totalIncome).toBe(500);
    expect(stats.totalExpense).toBe(0);
    expect(stats.netCashFlow).toBe(500);
  });

  it('handles all expenses', () => {
    const txs = [makeTx({ amount: 100, is_income: false })];
    const stats = getDashboardStats(txs);
    expect(stats.totalIncome).toBe(0);
    expect(stats.totalExpense).toBe(100);
    expect(stats.netCashFlow).toBe(-100);
  });

  it('handles null/undefined input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getDashboardStats(null as any)).not.toThrow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getDashboardStats(undefined as any)).not.toThrow();
  });
});

describe('getMerchantStats', () => {
  it('returns empty array for empty input', () => {
    expect(getMerchantStats([])).toEqual([]);
  });

  it('aggregates merchant totals', () => {
    const txs = [
      makeTx({ amount: 30, merchant_name: 'Coles', category: 'Groceries' }),
      makeTx({ amount: 20, merchant_name: 'Coles', category: 'Groceries' }),
      makeTx({ amount: 50, merchant_name: 'Uber', category: 'Transport' }),
    ];
    const stats = getMerchantStats(txs);
    const coles = stats.find((m) => m.name === 'Coles');
    const uber = stats.find((m) => m.name === 'Uber');
    expect(coles?.totalSpend).toBe(50);
    expect(coles?.count).toBe(2);
    expect(uber?.totalSpend).toBe(50);
    expect(uber?.count).toBe(1);
  });

  it('excludes income transactions from merchant stats', () => {
    const txs = [
      makeTx({ amount: 1000, is_income: true, merchant_name: 'Employer' }),
      makeTx({ amount: 50, is_income: false, merchant_name: 'Shop' }),
    ];
    const stats = getMerchantStats(txs);
    expect(stats.find((m) => m.name === 'Employer')).toBeUndefined();
    expect(stats.find((m) => m.name === 'Shop')).toBeDefined();
  });

  it('sorts by total spend descending', () => {
    const txs = [
      makeTx({ amount: 10, merchant_name: 'Small Shop' }),
      makeTx({ amount: 200, merchant_name: 'Big Store' }),
      makeTx({ amount: 50, merchant_name: 'Medium Shop' }),
    ];
    const stats = getMerchantStats(txs);
    expect(stats[0].name).toBe('Big Store');
    expect(stats[stats.length - 1].name).toBe('Small Shop');
  });
});

describe('getCategoryTotals', () => {
  it('returns empty object for empty array', () => {
    expect(getCategoryTotals([])).toEqual({});
  });

  it('groups expenses by category', () => {
    const txs = [
      makeTx({ amount: 100, category: 'Groceries' }),
      makeTx({ amount: 50, category: 'Groceries' }),
      makeTx({ amount: 80, category: 'Dining' }),
    ];
    const totals = getCategoryTotals(txs);
    expect(totals['Groceries']).toBe(150);
    expect(totals['Dining']).toBe(80);
  });

  it('excludes income from category totals', () => {
    const txs = [
      makeTx({ amount: 1000, is_income: true, category: 'Income' }),
      makeTx({ amount: 50, is_income: false, category: 'Groceries' }),
    ];
    const totals = getCategoryTotals(txs);
    expect(totals['Income']).toBeUndefined();
    expect(totals['Groceries']).toBe(50);
  });

  it('uses Uncategorized for missing category', () => {
    const txs = [makeTx({ amount: 20, category: '' })];
    const totals = getCategoryTotals(txs);
    expect(totals['Uncategorized']).toBe(20);
  });
});

describe('getMonthlyComparisons', () => {
  it('returns empty array for empty input', () => {
    expect(getMonthlyComparisons([])).toEqual([]);
  });

  it('returns 12 months of data', () => {
    const comparisons = getMonthlyComparisons([makeTx()]);
    expect(comparisons).toHaveLength(12);
  });

  it('each comparison has month, income, expense, net', () => {
    const comparisons = getMonthlyComparisons([makeTx()]);
    for (const c of comparisons) {
      expect(c).toHaveProperty('month');
      expect(c).toHaveProperty('income');
      expect(c).toHaveProperty('expense');
      expect(c).toHaveProperty('net');
    }
  });
});

describe('detectSubscriptionCandidates', () => {
  it('returns empty array for empty input', () => {
    expect(detectSubscriptionCandidates([])).toEqual([]);
  });

  it('groups recurring transactions together', () => {
    const txs = [
      makeTx({ amount: 15.99, merchant_name: 'Netflix', date: '2024-01-01' }),
      makeTx({ amount: 15.99, merchant_name: 'Netflix', date: '2024-02-01' }),
      makeTx({ amount: 15.99, merchant_name: 'Netflix', date: '2024-03-01' }),
      makeTx({ amount: 50, merchant_name: 'One Time Purchase', date: '2024-01-15' }),
    ];
    const candidates = detectSubscriptionCandidates(txs);
    expect(candidates.length).toBeGreaterThan(0);
    const netflixGroup = candidates.find(
      (group) => group[0].merchant_name === 'Netflix'
    );
    expect(netflixGroup).toBeDefined();
    expect(netflixGroup?.length).toBe(3);
  });

  it('does not include income in candidates', () => {
    const txs = [
      makeTx({ amount: 100, is_income: true, merchant_name: 'Salary', date: '2024-01-01' }),
      makeTx({ amount: 100, is_income: true, merchant_name: 'Salary', date: '2024-02-01' }),
    ];
    const candidates = detectSubscriptionCandidates(txs);
    expect(candidates.length).toBe(0);
  });
});

describe('detectAnomalies', () => {
  it('returns empty array for fewer than 5 transactions', () => {
    expect(detectAnomalies([])).toEqual([]);
    expect(detectAnomalies([makeTx(), makeTx(), makeTx()])).toEqual([]);
  });

  it('detects unusually large transactions', () => {
    const txs = [
      makeTx({ id: '1', amount: 10 }),
      makeTx({ id: '2', amount: 12 }),
      makeTx({ id: '3', amount: 11 }),
      makeTx({ id: '4', amount: 13 }),
      makeTx({ id: '5', amount: 9 }),
      makeTx({ id: '6', amount: 500 }), // anomaly
    ];
    const anomalies = detectAnomalies(txs);
    expect(anomalies.find((tx) => tx.id === '6')).toBeDefined();
  });

  it('does not flag normal transactions', () => {
    const txs = Array.from({ length: 10 }, (_, i) =>
      makeTx({ id: String(i), amount: 50 + i })
    );
    const anomalies = detectAnomalies(txs);
    expect(anomalies.length).toBe(0);
  });
});
