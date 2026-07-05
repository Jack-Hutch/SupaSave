import { format, addWeeks, addMonths, addYears, subWeeks, subMonths, subYears } from 'date-fns';
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

// Common payment-processor / bank prefixes that pollute merchant descriptions
// and stop a clean name match (e.g. "SQ *NETFLIX", "DIRECT DEBIT SPOTIFY").
const MERCHANT_NOISE = [
  'direct debit', 'card purchase', 'visa purchase', 'eftpos', 'purchase',
  'recurring', 'payment to', 'payment', 'pos ', 'sp ', 'sq *', 'sq*',
  'paypal *', 'paypal*', 'pp *', 'sumup *', 'tfr ', 'osko', 'bpay',
];

/**
 * Normalise a merchant string for matching: lowercase, strip known
 * processor noise, drop non-alphanumerics and trailing reference codes,
 * and collapse whitespace. "SQ *Netflix.com 1234" → "netflix".
 */
export function normalizeMerchant(raw: string): string {
  let s = (raw || '').toLowerCase().trim();
  for (const noise of MERCHANT_NOISE) {
    s = s.split(noise).join(' ');
  }
  s = s
    .replace(/[^a-z0-9 ]+/g, ' ')   // strip punctuation/symbols
    .replace(/\b\d{3,}\b/g, ' ')    // strip long reference numbers
    .replace(/\b(com|au|inc|ltd|pty|co|www)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/**
 * Find transactions that look like renewals for a given membership but have not
 * yet been linked to it. Matches on a normalised merchant name (substring OR a
 * shared significant word) and amount within 15% tolerance.
 *
 * Matching was widened from a raw substring check because real bank descriptions
 * carry processor prefixes and reference codes that defeated the old comparison —
 * which is exactly why charges weren't linking and subscriptions stayed "overdue".
 */
export function findRenewalCandidates(
  transactions: Transaction[],
  membership: Membership,
): Transaction[] {
  const mName  = normalizeMerchant(membership.name);
  const mTokens = new Set(mName.split(' ').filter((t) => t.length >= 4));
  const cost   = membership.cost;

  return transactions.filter((tx) => {
    if (tx.is_income) return false;
    if (isLinkedTo(tx.tags, membership.id)) return false;   // already linked
    if (tx.date < membership.start_date) return false;      // before subscription started

    // Merchant name must overlap after normalisation
    const txName = normalizeMerchant(tx.merchant_name || tx.description);
    if (!txName || !mName) return false;
    const substringMatch = txName.includes(mName) || mName.includes(txName);
    const tokenMatch = mTokens.size > 0 &&
      txName.split(' ').some((t) => t.length >= 4 && mTokens.has(t));
    if (!substringMatch && !tokenMatch) return false;

    // Amount must be within 15% (prices drift with tax / FX / plan tweaks)
    const diff = Math.abs(Math.abs(tx.amount) - cost) / Math.max(cost, 0.01);
    return diff <= 0.15;
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
 * Used as the building block for moving a subscription's next_billing_date.
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

/**
 * The date one billing cycle before the given next billing date. A payment
 * dated on or after this covers the CURRENT cycle; anything earlier is a
 * historical backfill and must not move the due date.
 */
export function cycleStartOf(nextDate: string, cycle: BillingCycle): string {
  try {
    const d = new Date(nextDate);
    switch (cycle) {
      case 'weekly': return format(subWeeks(d, 1),  'yyyy-MM-dd');
      case 'yearly': return format(subYears(d, 1),  'yyyy-MM-dd');
      default:       return format(subMonths(d, 1), 'yyyy-MM-dd');
    }
  } catch { return nextDate; }
}

/**
 * Roll a subscription's next_billing_date forward to the next *future* date
 * after a payment has been made.
 *
 * Why this exists: previously a payment advanced the date by exactly one cycle.
 * If a subscription was several cycles overdue (e.g. the bank never matched the
 * charge for two months), advancing once still left it in the past, so it kept
 * showing "Xd overdue" even though the user had just paid it. This advances by
 * whole cycles until the date lands strictly after the payment date — at least
 * one cycle, never overdue afterwards.
 *
 * @param currentNextDate the subscription's current next_billing_date
 * @param cycle           billing cycle
 * @param paidDate        the date the payment was made (defaults to today)
 */
export function advanceBillingDate(
  currentNextDate: string,
  cycle: BillingCycle,
  paidDate: string = new Date().toISOString().split('T')[0],
): string {
  // Always advance at least one cycle (you paid for this period; next is next).
  let next = advanceByOneCycle(currentNextDate, cycle);
  // Then keep advancing until the date is genuinely in the future relative to
  // the payment, so a long-overdue subscription doesn't stay overdue.
  let guard = 0;
  while (next <= paidDate && guard < 600) {
    next = advanceByOneCycle(next, cycle);
    guard += 1;
  }
  return next;
}
