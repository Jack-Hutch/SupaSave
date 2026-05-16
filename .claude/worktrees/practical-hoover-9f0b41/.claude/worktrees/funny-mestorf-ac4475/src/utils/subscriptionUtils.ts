import { format, addWeeks, addMonths, addYears } from 'date-fns';
import type { BillingCycle, Membership, Transaction } from '../types';

// ─── Subscription-transaction link tags ──────────────────────────────────────
// Transactions linked to a subscription carry a `sub-link:<membershipId>` tag.
// This uses the existing `tags` string[] field — no schema change needed.

export const SUB_LINK_PREFIX = 'sub-link:';

/** Extract the linked membership id from a transaction's tags (or null). */
export function getSubLinkId(tags: string[] | null | undefined): string | null {
  const tag = tags?.find((t) => t.startsWith(SUB_LINK_PREFIX));
  return tag ? tag.slice(SUB_LINK_PREFIX.length) : null;
}

/** Return a new tags array with the sub-link added (replaces any existing link). */
export function addSubLink(tags: string[] | null | undefined, membershipId: string): string[] {
  const cleaned = (tags ?? []).filter((t) => !t.startsWith(SUB_LINK_PREFIX));
  return [...cleaned, `${SUB_LINK_PREFIX}${membershipId}`];
}

/** True if the transaction is linked to any subscription. */
export function isLinkedToSubscription(tags: string[] | null | undefined): boolean {
  return !!(tags?.some((t) => t.startsWith(SUB_LINK_PREFIX)));
}

/** True if the transaction is linked to this specific membership. */
export function isLinkedTo(tags: string[] | null | undefined, membershipId: string): boolean {
  return !!(tags?.includes(`${SUB_LINK_PREFIX}${membershipId}`));
}

/**
 * Find transactions that look like renewals for a given membership but have not
 * yet been linked to it. Matches on merchant name (case-insensitive substring)
 * and amount within 10% tolerance.
 */
export function findRenewalCandidates(
  transactions: Transaction[],
  membership: Membership,
): Transaction[] {
  const mName = membership.name.toLowerCase().trim();
  const cost   = membership.cost;

  return transactions.filter((tx) => {
    if (tx.is_income) return false;
    if (isLinkedTo(tx.tags, membership.id)) return false;   // already linked
    if (tx.date < membership.start_date) return false;      // before subscription started

    // Merchant name must overlap
    const txName = (tx.merchant_name || tx.description).toLowerCase().trim();
    const nameMatch = txName.includes(mName) || mName.includes(txName);
    if (!nameMatch) return false;

    // Amount must be within 10%
    const diff = Math.abs(Math.abs(tx.amount) - cost) / Math.max(cost, 0.01);
    return diff <= 0.10;
  });
}

/**
 * Convert a subscription cost to its monthly equivalent.
 * weekly  => cost * 52 / 12
 * monthly => cost
 * yearly  => cost / 12
 */
export function toMonthlyEquivalent(cost: number, cycle: BillingCycle): number {
  if (typeof cost !== 'number' || isNaN(cost)) return 0;
  switch (cycle) {
    case 'weekly':
      return (cost * 52) / 12;
    case 'monthly':
      return cost;
    case 'yearly':
      return cost / 12;
    default:
      return cost;
  }
}

/**
 * Group memberships by category.
 * Returns empty object for empty/invalid arrays.
 */
export function groupByCategory(
  memberships: Membership[]
): Record<string, Membership[]> {
  if (!Array.isArray(memberships) || memberships.length === 0) return {};
  return memberships.reduce((acc, m) => {
    const cat = m?.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, Membership[]>);
}

/**
 * Get the total monthly equivalent for a group of memberships in the same category.
 */
export function categoryMonthlyTotal(memberships: Membership[]): number {
  if (!Array.isArray(memberships) || memberships.length === 0) return 0;
  return memberships.reduce((sum, m) => {
    if (!m || typeof m.cost !== 'number') return sum;
    return sum + toMonthlyEquivalent(m.cost, m.billing_cycle);
  }, 0);
}

/**
 * Get the grand total monthly equivalent across all memberships.
 */
export function totalMonthlyEquivalent(memberships: Membership[]): number {
  if (!Array.isArray(memberships) || memberships.length === 0) return 0;
  return memberships.reduce((sum, m) => {
    if (!m || typeof m.cost !== 'number') return sum;
    return sum + toMonthlyEquivalent(m.cost, m.billing_cycle);
  }, 0);
}

/**
 * Get a human-readable label for a billing cycle.
 */
export function getBillingCycleLabel(cycle: BillingCycle): string {
  switch (cycle) {
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Monthly';
  }
}

/**
 * Get a relative hint for a renewal date.
 * Returns "Today", "Tomorrow", "In X days", "X days ago", or "Unknown".
 * Handles malformed dates without crashing.
 */
export function getRenewalHint(nextDate: string): string {
  if (!nextDate) return 'Unknown';
  try {
    const date = new Date(nextDate);
    if (isNaN(date.getTime())) return 'Unknown';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffMs = date.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === -1) return '1 day ago';
    return `${Math.abs(diffDays)} days ago`;
  } catch {
    return 'Unknown';
  }
}

/**
 * Get yearly total for a set of memberships.
 */
export function totalYearlyEquivalent(memberships: Membership[]): number {
  return totalMonthlyEquivalent(memberships) * 12;
}

/**
 * Advance a date string by one billing cycle.
 * Used when confirming a subscription renewal to update next_billing_date.
 */
export function advanceByOneCycle(date: string, cycle: BillingCycle): string {
  try {
    const d = new Date(date);
    switch (cycle) {
      case 'weekly':  return format(addWeeks(d, 1),  'yyyy-MM-dd');
      case 'yearly':  return format(addYears(d, 1),  'yyyy-MM-dd');
      default:        return format(addMonths(d, 1), 'yyyy-MM-dd');
    }
  } catch { return date; }
}
