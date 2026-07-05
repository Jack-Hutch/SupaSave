import { describe, it, expect } from 'vitest';
import {
  toMonthlyEquivalent,
  groupByCategory,
  categoryMonthlyTotal,
  totalMonthlyEquivalent,
  getBillingCycleLabel,
  getRenewalHint,
  totalYearlyEquivalent,
  advanceByOneCycle,
  advanceBillingDate,
  cycleStartOf,
  normalizeMerchant,
  findRenewalCandidates,
} from '../utils/subscriptionUtils';
import type { Membership, Transaction } from '../types';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    user_id: 'user-1',
    amount: -20,
    description: 'Netflix',
    category: 'Entertainment',
    date: '2024-02-02',
    is_income: false,
    direction: 'DEBIT',
    source: 'up',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'test-1',
    user_id: 'user-1',
    name: 'Netflix',
    icon: '🎬',
    cost: 20,
    billing_cycle: 'monthly',
    start_date: '2024-01-01',
    next_billing_date: '2024-02-01',
    cancel_reminder: false,
    category: 'Entertainment',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('toMonthlyEquivalent', () => {
  it('returns cost as-is for monthly', () => {
    expect(toMonthlyEquivalent(20, 'monthly')).toBe(20);
  });

  it('converts weekly to monthly (cost * 52 / 12)', () => {
    const result = toMonthlyEquivalent(10, 'weekly');
    expect(result).toBeCloseTo((10 * 52) / 12, 5);
  });

  it('converts yearly to monthly (cost / 12)', () => {
    expect(toMonthlyEquivalent(120, 'yearly')).toBeCloseTo(10, 5);
  });

  it('returns 0 for NaN cost', () => {
    expect(toMonthlyEquivalent(NaN, 'monthly')).toBe(0);
  });

  it('returns 0 for non-numeric cost', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(toMonthlyEquivalent('abc' as any, 'monthly')).toBe(0);
  });

  it('handles zero cost', () => {
    expect(toMonthlyEquivalent(0, 'monthly')).toBe(0);
    expect(toMonthlyEquivalent(0, 'yearly')).toBe(0);
    expect(toMonthlyEquivalent(0, 'weekly')).toBe(0);
  });
});

describe('groupByCategory', () => {
  it('returns empty object for empty array', () => {
    expect(groupByCategory([])).toEqual({});
  });

  it('groups memberships by category', () => {
    const memberships = [
      makeMembership({ id: '1', category: 'Entertainment' }),
      makeMembership({ id: '2', category: 'Streaming' }),
      makeMembership({ id: '3', category: 'Entertainment' }),
    ];
    const result = groupByCategory(memberships);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['Entertainment']).toHaveLength(2);
    expect(result['Streaming']).toHaveLength(1);
  });

  it('uses Uncategorized for missing category', () => {
    const memberships = [
      makeMembership({ id: '1', category: '' }),
    ];
    const result = groupByCategory(memberships);
    expect(result['Uncategorized']).toHaveLength(1);
  });

  it('handles null/undefined input gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(groupByCategory(null as any)).toEqual({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(groupByCategory(undefined as any)).toEqual({});
  });
});

describe('categoryMonthlyTotal', () => {
  it('returns 0 for empty array', () => {
    expect(categoryMonthlyTotal([])).toBe(0);
  });

  it('sums monthly equivalents', () => {
    const memberships = [
      makeMembership({ id: '1', cost: 10, billing_cycle: 'monthly' }),
      makeMembership({ id: '2', cost: 120, billing_cycle: 'yearly' }),
    ];
    // 10 + 10 = 20
    expect(categoryMonthlyTotal(memberships)).toBeCloseTo(20, 5);
  });

  it('handles NaN costs without crashing', () => {
    const memberships = [
      makeMembership({ id: '1', cost: NaN }),
    ];
    expect(categoryMonthlyTotal(memberships)).toBe(0);
  });
});

describe('totalMonthlyEquivalent', () => {
  it('returns 0 for empty array', () => {
    expect(totalMonthlyEquivalent([])).toBe(0);
  });

  it('sums all memberships', () => {
    const memberships = [
      makeMembership({ id: '1', cost: 10, billing_cycle: 'monthly' }),
      makeMembership({ id: '2', cost: 52, billing_cycle: 'weekly' }),  // 52*52/12 ≈ 225.33
      makeMembership({ id: '3', cost: 240, billing_cycle: 'yearly' }), // 240/12 = 20
    ];
    const expected = 10 + (52 * 52) / 12 + 240 / 12;
    expect(totalMonthlyEquivalent(memberships)).toBeCloseTo(expected, 4);
  });

  it('handles null elements without crashing', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberships = [null as any, makeMembership({ cost: 10, billing_cycle: 'monthly' })];
    expect(totalMonthlyEquivalent(memberships)).toBeCloseTo(10, 5);
  });
});

describe('totalYearlyEquivalent', () => {
  it('returns 0 for empty array', () => {
    expect(totalYearlyEquivalent([])).toBe(0);
  });

  it('equals totalMonthlyEquivalent * 12', () => {
    const memberships = [
      makeMembership({ id: '1', cost: 20, billing_cycle: 'monthly' }),
    ];
    expect(totalYearlyEquivalent(memberships)).toBeCloseTo(240, 5);
  });
});

describe('getBillingCycleLabel', () => {
  it('returns Weekly for weekly', () => {
    expect(getBillingCycleLabel('weekly')).toBe('Weekly');
  });

  it('returns Monthly for monthly', () => {
    expect(getBillingCycleLabel('monthly')).toBe('Monthly');
  });

  it('returns Yearly for yearly', () => {
    expect(getBillingCycleLabel('yearly')).toBe('Yearly');
  });
});

