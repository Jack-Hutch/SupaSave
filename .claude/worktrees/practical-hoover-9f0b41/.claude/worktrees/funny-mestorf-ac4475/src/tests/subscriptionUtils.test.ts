import { describe, it, expect } from 'vitest';
import {
  toMonthlyEquivalent,
  groupByCategory,
  categoryMonthlyTotal,
  totalMonthlyEquivalent,
  getBillingCycleLabel,
  getRenewalHint,
  totalYearlyEquivalent,
} from '../utils/subscriptionUtils';
import type { Membership } from '../types';

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
