import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowLeftRight, CreditCard, Banknote } from 'lucide-react';
import type { Transaction, TransactionFilters, CategoryDef } from '../../types';
import { getCategoryBadgeClass } from '../../lib/categories';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';

const PAGE_SIZE = 30;

export type GroupBy = 'date' | 'category' | 'payment';

interface TransactionListProps {
  transactions:          Transaction[];
  filters?:              TransactionFilters;
  currency?:             string;
  groupBy?:              GroupBy;
  onEdit?:               (tx: Transaction) => void;
  onDelete?:             (id: string) => void;
  onCategoryChange?:     (txId: string, category: string) => void;
  onAddToSubscription?:  (tx: Transaction) => void;
  onAdd?:                () => void;
  maxItems?:             number;
  customCategories?:     CategoryDef[];
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export function applyFilters(txs: Transaction[], filters?: TransactionFilters): Transaction[] {
  if (!filters) return txs;
  return txs.filter((tx) => {
    if (
      filters.search &&
      !tx.description.toLowerCase().includes(filters.search.toLowerCase()) &&
      !(tx.merchant_name || '').toLowerCase().includes(filters.search.toLowerCase()) &&
      !(tx.category || '').toLowerCase().includes(filters.search.toLowerCase())
    ) return false;
    if (filters.category && tx.category !== filters.category) return false;
    if (filters.dateFrom && tx.date < filters.dateFrom) return false;
    if (filters.dateTo   && tx.date > filters.dateTo)   return false;
    if (filters.source   && tx.source !== filters.source) return false;
    return true;
  });
}

// ─── Grouping helpers ─────────────────────────────────────────────────────────

interface Group {
  key:   string;
  label: string;
  items: Transaction[];
  /** Net amount for expenses (negative) and income (positive) */
  net:   number;
}

function groupByDate(txs: Transaction[]): Group[] {
  const map: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    (map[tx.date] ??= []).push(tx);
  }
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      key:   date,
      label: formatDateLabel(date),
      items,
      net:   items.reduce((s, t) => s + (t.is_income ? t.amount : -t.amount), 0),
    }));
}

function groupByCategory(txs: Transaction[]): Group[] {
  const map: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const key = tx.category || 'Uncategorized';
    (map[key] ??= []).push(tx);
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => {
      // Sort by total absolute spend descending
      const ta = a.reduce((s, t) => s + t.amount, 0);
      const tb = b.reduce((s, t) => s + t.amount, 0);
      return tb - ta;
    })
    .map(([cat, items]) => ({
      key:   cat,
      label: cat,
      items: [...items].sort((a, b) => b.date.localeCompare(a.date)),
      net:   items.reduce((s, t) => s + (t.is_income ? t.amount : -t.amount), 0),
    }));
}

function groupByPayment(txs: Transaction[]): Group[] {
  const map: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const payTag = (tx.tags ?? []).find((t) => t.startsWith('pay:'));
    const key = payTag ? payTag.slice(4) : 'Unspecified';
    (map[key] ??= []).push(tx);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pay, items]) => ({
      key:   pay,
      label: pay,
      items: [...items].sort((a, b) => b.date.localeCompare(a.date)),
      net:   items.reduce((s, t) => s + (t.is_income ? t.amount : -t.amount), 0),
    }));
}

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today     = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    d.setHours(0,0,0,0);
    if (d.getTime() === today.getTime())     return 'Today';
    if (d.getTime() === yesterday.getTime()) return 'Yesterday';
    return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

// ─── Sticky date header ───────────────────────────────────────────────────────

function useIsSticky(ref: React.RefObject<HTMLDivElement>): boolean {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setStuck(!e.isIntersecting),
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return stuck;
}