describe('getRenewalHint', () => {
  it('returns Unknown for empty string', () => {
    expect(getRenewalHint('')).toBe('Unknown');
  });

  it('returns Unknown for invalid date', () => {
    expect(getRenewalHint('not-a-date')).toBe('Unknown');
    expect(getRenewalHint('2024-99-99')).toBe('Unknown');
  });

  it('returns Today for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(getRenewalHint(today)).toBe('Today');
  });

  it('returns Tomorrow for tomorrow', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(getRenewalHint(tomorrow)).toBe('Tomorrow');
  });

  it('returns "In X days" for future dates', () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    expect(getRenewalHint(future)).toBe('In 5 days');
  });

  it('returns "X days ago" for past dates', () => {
    const past = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    expect(getRenewalHint(past)).toBe('3 days ago');
  });

  it('does not throw on null/undefined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getRenewalHint(null as any)).not.toThrow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getRenewalHint(undefined as any)).not.toThrow();
  });
});

describe('advanceByOneCycle', () => {
  it('advances monthly by one month', () => {
    expect(advanceByOneCycle('2024-02-01', 'monthly')).toBe('2024-03-01');
  });
  it('advances weekly by 7 days', () => {
    expect(advanceByOneCycle('2024-02-01', 'weekly')).toBe('2024-02-08');
  });
  it('advances yearly by one year', () => {
    expect(advanceByOneCycle('2024-02-01', 'yearly')).toBe('2025-02-01');
  });
  it('returns input unchanged for invalid date', () => {
    expect(advanceByOneCycle('not-a-date', 'monthly')).toBe('not-a-date');
  });
});

describe('advanceBillingDate', () => {
  it('advances at least one cycle even when already in the future', () => {
    // paid on 2024-03-01, next due 2024-04-01 → should jump to 2024-05-01
    expect(advanceBillingDate('2024-04-01', 'monthly', '2024-03-01')).toBe('2024-05-01');
  });

  it('rolls a long-overdue subscription forward to a future date', () => {
    // due 2024-01-01, paid 2024-06-15 → never leaves the result on/before paid date
    const result = advanceBillingDate('2024-01-01', 'monthly', '2024-06-15');
    expect(result > '2024-06-15').toBe(true);
    expect(result).toBe('2024-07-01');
  });

  it('clears overdue for weekly cycles too', () => {
    const result = advanceBillingDate('2024-01-01', 'weekly', '2024-03-01');
    expect(result > '2024-03-01').toBe(true);
  });
});

describe('cycleStartOf', () => {
  it('is one cycle before the next billing date', () => {
    expect(cycleStartOf('2024-04-01', 'monthly')).toBe('2024-03-01');
    expect(cycleStartOf('2024-04-08', 'weekly')).toBe('2024-04-01');
    expect(cycleStartOf('2025-01-15', 'yearly')).toBe('2024-01-15');
  });

  it('classifies current-cycle vs historical payments (backfill guard)', () => {
    // next due 2024-04-01, monthly → current cycle starts 2024-03-01.
    const start = cycleStartOf('2024-04-01', 'monthly');
    // Payment inside the cycle → covers it → advance is allowed
    expect('2024-03-15' >= start).toBe(true);
    // Late payment after the due date → still allowed (clears overdue)
    expect('2024-04-10' >= start).toBe(true);
    // Historical payment from an elapsed cycle → backfill only, no advance
    expect('2024-02-10' >= start).toBe(false);
  });

  it('returns the input unchanged for malformed dates', () => {
    expect(cycleStartOf('not-a-date', 'monthly')).toBe('not-a-date');
  });
});

describe('normalizeMerchant', () => {
  it('strips processor prefixes and punctuation', () => {
    expect(normalizeMerchant('SQ *NETFLIX.COM')).toBe('netflix');
    expect(normalizeMerchant('DIRECT DEBIT Spotify AB')).toBe('spotify ab');
  });
  it('strips long reference numbers', () => {
    expect(normalizeMerchant('PAYPAL *DISNEYPLUS 1234567')).toBe('disneyplus');
  });
  it('handles empty input', () => {
    expect(normalizeMerchant('')).toBe('');
  });
});

describe('findRenewalCandidates', () => {
  const sub = makeMembership({ id: 'sub-x', name: 'Netflix', cost: 20, start_date: '2024-01-01' });

  it('matches a noisy bank description to the subscription', () => {
    const txs = [makeTransaction({ id: 't1', merchant_name: 'SQ *NETFLIX.COM', amount: -20, date: '2024-03-02' })];
    expect(findRenewalCandidates(txs, sub).map((t) => t.id)).toEqual(['t1']);
  });

  it('matches within 15% amount tolerance', () => {
    const txs = [makeTransaction({ id: 't2', merchant_name: 'Netflix', amount: -22, date: '2024-03-02' })];
    expect(findRenewalCandidates(txs, sub)).toHaveLength(1);
  });

  it('ignores already-linked transactions', () => {
    const txs = [makeTransaction({ id: 't3', merchant_name: 'Netflix', amount: -20, tags: ['sub-link:sub-x'] })];
    expect(findRenewalCandidates(txs, sub)).toHaveLength(0);
  });

  it('ignores transactions before the start date', () => {
    const txs = [makeTransaction({ id: 't4', merchant_name: 'Netflix', amount: -20, date: '2023-12-01' })];
    expect(findRenewalCandidates(txs, sub)).toHaveLength(0);
  });

  it('ignores income and unrelated merchants', () => {
    const txs = [
      makeTransaction({ id: 't5', merchant_name: 'Netflix', amount: 20, is_income: true }),
      makeTransaction({ id: 't6', merchant_name: 'Woolworths', amount: -20 }),
    ];
    expect(findRenewalCandidates(txs, sub)).toHaveLength(0);
  });
});
