import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, LayoutDashboard, Receipt, CreditCard, TrendingUp, PieChart,
  Briefcase, Settings as SettingsIcon, Link as LinkIcon, Plus, RefreshCw,
  Sun, Moon, LogOut, CornerDownLeft, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { signOut } from '../hooks/useAuth';
import { formatCurrency } from '../lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  keywords: string;
  icon: React.ReactNode;
  group: 'Actions' | 'Go to' | 'Transactions';
  run: () => void;
}

/**
 * Global command palette (⌘K / Ctrl+K).
 *
 * Replaces the previously-dead search box in the Header (its onClick was empty
 * and the advertised ⌘K hint did nothing). Provides fuzzy navigation across
 * pages, live transaction search, and quick actions — fully keyboard driven.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const transactions   = useFinanceStore((s) => s.transactions);
  const settings       = useFinanceStore((s) => s.settings);
  const bankConnection = useFinanceStore((s) => s.bankConnection);
  const setTheme       = useFinanceStore((s) => s.setTheme);
  const setFilter      = useFinanceStore((s) => s.setFilter);
  const syncBankTransactions = useFinanceStore((s) => s.syncBankTransactions);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currency = settings.currency || 'AUD';
  const isDark = (settings.theme ?? 'dark') !== 'light';

  const close = () => { setQuery(''); setSelected(0); onClose(); };

  const go = (path: string) => { navigate(path); close(); };

  // ── Static commands (actions + navigation) ──────────────────────────
  const baseItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      { id: 'add-tx', label: 'Add transaction', hint: 'New entry', keywords: 'add new transaction create expense income',
        icon: <Plus className="h-4 w-4" />, group: 'Actions', run: () => go('/transactions') },
    ];

    if (bankConnection?.status === 'connected') {
      items.push({
        id: 'sync', label: 'Sync bank transactions', hint: 'Up Bank', keywords: 'sync refresh bank up transactions update',
        icon: <RefreshCw className="h-4 w-4" />, group: 'Actions',
        run: () => { void syncBankTransactions(); close(); },
      });
    } else {
      items.push({
        id: 'connect', label: 'Connect bank', keywords: 'connect bank up link account',
        icon: <LinkIcon className="h-4 w-4" />, group: 'Actions', run: () => go('/connect'),
      });
    }

    items.push({
      id: 'theme', label: isDark ? 'Switch to light theme' : 'Switch to dark theme', keywords: 'theme dark light mode appearance toggle',
      icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, group: 'Actions',
      run: () => { setTheme(isDark ? 'light' : 'dark'); close(); },
    });

    items.push({
      id: 'signout', label: 'Sign out', keywords: 'sign out log out logout exit',
      icon: <LogOut className="h-4 w-4" />, group: 'Actions',
      run: () => { void signOut(); close(); },
    });

    const pages: Array<[string, string, React.ReactNode, string]> = [
      ['/', 'Dashboard', <LayoutDashboard className="h-4 w-4" />, 'dashboard home overview'],
      ['/transactions', 'Transactions', <Receipt className="h-4 w-4" />, 'transactions payments history'],
      ['/subscriptions', 'Subscriptions', <CreditCard className="h-4 w-4" />, 'subscriptions recurring memberships'],
      ['/cashflow', 'Cash Flow', <TrendingUp className="h-4 w-4" />, 'cash flow income expense'],
      ['/analytics', 'Analytics', <PieChart className="h-4 w-4" />, 'analytics charts spending categories'],
      ['/work', 'Work Shifts', <Briefcase className="h-4 w-4" />, 'work shifts pay income roster'],
      ['/settings', 'Settings', <SettingsIcon className="h-4 w-4" />, 'settings preferences budgets account'],
    ];
    for (const [path, label, icon, keywords] of pages) {
      items.push({
        id: `nav-${path}`, label, keywords, icon, group: 'Go to', run: () => go(path),
      });
    }

    return items;
  }, [bankConnection, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Transaction search results ──────────────────────────────────────
  const txItems = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return transactions
      .filter((tx) => {
        const name = (tx.merchant_name || tx.description || '').toLowerCase();
        return name.includes(q) || tx.category.toLowerCase().includes(q);
      })
      .slice(0, 6)
      .map((tx) => ({
        id: `tx-${tx.id}`,
        label: tx.merchant_name || tx.description,
        hint: `${tx.category} · ${formatCurrency(Math.abs(tx.amount), currency)}`,
        keywords: '',
        icon: <Receipt className="h-4 w-4" />,
        group: 'Transactions' as const,
        run: () => { setFilter({ search: tx.merchant_name || tx.description }); go('/transactions'); },
      }));
  }, [query, transactions, currency]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter + group ──────────────────────────────────────────────────
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? baseItems.filter((i) => i.label.toLowerCase().includes(q) || i.keywords.includes(q))
      : baseItems;
    return [...filtered, ...txItems];
  }, [query, baseItems, txItems]);

  const grouped = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    for (const item of results) {
      (groups[item.group] ??= []).push(item);
    }
    return groups;
  }, [results]);

  // Reset selection whenever the result set changes
  useEffect(() => { setSelected(0); }, [query]);

  // Focus the input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      // Defer to after the portal mounts
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); results[selected]?.run(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, results, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the selected row in view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  // Build a flat index map so each row knows its global position
  let flatIndex = -1;

  // No AnimatePresence — a wedged exit (StrictMode dev) would leave the
  // full-screen backdrop blocking every click. Enter-only, instant close.
  return createPortal(
    open ? (
      <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={close}
        />

        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="relative w-full max-w-xl rounded-2xl border border-border-base bg-surface shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-border-base">
            <Search className="h-4 w-4 text-foreground-subtle shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, transactions, actions…"
              className="flex-1 bg-transparent py-3.5 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none"
            />
            <kbd className="font-mono text-[10px] rounded px-1.5 py-0.5 text-foreground-subtle bg-surface-raised border border-border-base">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[52vh] overflow-y-auto overscroll-contain py-2">
            {results.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-foreground-subtle">No results for “{query}”</p>
              </div>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="px-2 pb-1.5">
                  <p className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-foreground-subtle">
                    {group}
                  </p>
                  {items.map((item) => {
                    flatIndex += 1;
                    const idx = flatIndex;
                    const active = idx === selected;
                    return (
                      <button
                        key={item.id}
                        data-index={idx}
                        onMouseMove={() => setSelected(idx)}
                        onClick={() => item.run()}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          active ? 'bg-accent/15 text-foreground' : 'text-foreground-muted hover:bg-surface-raised'
                        }`}
                      >
                        <span className={active ? 'text-accent' : 'text-foreground-subtle'}>{item.icon}</span>
                        <span className="flex-1 min-w-0 truncate text-sm">{item.label}</span>
                        {item.hint && (
                          <span className="font-mono text-[11px] text-foreground-subtle truncate max-w-[45%]">{item.hint}</span>
                        )}
                        {active && <CornerDownLeft className="h-3.5 w-3.5 text-accent shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 border-t border-border-base px-4 py-2 text-[11px] text-foreground-subtle">
            <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
            <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> select</span>
            <span className="ml-auto flex items-center gap-1"><kbd className="font-mono">⌘K</kbd> to toggle</span>
          </div>
        </motion.div>
      </div>
    ) : null,
    document.body,
  );
}
