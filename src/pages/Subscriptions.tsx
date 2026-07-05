import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Bell, X, Pencil, ChevronDown, CheckCircle2, Check, Link2, Search } from 'lucide-react';
import { format, addMonths, differenceInDays } from 'date-fns';
import { useFinanceStore } from '../store/financeStore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { SubscriptionSheet } from '../components/subscriptions/SubscriptionSheet';
import { SubscriptionAnalytics } from '../components/subscriptions/SubscriptionAnalytics';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { formatCurrency, formatRelativeDate } from '../lib/utils';
import {
  toMonthlyEquivalent,
  getBillingCycleLabel,
  findRenewalCandidates,
  advanceBillingDate,
  cycleStartOf,
} from '../utils/subscriptionUtils';
import { detectSubscriptionCandidates } from '../utils/analyticsUtils';
import { TAB_SPRING } from '../lib/motion';
import { addSubLink, isLinkedTo, isLinkedToSubscription } from '../utils/subscriptionUtils';
import type { Membership, BillingCycle, Transaction } from '../types';
import type { SubscriptionPrefill } from '../components/subscriptions/SubscriptionSheet';

// ── Helpers ───────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function urgencyBadge(days: number) {
  if (days < 0)   return { label: `${Math.abs(days)}d overdue`, cls: 'text-red-400   bg-red-500/10   border-red-500/25'   };
  if (days === 0) return { label: 'Due today',                   cls: 'text-red-400   bg-red-500/10   border-red-500/25'   };
  if (days === 1) return { label: 'Tomorrow',                    cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
  if (days <= 7)  return { label: `${days} days`,                cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
  return { label: `${days} days`, cls: 'text-foreground-muted bg-surface-raised border-border-base' };
}


function guessCycle(txGroup: Transaction[]): BillingCycle {
  if (txGroup.length < 2) return 'monthly';
  const sorted = [...txGroup].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += differenceInDays(new Date(sorted[i].date), new Date(sorted[i - 1].date));
  }
  const avgDays = totalGap / (sorted.length - 1);
  if (avgDays <= 10)  return 'weekly';
  if (avgDays <= 45)  return 'monthly';
  return 'yearly';
}


interface Candidate {
  key:         string;
  name:        string;
  amount:      number;
  cycle:       BillingCycle;
  lastDate:    string;
  occurrences: number;
}

// ── Subscription row ──────────────────────────────────────────────────

interface SubRowProps {
  m:               Membership;
  currency:        string;
  linkedTxs:       Transaction[];   // confirmed payment transactions
  renewalTxs:      Transaction[];   // unlinked renewal candidates
  onEdit:          (m: Membership) => void;
  onDelete:        (id: string) => void;
  onConfirmRenewal:(tx: Transaction, m: Membership) => void;
  onLogPayment:    (m: Membership) => Promise<void>;
  onLinkTx:        (m: Membership) => void;
  logging:         boolean;
}

