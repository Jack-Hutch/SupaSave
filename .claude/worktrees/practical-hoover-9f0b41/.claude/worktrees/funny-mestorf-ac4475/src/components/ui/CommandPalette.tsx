import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Receipt,
  Repeat,
  TrendingUp,
  PieChart,
  Settings as SettingsIcon,
  Briefcase,
  Link as LinkIcon,
} from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency } from '../../lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: Receipt },
  { label: 'Subscriptions', to: '/subscriptions', icon: Repeat },
  { label: 'Cash Flow', to: '/cashflow', icon: TrendingUp },
  { label: 'Analytics', to: '/analytics', icon: PieChart },
  { label: 'Work Shifts', to: '/work', icon: Briefcase },
  { label: 'Settings', to: '/settings', icon: SettingsIcon, hint: 'Account, theme, categories' },
  { label: 'Connect Bank', to: '/connect', icon: LinkIcon },
];

export function CommandPalette(): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const transactions = useFinanceStore((s) => s.transactions);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const matchedTx = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return transactions
      .filter((t) => {
        const desc = t.description?.toLowerCase() ?? '';
        const mer = t.merchant_name?.toLowerCase() ?? '';
        return desc.includes(q) || mer.includes(q);
      })
      .slice(0, 8);
  }, [query, transactions]);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            key="cmdk-panel"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] as const }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-xl border border-border-base bg-surface shadow-float overflow-hidden"
          >
            <Command
              shouldFilter={false}
              className="flex flex-col"
              label="Command palette"
            >
              <div className="flex items-center gap-2 border-b border-border-base px-3">
                <Search className="h-4 w-4 text-foreground-subtle shrink-0" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search transactions, jump to a page…"
                  className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none"
                />
                <kbd className="hidden sm:inline rounded border border-border-base bg-surface-raised px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted">
                  ESC
                </kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-xs text-foreground-subtle">
                  No results.
                </Command.Empty>

                <Command.Group
                  heading="Navigate"
                  className="text-[10px] uppercase tracking-wider text-foreground-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                >
                  {NAV.map((n) => {
                    const Icon = n.icon;
                    return (
                      <Command.Item
                        key={n.to}
                        value={`nav ${n.label}`}
                        onSelect={() => go(n.to)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-surface-hover data-[selected=true]:bg-surface-hover"
                      >
                        <Icon className="h-4 w-4 text-foreground-muted" />
                        <span>{n.label}</span>
                        {n.hint && (
                          <span className="ml-auto text-[10px] text-foreground-subtle">
                            {n.hint}
                          </span>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                {matchedTx.length > 0 && (
                  <Command.Group
                    heading="Transactions"
                    className="mt-2 text-[10px] uppercase tracking-wider text-foreground-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                  >
                    {matchedTx.map((t) => (
                      <Command.Item
                        key={t.id}
                        value={`tx ${t.id} ${t.description}`}
                        onSelect={() => go(`/transactions?focus=${t.id}`)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-surface-hover data-[selected=true]:bg-surface-hover"
                      >
                        <Receipt className="h-4 w-4 text-foreground-muted shrink-0" />
                        <span className="truncate">
                          {t.merchant_name || t.description}
                        </span>
                        <span
                          className={`ml-auto text-xs tabular-nums ${
                            t.amount < 0 ? 'text-expense' : 'text-income'
                          }`}
                        >
                          {formatCurrency(t.amount)}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
              <div className="flex items-center justify-between border-t border-border-base px-3 py-1.5 text-[10px] text-foreground-subtle">
                <span>
                  <kbd className="font-mono">↑↓</kbd> navigate
                </span>
                <span>
                  <kbd className="font-mono">↵</kbd> select
                </span>
                <span>
                  <kbd className="font-mono">⌘K</kbd> toggle
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
