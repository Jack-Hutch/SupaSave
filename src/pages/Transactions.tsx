import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { format, addMonths } from 'date-fns';
import { Plus, Search, X, Filter, Settings2 } from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { TransactionList } from '../components/transactions/TransactionList';
import { TransactionSheet } from '../components/transactions/TransactionSheet';
import { CategoryManager } from '../components/transactions/CategoryManager';
import { SubscriptionSheet } from '../components/subscriptions/SubscriptionSheet';
import type { SubscriptionPrefill } from '../components/subscriptions/SubscriptionSheet';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { getAllCategories, COLOR_CLASSES } from '../lib/categories';
import { addSubLink } from '../utils/subscriptionUtils';
import type { Transaction, Membership } from '../types';
import type { GroupBy } from '../components/transactions/TransactionList';
import { SHARED_ID, sharedTransition, TAB_SPRING } from '../lib/motion';

// Subscription category names that match SubscriptionSheet's CATEGORIES list
const SUB_CATEGORIES = new Set([
  'Entertainment', 'Technology', 'Health & Fitness', 'Education',
  'Finance', 'Utilities', 'Shopping', 'Gaming', 'Music', 'Video',
  'News & Media', 'Productivity', 'Other',
]);

// Map from transaction category → subscription category
function toSubCategory(txCategory: string): string {
  // "Subscriptions" maps directly to "Entertainment" in the subscription sheet
  // (which is the closest match for most subscription services)
  if (txCategory === 'Subscriptions') return 'Entertainment';
  if (SUB_CATEGORIES.has(txCategory)) return txCategory;
  const map: Record<string, string> = {
    Dining:          'Other',
    Groceries:       'Other',
    Transport:       'Other',
    Housing:         'Utilities',
    Travel:          'Other',
    'Home & Garden': 'Other',
    Shopping:        'Shopping',
  };
  return map[txCategory] ?? 'Other';
}

// Pick a sensible default icon for the subscription based on transaction category
function toSubIcon(txCategory: string): string {
  const map: Record<string, string> = {
    Technology:        '💻',
    Entertainment:     '🎬',
    'Health & Fitness': '💪',
    Education:         '📚',
    Finance:           '💳',
    Utilities:         '☁️',
    Shopping:          '📦',
    Music:             '🎵',
    Video:             '📺',
    Gaming:            '🎮',
  };
  return map[txCategory] ?? '📦';
}

const SOURCES = ['', 'manual', 'up', 'mock'];

const GROUP_OPTIONS: { id: GroupBy; label: string }[] = [
  { id: 'date',     label: 'Date'     },
  { id: 'category', label: 'Category' },
  { id: 'payment',  label: 'Payment'  },
];