function SubRow({ m, currency, linkedTxs, renewalTxs, onEdit, onDelete, onConfirmRenewal, onLogPayment, onLinkTx, logging }: SubRowProps) {
  const [expanded, setExpanded] = useState(false);

  const days    = daysUntil(m.next_billing_date);
  const monthly = toMonthlyEquivalent(m.cost, m.billing_cycle);

  // Most-recent linked transaction
  const lastPayment = linkedTxs.length > 0
    ? [...linkedTxs].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  // A linked payment inside the current cycle turns the countdown badge
  // green — "this one's paid, next charge in Xd" at a glance.
  const paidThisCycle =
    !!lastPayment &&
    days >= 0 &&
    lastPayment.date >= cycleStartOf(m.next_billing_date, m.billing_cycle);

  const badge = paidThisCycle
    ? { label: days === 0 ? 'Paid · due today' : `Paid · ${days}d`, cls: 'text-income bg-income/10 border-income/25' }
    : urgencyBadge(days);

  const hasRenewals = renewalTxs.length > 0;

  return (
    <div>
      {/* Main row — enter-only animation. The old AnimatePresence exit could
          wedge under StrictMode in dev, leaving a stale interactive ghost row
          whose buttons wrote payments against a dead membership id. */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          opacity: { duration: 0.18, ease: 'easeOut' },
          y:       { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
        }}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 hover:bg-surface-raised transition-colors"
      >
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-xl select-none">
          {m.icon}
        </div>

        {/* Name + meta — min-width forces the badge/amount/actions cluster to
            wrap onto its own line on phones instead of crushing the name */}
        <div className="flex-1 min-w-[140px]">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
            {m.cancel_reminder && (
              <Bell className="h-3 w-3 text-amber-400 shrink-0" aria-label="Cancel reminder on" />
            )}
            {hasRenewals && (
              <span className="text-[10px] font-semibold rounded-full bg-accent/15 text-accent border border-accent/25 px-1.5 py-0.5 shrink-0">
                renewal detected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-foreground-subtle truncate">
              {m.category} · {getBillingCycleLabel(m.billing_cycle)}
            </p>
            {lastPayment && (
              <p className="text-xs text-foreground-subtle">
                · Last paid {formatRelativeDate(lastPayment.date)}
              </p>
            )}
          </div>
        </div>

        {/* Badge + amount + actions — one cluster so it wraps as a unit */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
        {/* Countdown badge */}
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>

        {/* Amount */}
        <div className="text-right shrink-0 min-w-[68px]">
          <p className="font-mono text-sm font-bold text-foreground">
            {formatCurrency(m.cost, currency)}
          </p>
          {m.billing_cycle !== 'monthly' && (
            <p className="text-[11px] font-mono text-foreground-subtle">
              {formatCurrency(monthly, currency)}/mo
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onLogPayment(m)}
            disabled={logging}
            title="Log payment and advance next billing date"
            className="rounded-lg p-1.5 text-foreground-subtle hover:text-income hover:bg-surface-hover transition-colors disabled:opacity-50"
            aria-label={`Log payment for ${m.name}`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onLinkTx(m)}
            title="Link an existing bank transaction as the payment"
            className="rounded-lg p-1.5 text-foreground-subtle hover:text-accent hover:bg-surface-hover transition-colors"
            aria-label={`Link a transaction to ${m.name}`}
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
            aria-label={expanded ? 'Collapse payment history' : 'Show payment history'}
          >
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={TAB_SPRING}>
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
          </button>
          <button
            onClick={() => onEdit(m)}
            className="rounded-lg p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
            aria-label={`Edit ${m.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(m.id)}
            className="rounded-lg p-1.5 text-foreground-subtle hover:text-expense hover:bg-surface-hover transition-colors"
            aria-label={`Delete ${m.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        </div>
      </motion.div>

      {/* Expandable section — payment history + renewal detection.
          Always mounted, driven by `animate` — AnimatePresence-managed
          mount/unmount could wedge under StrictMode in dev, freezing this
          section at height 0 so history/renewal confirm were unreachable. */}
          <motion.div
            initial={false}
            animate={expanded ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
            aria-hidden={!expanded}
          >
            <div className="mx-4 mb-3 rounded-xl border border-border-base bg-surface-raised overflow-hidden">

              {/* Detected renewals (unlinked) */}
              {renewalTxs.length > 0 && (
                <div className="p-3 border-b border-border-base space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                    🔁 Renewal detected — confirm to link
                  </p>
                  {renewalTxs.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {tx.merchant_name || tx.description}
                        </p>
                        <p className="text-[11px] text-foreground-subtle">
                          {format(new Date(tx.date), 'd MMM yyyy')} · {formatCurrency(Math.abs(tx.amount), currency)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onConfirmRenewal(tx, m)}
                        className="h-7 px-2.5 text-xs shrink-0"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Confirm
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmed payment history */}
              {linkedTxs.length > 0 ? (
                <div className="p-3 space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle mb-2">
                    Payment history
                  </p>
                  {[...linkedTxs]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-accent shrink-0">🔁</span>
                          <span className="text-xs text-foreground-muted truncate">
                            {tx.merchant_name || tx.description}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-xs font-semibold text-foreground">
                            {formatCurrency(Math.abs(tx.amount), currency)}
                          </p>
                          <p className="text-[11px] text-foreground-subtle">
                            {format(new Date(tx.date), 'd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                !renewalTxs.length && (
                  <div className="p-3 text-center space-y-1.5">
                    <p className="text-xs text-foreground-subtle">No payment history yet</p>
                    <button
                      onClick={() => onLinkTx(m)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Link a bank transaction
                    </button>
                  </div>
                )
              )}
            </div>
          </motion.div>
    </div>
  );
}

// ── Link-payment picker ───────────────────────────────────────────────

interface LinkTransactionModalProps {
  membership:   Membership | null;
  transactions: Transaction[];
  currency:     string;
  onClose:      () => void;
  onSelect:     (tx: Transaction) => Promise<void>;
}

/**
 * Manually attach an existing transaction to a subscription as a payment.
 * For when auto renewal-detection misses the real charge (name or amount
 * too different) and the subscription sits "overdue" even though it was
 * paid — linking records the payment AND rolls the next billing date
 * forward past the payment date.
 */
function LinkTransactionModal({ membership, transactions, currency, onClose, onSelect }: LinkTransactionModalProps) {
  const [search, setSearch]   = useState('');
  const [linking, setLinking] = useState(false);

  // Fresh state each time the picker opens for a subscription
  useEffect(() => {
    setSearch('');
    setLinking(false);
  }, [membership?.id]);

  const { likely, rest } = useMemo(() => {
    if (!membership) return { likely: [] as Transaction[], rest: [] as Transaction[] };
    const q = search.trim().toLowerCase();
    const unlinked = transactions.filter(
      (tx) =>
        !tx.is_income &&
        !isLinkedToSubscription(tx.tags) &&
        (!q || (tx.merchant_name || tx.description).toLowerCase().includes(q)),
    );
    // Float the auto-detector's candidates to the top; everything else below,
    // newest first, capped so a huge history doesn't swamp the list.
    const candidateIds = new Set(findRenewalCandidates(unlinked, membership).map((t) => t.id));
    const sorted = [...unlinked].sort((a, b) => b.date.localeCompare(a.date));
    return {
      likely: sorted.filter((t) => candidateIds.has(t.id)),
      rest:   sorted.filter((t) => !candidateIds.has(t.id)).slice(0, 50),
    };
  }, [membership, transactions, search]);

  const pick = async (tx: Transaction) => {
    if (linking) return;
    setLinking(true);
    try {
      await onSelect(tx);
    } finally {
      setLinking(false);
    }
  };

  const renderTx = (tx: Transaction, isLikely: boolean) => (
    <button
      key={tx.id}
      onClick={() => pick(tx)}
      disabled={linking}
      className="w-full flex items-center gap-3 rounded-lg border border-border-base bg-surface-raised px-3 py-2.5 text-left hover:border-accent/50 hover:bg-surface-hover transition-colors disabled:opacity-50"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">
          {tx.merchant_name || tx.description}
        </p>
        <p className="text-[11px] text-foreground-subtle">
          {format(new Date(tx.date), 'd MMM yyyy')}
          {tx.source === 'manual' ? ' · manual' : ''}
        </p>
      </div>
      {isLikely && (
        <span className="text-[10px] font-semibold rounded-full bg-accent/15 text-accent border border-accent/25 px-1.5 py-0.5 shrink-0">
          likely match
        </span>
      )}
      <p className="font-mono text-xs font-bold text-foreground shrink-0">
        {formatCurrency(Math.abs(tx.amount), currency)}
      </p>
    </button>
  );

  return (
    <Modal
      isOpen={!!membership}
      onClose={onClose}
      title={membership ? `Link payment — ${membership.name}` : 'Link payment'}
      size="md"
    >
      <div className="p-5 space-y-4">
        <p className="text-xs text-foreground-subtle">
          Pick the transaction that paid for this subscription. It's added to the
          payment history and the next billing date moves forward — no more
          "overdue" for a charge you've already made.
        </p>

        <Input
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />

        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
          {likely.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Likely matches
            </p>
          )}
          {likely.map((tx) => renderTx(tx, true))}

          {likely.length > 0 && rest.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle pt-1">
              Other transactions
            </p>
          )}
          {rest.map((tx) => renderTx(tx, false))}

          {likely.length === 0 && rest.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-foreground-muted">No unlinked transactions found</p>
              <p className="text-xs text-foreground-subtle mt-1 max-w-xs mx-auto">
                Sync your bank on the Connect page, or use the ✓ button on the
                subscription to log the payment manually.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

export function Subscriptions() {
  const { user }         = useAuth();
  const transactions     = useFinanceStore((s) => s.transactions);
  const memberships      = useFinanceStore((s) => s.memberships);
  const bankConnection   = useFinanceStore((s) => s.bankConnection);
  const settings         = useFinanceStore((s) => s.settings);
  const addMembership    = useFinanceStore((s) => s.addMembership);
  const updateMembership = useFinanceStore((s) => s.updateMembership);
  const deleteMembership = useFinanceStore((s) => s.deleteMembership);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const { success, error: toastError } = useToast();

  const [loggingId, setLoggingId] = useState<string | null>(null);

  const currency = settings.currency || 'AUD';

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingM, setEditingM]   = useState<Membership | null>(null);
  const [prefill, setPrefill]     = useState<SubscriptionPrefill | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [linkingM, setLinkingM]   = useState<Membership | null>(null);

  // ── Per-subscription transaction data ────────────────────────────
  // Build two maps keyed by membership id:
  //   linkedTxMap   — confirmed payments (tagged sub-link:<id>)
  //   renewalTxMap  — unlinked renewal candidates
  const { linkedTxMap, renewalTxMap } = useMemo(() => {
    const linked:  Record<string, Transaction[]> = {};
    const renewal: Record<string, Transaction[]> = {};

    for (const m of memberships) {
      // Confirmed payments: transactions already tagged to this subscription
      linked[m.id] = transactions.filter((tx) => isLinkedTo(tx.tags, m.id));

      // Renewal candidates: unlinked transactions that match by name/amount
      renewal[m.id] = findRenewalCandidates(transactions, m);
    }

    return { linkedTxMap: linked, renewalTxMap: renewal };
  }, [transactions, memberships]);

  // ── Detect candidates ─────────────────────────────────────────────
  const candidates = useMemo<Candidate[]>(() => {
    if (!bankConnection || transactions.length === 0) return [];
    const existingNames = new Set(memberships.map((m) => m.name.toLowerCase()));
    const groups = detectSubscriptionCandidates(transactions);
    return groups
      .map((group): Candidate | null => {
        const first = group[0];
        if (!first) return null;
        const name = first.merchant_name || first.description;
        if (existingNames.has(name.toLowerCase())) return null;
        const key    = `${name}-${first.amount}`;
        const sorted = [...group].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        return { key, name, amount: first.amount, cycle: guessCycle(group), lastDate: sorted[0].date, occurrences: group.length };
      })
      .filter((c): c is Candidate => c !== null && !dismissed.has(c.key))
      .slice(0, 5);
  }, [transactions, memberships, bankConnection, dismissed]);

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalMonthly = memberships.reduce(
      (s, m) => s + toMonthlyEquivalent(m.cost, m.billing_cycle), 0,
    );
    const dueSoon = memberships.filter((m) => daysUntil(m.next_billing_date) <= 7).length;
    const sorted  = [...memberships].sort(
      (a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime(),
    );
    return { totalMonthly, dueSoon, sorted };
  }, [memberships]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSave = async (data: Omit<Membership, 'id' | 'updated_at'>) => {
    try {
      if (editingM) {
        await updateMembership(editingM.id, data);
        success('Subscription updated');
      } else {
        await addMembership(data);
        success('Subscription added');
      }
    } catch (err) {
      toastError((err as { message?: string })?.message || 'Failed to save');
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteMembership(deleteId);
      success('Subscription deleted');
      setDeleteId(null);
    } catch (err) {
      toastError((err as { message?: string })?.message ?? 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Log a manual payment: create a new transaction tagged to this
   * subscription, then advance next_billing_date by one cycle.
   * Used when the bank hasn't picked up the charge yet.
   */
  const handleLogPayment = async (m: Membership) => {
    if (!user?.id || loggingId) return;
    setLoggingId(m.id);
    let loggedTxId: string | null = null;
    try {
      const today = new Date().toISOString().split('T')[0];
      loggedTxId = await addTransaction({
        user_id:       user.id,
        amount:        m.cost,
        description:   m.name,
        merchant_name: m.name,
        category:      m.category,
        date:          today,
        is_income:     false,
        direction:     'DEBIT',
        source:        'manual',
        tags:          addSubLink([], m.id),
      });
      // Only advance the due date when the payment covers the current cycle —
      // if the next charge is already more than a cycle away, advancing again
      // would push it past the real upcoming charge.
      if (today >= cycleStartOf(m.next_billing_date, m.billing_cycle)) {
        const newNextDate = advanceBillingDate(m.next_billing_date, m.billing_cycle, today);
        await updateMembership(m.id, { next_billing_date: newNextDate });
        success(`${m.name} payment logged — next ${format(new Date(newNextDate), 'd MMM yyyy')}`);
      } else {
        success(`${m.name} payment logged`);
      }
    } catch (err) {
      // If the membership update failed after the payment saved, remove the
      // orphan payment so tapping the button again doesn't double-log it.
      if (loggedTxId) {
        deleteTransaction(loggedTxId).catch(() => undefined);
      }
      toastError((err as { message?: string })?.message || 'Failed to log payment');
    } finally {
      setLoggingId(null);
    }
  };

  /**
   * Confirm a renewal / link a payment: tag the transaction, and advance the
   * subscription's next_billing_date ONLY when the payment covers the current
   * cycle. A historical payment (older than one cycle before the due date) is
   * a history backfill — linking three old charges must not push the due date
   * three cycles past the real upcoming charge.
   */
  const handleConfirmRenewal = async (tx: Transaction, m: Membership) => {
    try {
      // silent=true so the 🔁 badge sticks even if Supabase sync fails
      await updateTransaction(tx.id, { tags: addSubLink(tx.tags, m.id) }, { silent: true });
      if (tx.date >= cycleStartOf(m.next_billing_date, m.billing_cycle)) {
        // advanceBillingDate rolls forward until strictly after the payment,
        // so an overdue sub paid late still lands on a future date.
        const newNextDate = advanceBillingDate(m.next_billing_date, m.billing_cycle, tx.date);
        await updateMembership(m.id, { next_billing_date: newNextDate });
        success(`${m.name} renewal confirmed — next billing ${format(new Date(newNextDate), 'd MMM yyyy')}`);
      } else {
        success(`${m.name} payment added to history`);
      }
    } catch (err) {
      toastError((err as { message?: string })?.message || 'Failed to confirm renewal');
    }
  };

  const openAdd = () => {
    setEditingM(null);
    setPrefill(null);
    setSheetOpen(true);
  };

  const openEdit = (m: Membership) => {
    setEditingM(m);
    setPrefill(null);
    setSheetOpen(true);
  };

  const openFromCandidate = (c: Candidate) => {
    const nextBilling = format(addMonths(new Date(c.lastDate), 1), 'yyyy-MM-dd');
    setPrefill({
      name:              c.name,
      cost:              String(c.amount),
      billing_cycle:     c.cycle,
      next_billing_date: nextBilling,
      start_date:        c.lastDate,
      icon:              '📦',
      category:          'Other',
    });
    setEditingM(null);
    setSheetOpen(true);
  };

  const dismissCandidate = (key: string) =>
    setDismissed((prev) => new Set([...prev, key]));

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingM(null);
    setPrefill(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-9 space-y-5">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-3 mb-[6px]">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Subscriptions</h1>
            {memberships.length > 0 && (
              <span
                className="font-mono text-[11px] font-medium px-2 py-[3px] rounded-[5px] tracking-[0.02em]"
                style={{ color: 'rgb(var(--accent))', background: 'var(--accent-soft)' }}
              >
                {memberships.length} active
              </span>
            )}
          </div>
          <p className="text-[13.5px] text-foreground-muted">Track recurring charges and never miss a renewal.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add subscription
          </Button>
        </div>
      </div>

      {/* ── Summary stats ─────────────────────────────────────────── */}
      {memberships.length > 0 && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
          }}
        >
          {[
            {
              label: 'Monthly cost',
              value: formatCurrency(stats.totalMonthly, currency),
              cls:   'border-income/25 bg-surface',
              color: 'text-income',
            },
            {
              label: 'Annual cost',
              value: formatCurrency(stats.totalMonthly * 12, currency),
              cls:   'border-expense/25 bg-surface',
              color: 'text-expense',
            },
            {
              label: 'Due soon',
              value: String(stats.dueSoon),
              cls:   stats.dueSoon > 0 ? 'border-amber-500/25 bg-amber-500/5' : 'border-accent/25 bg-surface',
              color: stats.dueSoon > 0 ? 'text-amber-400' : 'text-accent',
            },
          ].map(({ label, value, cls, color }) => (
            <motion.div
              key={label}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
              }}
              className={`rounded-xl border p-4 ${cls}`}
            >
              <p className="text-[10.5px] font-semibold text-foreground-subtle uppercase tracking-[0.09em]">{label}</p>
              <p className={`mt-2.5 font-mono text-[24px] font-bold leading-none ${color}`}>{value}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Analytics dashboard ────────────────────────────────────── */}
      <SubscriptionAnalytics
        memberships={memberships}
        transactions={transactions}
        currency={currency}
        customCategories={settings.customCategories}
      />

      {/* ── Bank-detected suggestions — enter-only animations; presence-managed
          exits wedge under StrictMode in dev, and `layout` on list rows is the
          known freeze pattern (see CLAUDE.md gotchas). ── */}
      {candidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-2xl border border-accent/20 bg-accent/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-foreground">Detected from your bank</p>
              <span className="text-xs text-foreground-subtle">— recurring payments</span>
            </div>

            <div className="space-y-2">
              {candidates.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center gap-3 rounded-xl border border-border-base bg-surface px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-foreground-subtle">
                      {formatCurrency(c.amount, currency)} · ~{c.cycle} · {c.occurrences}×
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" onClick={() => openFromCandidate(c)} className="h-7 px-2.5 text-xs">
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                    <button
                      onClick={() => dismissCandidate(c.key)}
                      className="rounded-lg p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-raised transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
      )}

      {/* ── Subscriptions list ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border-base bg-surface overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
            {memberships.length > 0
              ? `${memberships.length} Subscription${memberships.length !== 1 ? 's' : ''}`
              : 'Subscriptions'}
          </h2>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Empty state */}
        {memberships.length === 0 ? (
          <div className="flex flex-col items-center gap-4 border-t border-border-base bg-surface/50 py-16 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-3xl">
              💳
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">No subscriptions yet</p>
              <p className="text-xs text-foreground-subtle mt-1 max-w-xs">
                Track Netflix, Spotify, iCloud and any other recurring payments — get a countdown to when each is due.
              </p>
            </div>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add your first subscription
            </Button>
          </div>
        ) : (
          /* List */
          <div className="border-t border-border-base divide-y divide-border-base">
            {stats.sorted.map((m) => (
              <SubRow
                key={m.id}
                m={m}
                currency={currency}
                linkedTxs={linkedTxMap[m.id] ?? []}
                renewalTxs={renewalTxMap[m.id] ?? []}
                onEdit={openEdit}
                onDelete={setDeleteId}
                onConfirmRenewal={handleConfirmRenewal}
                onLogPayment={handleLogPayment}
                onLinkTx={setLinkingM}
                logging={loggingId === m.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <SubscriptionSheet
        isOpen={sheetOpen}
        onClose={closeSheet}
        onSave={handleSave}
        membership={editingM}
        prefill={prefill}
        userId={user?.id || ''}
      />

      <LinkTransactionModal
        membership={linkingM}
        transactions={transactions}
        currency={currency}
        onClose={() => setLinkingM(null)}
        onSelect={async (tx) => {
          if (linkingM) await handleConfirmRenewal(tx, linkingM);
          setLinkingM(null);
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Subscription"
        message="Are you sure you want to delete this subscription? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