function DateGroupHeader({ label }: { label: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stuck = useIsSticky(sentinelRef);

  return (
    <>
      <div ref={sentinelRef} aria-hidden style={{ height: 0 }} />
      <motion.div
        className="sticky top-0 z-10 px-3"
        animate={stuck
          ? { paddingTop: 8, paddingBottom: 8, borderRadius: 10, boxShadow: '0 4px 24px -4px rgba(0,0,0,0.45)' }
          : { paddingTop: 6, paddingBottom: 6, borderRadius: 0,  boxShadow: '0 0px 0px 0px rgba(0,0,0,0)' }
        }
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      >
        <motion.div
          className="absolute inset-0 rounded-[inherit]"
          animate={stuck ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{ background: 'rgba(17,24,39,0.90)', borderBottom: stuck ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
        />
        <motion.span
          className="relative block text-xs font-semibold uppercase tracking-wider"
          animate={stuck ? { color: 'rgba(156,163,175,1)' } : { color: 'rgba(107,114,128,1)' }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.span>
      </motion.div>
    </>
  );
}

// ─── Collapsible section header (category / payment) ─────────────────────────

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  Card:            <CreditCard className="h-3.5 w-3.5" />,
  Cash:            <Banknote className="h-3.5 w-3.5" />,
  'Bank Transfer': <ArrowLeftRight className="h-3.5 w-3.5" />,
  'Direct Debit':  <ArrowLeftRight className="h-3.5 w-3.5" />,
};

interface SectionHeaderProps {
  group:            Group;
  currency:         string;
  mode:             'category' | 'payment';
  open:             boolean;
  onToggle:         () => void;
  customCategories?: CategoryDef[];
}

function SectionHeader({ group, currency, mode, open, onToggle, customCategories }: SectionHeaderProps) {
  const colorClass = mode === 'category'
    ? getCategoryBadgeClass(group.label, customCategories)
    : 'bg-surface-raised text-foreground-muted border-border-base';

  const netColor = group.net >= 0 ? 'text-income' : 'text-expense';

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-raised transition-colors rounded-lg text-left"
    >
      {/* Category badge / payment icon */}
      <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${colorClass}`}>
        {mode === 'payment' && (PAYMENT_ICONS[group.label] ?? <CreditCard className="h-3.5 w-3.5" />)}
        {group.label}
      </div>

      {/* Count */}
      <span className="text-xs text-foreground-subtle">
        {group.items.length} {group.items.length === 1 ? 'transaction' : 'transactions'}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Net total */}
      <span className={`font-mono text-sm font-semibold ${netColor}`}>
        {group.net >= 0 ? '+' : ''}{formatCurrency(Math.abs(group.net), currency)}
      </span>

      {/* Chevron */}
      <motion.div
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        className="shrink-0 text-foreground-subtle"
      >
        <ChevronDown className="h-4 w-4" />
      </motion.div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TransactionList({
  transactions,
  filters,
  currency = 'AUD',
  groupBy  = 'date',
  onEdit,
  onDelete,
  onCategoryChange,
  onAddToSubscription,
  onAdd,
  maxItems,
  customCategories,
}: TransactionListProps) {
  const [page, setPage]           = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Reset collapsed sections and pagination whenever the group mode changes
  useEffect(() => {
    setCollapsed(new Set());
    setPage(1);
  }, [groupBy]);

  const filtered = useMemo(() => applyFilters(transactions, filters), [transactions, filters]);
  const sliced   = maxItems ? filtered.slice(0, maxItems) : filtered;

  // For date grouping keep pagination; other modes show all
  const paginated = maxItems || groupBy !== 'date' ? sliced : sliced.slice(0, page * PAGE_SIZE);
  const hasMore   = !maxItems && groupBy === 'date' && filtered.length > page * PAGE_SIZE;

  const groups = useMemo(() => {
    if (groupBy === 'category') return groupByCategory(paginated);
    if (groupBy === 'payment')  return groupByPayment(paginated);
    return groupByDate(paginated);
  }, [paginated, groupBy]);

  const toggleSection = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<ArrowLeftRight className="h-6 w-6" />}
        title="No transactions"
        description={
          filters?.search || filters?.category
            ? 'No transactions match your filters.'
            : 'Add your first transaction to get started.'
        }
        action={onAdd ? { label: 'Add Transaction', onClick: onAdd } : undefined}
      />
    );
  }

  return (
    <div>
      {/* mode="popLayout" pulls exiting items out of flow before animating them,
          preventing the "all groups collapse to height:0 simultaneously" flash
          that happened when switching between Date / Category / Payment modes. */}
      <AnimatePresence initial={false} mode="popLayout">
        {groups.map(({ key, label, items, net }) => {
          const isOpen = !collapsed.has(key);

          return (
            <motion.div
              key={key}
              className="mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Header — sticky for date, collapsible for category/payment */}
              {groupBy === 'date' ? (
                <DateGroupHeader label={label} />
              ) : (
                <SectionHeader
                  group={{ key, label, items, net }}
                  currency={currency}
                  mode={groupBy}
                  open={isOpen}
                  onToggle={() => toggleSection(key)}
                  customCategories={customCategories}
                />
              )}

              {/* Transaction rows */}
              <AnimatePresence initial={false}>
                {(groupBy === 'date' || isOpen) && (
                  <motion.div
                    key="rows"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 py-0.5">
                      {items.map((tx, i) => (
                        <TransactionItem
                          key={tx.id}
                          transaction={tx}
                          currency={currency}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onCategoryChange={onCategoryChange}
                          onAddToSubscription={onAddToSubscription}
                          index={i}
                          customCategories={customCategories}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {hasMore && (
        <motion.div className="mt-4 flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Load more ({filtered.length - page * PAGE_SIZE} remaining)
          </Button>
        </motion.div>
      )}
    </div>
  );
}