export function Transactions() {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const transactions    = useFinanceStore((s) => s.transactions);
  const bankConnection  = useFinanceStore((s) => s.bankConnection);
  // storeLoading is only used to show a skeleton on the very first load
  // (when there are genuinely no transactions yet). We intentionally DON'T
  // block the page when transactions already exist — background re-hydrations
  // from onAuthStateChange should be invisible.
  const storeLoading    = useFinanceStore((s) => s.loading);
  const storeError      = useFinanceStore((s) => s.error);
  const filters         = useFinanceStore((s) => s.transactionFilters);
  const setFilter       = useFinanceStore((s) => s.setFilter);
  const settings        = useFinanceStore((s) => s.settings);
  const addTransaction  = useFinanceStore((s) => s.addTransaction);
  const updateTx        = useFinanceStore((s) => s.updateTransaction);
  const deleteTx        = useFinanceStore((s) => s.deleteTransaction);
  const addMembership   = useFinanceStore((s) => s.addMembership);

  const customCategories = settings.customCategories ?? [];
  const allCategories    = useMemo(() => getAllCategories(customCategories), [customCategories]);

  const [sheetOpen,           setSheetOpen]           = useState(false);
  const [editingTx,           setEditingTx]           = useState<Transaction | null>(null);
  const [deleteId,            setDeleteId]            = useState<string | null>(null);
  const [deleting,            setDeleting]            = useState(false);
  const [showDateSource,      setShowDateSource]      = useState(false);
  const [groupBy,             setGroupBy]             = useState<GroupBy>('date');
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  // "Add as subscription" sheet state
  const [subSheetOpen,   setSubSheetOpen]   = useState(false);
  const [subPrefill,     setSubPrefill]     = useState<SubscriptionPrefill | null>(null);
  const [subSourceTxId,  setSubSourceTxId]  = useState<string | null>(null);

  const pillRowRef = useRef<HTMLDivElement>(null);

  const { success, error: toastError } = useToast();
  const currency = settings.currency || 'AUD';

  const handleCategoryChange = async (txId: string, category: string) => {
    // silent=true: keep the optimistic update even if Supabase sync fails,
    // so the category change always sticks in the UI for the session.
    await updateTx(txId, { category }, { silent: true });
  };

  const handleAddToSubscription = (tx: Transaction) => {
    const startDate = tx.date;

    // Default billing cycle is monthly — advance from the transaction date
    // by monthly cycles until the next billing date is actually in the future.
    // This means a transaction from 3 months ago still gets a correct upcoming
    // due date instead of one that's already passed.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let next = addMonths(new Date(startDate), 1);
    while (next <= today) next = addMonths(next, 1);
    const nextDate = format(next, 'yyyy-MM-dd');

    setSubSourceTxId(tx.id);
    setSubPrefill({
      name:              tx.merchant_name || tx.description,
      icon:              toSubIcon(tx.category),
      cost:              String(Math.abs(tx.amount)),
      billing_cycle:     'monthly',
      category:          toSubCategory(tx.category),
      start_date:        startDate,
      next_billing_date: nextDate,
    });
    setSubSheetOpen(true);
  };

  const handleSaveSubscription = async (data: Omit<Membership, 'id' | 'updated_at'>) => {
    try {
      const membershipId = await addMembership(data);
      // Tag the originating transaction so it shows the 🔁 badge and
      // appears as a confirmed payment in the Subscriptions history
      if (subSourceTxId) {
        const sourceTx = transactions.find((t) => t.id === subSourceTxId);
        if (sourceTx) {
          // silent=true: tagging is best-effort — don't block navigation on a sync failure
          await updateTx(subSourceTxId, {
            tags: addSubLink(sourceTx.tags, membershipId),
          }, { silent: true });
        }
      }
      success('Subscription added');
      // Navigate to subscriptions page so the user immediately sees the new
      // entry with its due date and days-until countdown
      navigate('/subscriptions');
    } catch (err) {
      toastError((err as { message?: string })?.message || 'Failed to add subscription');
      throw err;
    }
  };

  const handleAdd  = () => { setEditingTx(null); setSheetOpen(true); };
  const handleEdit = (tx: Transaction) => { setEditingTx(tx); setSheetOpen(true); };

  const handleSave = async (data: Omit<Transaction, 'id' | 'updated_at'>) => {
    try {
      if (editingTx) { await updateTx(editingTx.id, data); success('Transaction updated'); }
      else           { await addTransaction(data);          success('Transaction added');   }
    } catch (err) {
      toastError((err as { message?: string })?.message ?? 'Failed to save');
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteTx(deleteId);
      success('Transaction deleted');
      setDeleteId(null);
    } catch (err) {
      toastError((err as { message?: string })?.message ?? 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Which categories actually appear in the transaction list (for pill row)
  const usedCategories = useMemo(() => {
    const names = new Set(transactions.map((t) => t.category).filter(Boolean));
    return allCategories.filter((c) => names.has(c.name));
  }, [transactions, allCategories]);

  const hasDateSourceFilters = filters.dateFrom || filters.dateTo || filters.source;

  // ── First-load skeleton ──────────────────────────────────────────
  // Only block the page when we're loading AND have no transactions yet.
  // Background re-hydrations (onAuthStateChange token refreshes) should
  // be invisible — don't flash a skeleton if data is already on screen.
  if (storeLoading && transactions.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-9 space-y-4">
        <div className="h-10 rounded-xl bg-surface-raised animate-pulse" />
        <div className="h-8  rounded-xl bg-surface-raised animate-pulse" />
        <div className="rounded-xl border border-border-base bg-surface overflow-hidden divide-y divide-border-base">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="h-9 w-9 rounded-full bg-surface-raised animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 rounded bg-surface-raised animate-pulse" />
                <div className="h-2.5 w-1/4 rounded bg-surface-raised animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded bg-surface-raised animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Hydration error ──────────────────────────────────────────────
  if (storeError && transactions.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-16 flex flex-col items-center gap-4 text-center">
        <div className="text-3xl">⚠️</div>
        <p className="text-sm font-semibold text-foreground">Failed to load transactions</p>
        <p className="text-xs text-foreground-subtle max-w-sm">{storeError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── No data — prompt bank connect or sync ────────────────────────
  if (!storeLoading && transactions.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-9 space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search transactions…"
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            leftIcon={<Search className="h-4 w-4" />}
            className="flex-1"
            disabled
          />
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-base bg-surface px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-3xl">
            {bankConnection ? '🔄' : '🏦'}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {bankConnection ? 'Your transactions need a sync' : 'No transactions yet'}
            </p>
            <p className="text-xs text-foreground-subtle mt-1 max-w-xs">
              {bankConnection
                ? 'Your bank is connected but transaction data needs to be re-synced — this happens after first setup or a data reset.'
                : 'Connect your Up Bank account to automatically import transactions, or add one manually.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {bankConnection ? (
              <Button onClick={() => navigate('/connect')}>
                🔄 Go to Connect Bank &amp; Sync
              </Button>
            ) : (
              <Button onClick={() => navigate('/connect')}>
                🏦 Connect your bank
              </Button>
            )}
            <Button variant="outline" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add manually
            </Button>
          </div>
        </div>

        <TransactionSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSave={handleSave}
          transaction={editingTx}
          userId={user?.id || ''}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-9 space-y-4">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="flex items-center gap-3 mb-[6px]">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Transactions</h1>
            <span
              className="font-mono text-[11px] font-medium px-2 py-[3px] rounded-[5px] tracking-[0.02em]"
              style={{ color: 'rgb(var(--accent))', background: 'var(--accent-soft)' }}
            >
              {transactions.length.toLocaleString()} records
            </span>
          </div>
          <p className="text-[13.5px] text-foreground-muted">Every dollar in and out, across all linked accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add transaction
          </Button>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search transactions…"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          leftIcon={<Search className="h-4 w-4" />}
          rightIcon={
            filters.search
              ? (
                <button
                  onClick={() => setFilter({ search: '' })}
                  className="hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )
              : null
          }
          className="flex-1"
        />
        {/* Date / source filter toggle — uses outline always; dot badge when filters active */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDateSource((v) => !v)}
            aria-label="Date & source filters"
            aria-expanded={showDateSource}
            className={showDateSource ? 'border-accent text-accent' : ''}
          >
            <Filter className="h-4 w-4" />
          </Button>
          {hasDateSourceFilters && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-accent border-2 border-canvas pointer-events-none" />
          )}
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* ── Category pill row ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Scrollable pill strip */}
        <div
          ref={pillRowRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 pb-0.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* "All" pill */}
          <button
            onClick={() => setFilter({ category: '' })}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              !filters.category
                ? 'bg-accent text-accent-fg border-accent'
                : 'border-border-base bg-surface text-foreground-muted hover:bg-surface-raised'
            }`}
          >
            All
          </button>

          {/* One pill per category that has transactions */}
          {usedCategories.map((cat) => {
            const active = filters.category === cat.name;
            const cls    = COLOR_CLASSES[cat.color];
            return (
              <button
                key={cat.id}
                onClick={() =>
                  setFilter({ category: active ? '' : cat.name })
                }
                className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? `${cls.badge} border-current ring-2 ring-current/20`
                    : 'border-border-base bg-surface text-foreground-muted hover:bg-surface-raised'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Categories manager button */}
        <button
          onClick={() => setCategoryManagerOpen(true)}
          className="shrink-0 flex items-center gap-1 rounded-lg border border-border-base bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          aria-label="Manage categories"
          title="Manage categories"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Categories</span>
        </button>
      </div>

      {/* ── Date / source filter panel ───────────────────────────────── */}
      <AnimatePresence initial={false}>
        {showDateSource && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border-base bg-surface p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Filters</p>
                <div className="flex items-center gap-2">
                  {hasDateSourceFilters && (
                    <button
                      onClick={() => setFilter({ dateFrom: '', dateTo: '', source: '' })}
                      className="text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setShowDateSource(false)}
                    className="rounded-md p-1 text-foreground-subtle hover:text-foreground hover:bg-surface-raised transition-colors"
                    aria-label="Close filters"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Select
                  label="Source"
                  value={filters.source}
                  onChange={(e) => setFilter({ source: e.target.value })}
                  options={SOURCES.map((s) => ({ value: s, label: s || 'All sources' }))}
                />
                <Input
                  label="From"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter({ dateFrom: e.target.value })}
                />
                <Input
                  label="To"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilter({ dateTo: e.target.value })}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Count + group-by toggle ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-subtle">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          {filters.category && (
            <span className="ml-1 text-foreground-muted font-medium">
              · {filters.category}
            </span>
          )}
        </p>

        {/* Sliding pill group-by selector */}
        <div className="flex items-center rounded-lg border border-border-base bg-surface p-0.5">
          {GROUP_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setGroupBy(id)}
              className="relative px-3 py-1 text-xs font-medium rounded-md"
            >
              {groupBy === id && (
                <motion.div
                  layoutId="tx-groupby-pill"
                  className="absolute inset-0 rounded-md bg-accent"
                  transition={TAB_SPRING}
                  style={{ borderRadius: 6 }}
                />
              )}
              <span className={`relative z-10 transition-colors duration-150 ${
                groupBy === id ? 'text-accent-fg' : 'text-foreground-muted'
              }`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Transaction list ─────────────────────────────────────────── */}
      <motion.div
        layoutId={SHARED_ID.cardTransactions}
        layout
        transition={sharedTransition}
        style={{ borderRadius: 12 }}
      >
        <TransactionList
          transactions={transactions}
          filters={filters}
          currency={currency}
          groupBy={groupBy}
          onEdit={handleEdit}
          onDelete={setDeleteId}
          onCategoryChange={handleCategoryChange}
          onAddToSubscription={handleAddToSubscription}
          onAdd={handleAdd}
          customCategories={customCategories}
        />
      </motion.div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <TransactionSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        transaction={editingTx}
        userId={user?.id || ''}
      />

      <CategoryManager
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
      />

      <SubscriptionSheet
        isOpen={subSheetOpen}
        onClose={() => { setSubSheetOpen(false); setSubPrefill(null); setSubSourceTxId(null); }}
        onSave={handleSaveSubscription}
        prefill={subPrefill}
        userId={user?.id || ''}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
