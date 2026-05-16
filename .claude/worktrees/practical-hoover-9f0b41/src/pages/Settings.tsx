import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Trash2, Plus, X, Bell, BellOff, Target, ShieldAlert,
  Paintbrush, Moon, Sun, Palette, Check, SlidersHorizontal, Tag, Download,
} from 'lucide-react';
import { CategoryManager } from '../components/transactions/CategoryManager';
import { useFinanceStore } from '../store/financeStore';
import { useToast } from '../hooks/useToast';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { getCategoryTotals } from '../utils/analyticsUtils';
import { formatCurrency } from '../lib/utils';
import { getAllCategories } from '../lib/categories';
import { THEMES } from '../lib/theme';
import type { ThemeVariant } from '../lib/theme';
import type { CategoryDef } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { value: 'AUD', label: 'AUD – Australian Dollar' },
  { value: 'USD', label: 'USD – US Dollar' },
  { value: 'EUR', label: 'EUR – Euro' },
  { value: 'GBP', label: 'GBP – British Pound' },
  { value: 'NZD', label: 'NZD – New Zealand Dollar' },
  { value: 'CAD', label: 'CAD – Canadian Dollar' },
  { value: 'SGD', label: 'SGD – Singapore Dollar' },
  { value: 'JPY', label: 'JPY – Japanese Yen' },
];

// Built-in budget-eligible categories (Income + Uncategorized excluded).
// Custom categories are merged in at render time via the store.
const BUILT_IN_BUDGET_CATEGORIES = [
  'Groceries', 'Dining', 'Transport', 'Entertainment', 'Technology',
  'Utilities', 'Housing', 'Health & Fitness', 'Shopping', 'Travel',
  'Home & Garden', 'Education', 'Finance', 'Subscriptions',
];

const PRESET_COLORS = [
  { hex: '#6366f1', label: 'Indigo'  },
  { hex: '#8b5cf6', label: 'Violet'  },
  { hex: '#ec4899', label: 'Pink'    },
  { hex: '#f59e0b', label: 'Amber'   },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#3b82f6', label: 'Blue'    },
  { hex: '#ef4444', label: 'Red'     },
  { hex: '#f97316', label: 'Orange'  },
];

type Section = 'appearance' | 'notifications' | 'budgets' | 'categories' | 'install' | 'danger';

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'appearance',    label: 'Appearance',    icon: Paintbrush  },
  { id: 'notifications', label: 'Notifications', icon: Bell        },
  { id: 'budgets',       label: 'Budgets',       icon: Target      },
  { id: 'categories',   label: 'Categories',    icon: Tag         },
  { id: 'install',       label: 'Install App',   icon: Download    },
  { id: 'danger',        label: 'Danger Zone',   icon: ShieldAlert },
];

// ─── Panel components (proper components, not inline JSX variables) ───────────
// Defining as real components prevents them from being re-created on every
// render, which was causing budget bars to animate from 0 on every section
// visit and toggle state to flicker.

interface AppearancePanelProps {
  theme: string;
  themeVariant: ThemeVariant;
  primaryColor?: string;
  currency: string;
  effectiveMode: 'light' | 'dark';
  onTheme: (t: 'light' | 'dark' | 'system') => void;
  onVariant: (v: ThemeVariant) => void;
  onColor: (hex: string) => void;
  onResetColor: () => void;
  onCurrency: (c: string) => void;
}

function AppearancePanel({
  theme, themeVariant, primaryColor, currency, effectiveMode,
  onTheme, onVariant, onColor, onResetColor, onCurrency,
}: AppearancePanelProps) {
  const themeOptions = [
    { id: 'dark'  as const, icon: Moon, label: 'Dark'  },
    { id: 'light' as const, icon: Sun,  label: 'Light' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Mode ── */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Mode</p>
        <div className="flex gap-2">
          {themeOptions.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onTheme(id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                theme === id
                  ? 'border-accent bg-accent/12 text-accent'
                  : 'border-border-base text-foreground-muted hover:border-border-subtle hover:text-foreground'
              }`}
            >
              {theme === id && (
                <motion.div
                  layoutId="settings-mode-pill"
                  className="absolute inset-0 rounded-lg bg-accent/12 border border-accent/30"
                  transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.7 }}
                  style={{ borderRadius: 8 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Color scheme ── */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Color Scheme</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const isActive = (themeVariant ?? 'default') === t.id;
            const bg     = effectiveMode === 'dark' ? t.previewDark  : t.previewLight;
            const accent = effectiveMode === 'dark' ? t.accentDark   : t.accentLight;
            return (
              <button
                key={t.id}
                onClick={() => onVariant(t.id as ThemeVariant)}
                className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  isActive
                    ? 'border-accent bg-accent/10'
                    : 'border-border-base hover:border-border-subtle hover:bg-surface-raised'
                }`}
              >
                {/* Colour swatch — gradient shows both bg and accent */}
                <div
                  className="h-9 w-9 rounded-lg shrink-0 overflow-hidden shadow-sm border border-white/10"
                  style={{ backgroundColor: bg }}
                >
                  <div
                    className="h-full w-full"
                    style={{ background: `linear-gradient(135deg, transparent 40%, ${accent})` }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-foreground-subtle truncate">{t.description}</p>
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                    <Check className="h-2.5 w-2.5 text-accent-fg" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Accent colour ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-foreground-muted" />
            <p className="text-sm font-medium text-foreground">Accent Colour</p>
          </div>
          {primaryColor && (
            <button
              onClick={onResetColor}
              className="text-xs text-foreground-subtle hover:text-foreground transition-colors"
            >
              Reset to theme default
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map(({ hex, label }) => {
            const isActive = primaryColor === hex;
            return (
              <button
                key={hex}
                onClick={() => onColor(hex)}
                title={label}
                className={`relative h-8 w-8 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                  isActive ? 'scale-110' : ''
                }`}
                style={{
                  backgroundColor: hex,
                  boxShadow: isActive ? `0 0 0 2px var(--color-canvas, #030712), 0 0 0 4px ${hex}` : undefined,
                }}
              >
                {isActive && (
                  <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
                )}
              </button>
            );
          })}
          {/* Custom colour picker */}
          <label
            className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-border-base hover:border-accent transition-colors cursor-pointer overflow-hidden"
            title="Custom colour"
          >
            <input
              type="color"
              value={primaryColor || '#6366f1'}
              onChange={(e) => onColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <SlidersHorizontal className="h-3 w-3 text-foreground-subtle pointer-events-none" />
          </label>
        </div>
      </div>

      {/* ── Currency ── */}
      <Select
        label="Currency"
        value={currency}
        onChange={(e) => onCurrency(e.target.value)}
        options={CURRENCIES}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface NotificationsPanelProps {
  enabled: boolean;
  onToggle: () => void;
}

function NotificationsPanel({ enabled, onToggle }: NotificationsPanelProps) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xl border border-border-base p-4 hover:bg-surface-raised transition-colors"
    >
      <div className="flex items-center gap-3">
        {enabled
          ? <Bell    className="h-5 w-5 text-accent" />
          : <BellOff className="h-5 w-5 text-foreground-subtle" />
        }
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Push Notifications</p>
          <p className="text-xs text-foreground-subtle mt-0.5">
            Get alerts for upcoming bills and subscription renewals
          </p>
        </div>
      </div>
      <div className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
        enabled ? 'bg-accent' : 'bg-surface-raised'
      }`}>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface BudgetsPanelProps {
  budgets:        Record<string, number>;
  categoryTotals: Record<string, number>;
  currency:       string;
  allCategories:  CategoryDef[];
  onRemove:       (cat: string) => void;
  onAdd:          (cat: string, amount: string) => void;
}

function BudgetsPanel({ budgets, categoryTotals, currency, allCategories, onRemove, onAdd }: BudgetsPanelProps) {
  const [newCat, setNewCat] = useState('');
  const [newAmt, setNewAmt] = useState('');

  const handleAdd = () => {
    if (!newCat || !newAmt) return;
    onAdd(newCat, newAmt);
    setNewCat('');
    setNewAmt('');
  };

  const activeBudgets = Object.entries(budgets).filter(([, amt]) => amt > 0);

  return (
    <div className="space-y-3">
      {activeBudgets.map(([cat, budget]) => {
        const spent = categoryTotals[cat] || 0;
        const pct   = Math.min((spent / budget) * 100, 100);
        const over  = spent > budget;
        return (
          <div key={cat} className="rounded-xl border border-border-base p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{cat}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground-muted">
                  {formatCurrency(spent, currency)} / {formatCurrency(budget, currency)}
                </span>
                <button
                  onClick={() => onRemove(cat)}
                  className="rounded p-0.5 text-foreground-subtle hover:text-expense transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${over ? 'bg-expense' : pct > 80 ? 'bg-yellow-500' : 'bg-accent'}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              />
            </div>
          </div>
        );
      })}

      {activeBudgets.length === 0 && (
        <p className="text-sm text-foreground-subtle text-center py-4">
          No budgets set yet. Add one below.
        </p>
      )}

      {/* Add new budget */}
      <div className="flex gap-2 pt-1">
        <div className="flex-1">
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="w-full rounded-lg border border-border-base bg-surface-raised px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Select category…</option>
            {allCategories
              .filter((c) => c.name !== 'Income' && c.name !== 'Uncategorized')
              .filter((c) => !budgets[c.name] || budgets[c.name] === 0)
              .map((c) => (
                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
              ))}
          </select>
        </div>
        <Input
          type="number"
          placeholder="Amount"
          value={newAmt}
          onChange={(e) => setNewAmt(e.target.value)}
          className="w-28"
        />
        <Button
          size="icon"
          onClick={handleAdd}
          disabled={!newCat || !newAmt}
          aria-label="Add budget"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function InstallPanel() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') {
        success('SupaSave installed');
        setDeferred(null);
      }
    } catch (err) {
      toastError((err as { message?: string })?.message || 'Install failed');
    }
  };

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isFirefox = /firefox/i.test(ua);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border-base p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install SupaSave</p>
            <p className="text-xs text-foreground-subtle mt-0.5">
              Install SupaSave as an app on your desktop or device. It runs in its own window, works offline, and launches like any other app.
            </p>
          </div>
        </div>

        <div className="mt-4">
          {installed ? (
            <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
              <Check className="h-4 w-4" />
              SupaSave is already installed on this device.
            </div>
          ) : deferred ? (
            <Button onClick={handleInstall}>
              <Download className="h-4 w-4" />
              Install to desktop
            </Button>
          ) : (
            <div className="space-y-2">
              <Button disabled>
                <Download className="h-4 w-4" />
                Install to desktop
              </Button>
              <p className="text-xs text-foreground-subtle">
                {isIOS || isSafari
                  ? 'On Safari: tap the Share button, then "Add to Home Screen" (mobile) or "Add to Dock" (macOS Sonoma+).'
                  : isFirefox
                  ? 'Firefox doesn’t support installing this site as an app. Try Chrome, Edge, or Brave.'
                  : 'Look for the install icon in your browser’s address bar, or open the browser menu and choose "Install SupaSave" / "Install app".'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface DangerPanelProps {
  onClear: () => void;
}

function DangerPanel({ onClear }: DangerPanelProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-900/30 bg-red-500/5 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Clear All Data</p>
        <p className="text-xs text-foreground-subtle mt-0.5">
          Permanently delete all transactions, accounts, and subscriptions
        </p>
      </div>
      <Button variant="destructive" size="sm" onClick={onClear}>
        <Trash2 className="h-3.5 w-3.5" />
        Clear
      </Button>
    </div>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────────

export function Settings() {
  const settings     = useFinanceStore((s) => s.settings);
  const budgets      = useFinanceStore((s) => s.budgets);
  const transactions = useFinanceStore((s) => s.transactions);
  const setSettings  = useFinanceStore((s) => s.setSettings);
  const setBudget    = useFinanceStore((s) => s.setBudget);
  const clearAll     = useFinanceStore((s) => s.clearAllLocalAndRemoteData);

  const [searchParams] = useSearchParams();
  const [section, setSection]       = useState<Section>(() => {
    const tab = searchParams.get('tab');
    return (SECTIONS.some((s) => s.id === tab) ? tab : 'appearance') as Section;
  });
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing]     = useState(false);
  const { success, error: toastError } = useToast();

  // Sync tab from URL changes (e.g. navigating from Dashboard "Set up budgets")
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && SECTIONS.some((s) => s.id === tab)) {
      setSection(tab as Section);
    }
  }, [searchParams]);

  const categoryTotals   = getCategoryTotals(transactions);
  const allCategories    = getAllCategories(settings.customCategories ?? []);

  const effectiveMode: 'light' | 'dark' =
    settings.theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : settings.theme ?? 'dark';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTheme      = (theme: 'light' | 'dark' | 'system') => setSettings({ theme });
  const handleVariant    = (v: ThemeVariant) => setSettings({ themeVariant: v });
  const handleColor      = (hex: string)     => setSettings({ primaryColor: hex });
  const handleResetColor = ()                => setSettings({ primaryColor: undefined });
  const handleCurrency   = (c: string)       => setSettings({ currency: c });
  const handleNotifs     = ()                => setSettings({ notifications: !settings.notifications });

  const handleAddBudget = (cat: string, amtStr: string) => {
    const amount = parseFloat(amtStr);
    if (isNaN(amount) || amount <= 0) return;
    setBudget(cat, amount);
    success(`Budget set for ${cat}`);
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAll();
      success('All data cleared');
      setConfirmClear(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  // ── Nav pill spring ───────────────────────────────────────────────────────
  const pillSpring = { type: 'spring' as const, stiffness: 400, damping: 32, mass: 0.8 };

  return (
    <div className="max-w-5xl mx-auto px-8 py-9">

      {/* ── Mobile: horizontal tab strip (above the flex row, full-width) ── */}
      <div className="lg:hidden mb-4">
        <div className="flex gap-1 rounded-lg border border-border-base bg-surface p-1 overflow-x-auto">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`relative px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                section === id ? 'text-accent-fg' : 'text-foreground-muted'
              }`}
            >
              {section === id && (
                <motion.div
                  layoutId="settings-mobile-tab"
                  className="absolute inset-0 rounded-md bg-accent"
                  transition={pillSpring}
                  style={{ borderRadius: 6 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-7">

        {/* ── Left sidebar nav ────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col gap-0.5 w-44 shrink-0 pt-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                  isActive
                    ? 'text-accent'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-nav-pill"
                    className="absolute inset-0 rounded-lg bg-accent/12 border border-accent/20"
                    transition={pillSpring}
                    style={{ borderRadius: 8 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </aside>

        {/* ── Right panel ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/*
            Pure opacity crossfade — no y-slide.
            The y-slide was causing the Card to resize mid-animation as the
            exiting panel temporarily occupied space while translating out,
            producing a visible height jank. Opacity-only is instant and clean.
          */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.15, ease: 'easeOut' } }}
              exit={{ opacity: 0, transition: { duration: 0.1, ease: 'easeIn' } }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    {SECTIONS.find((s) => s.id === section)?.label}
                  </CardTitle>
                </CardHeader>

                {section === 'appearance' && (
                  <AppearancePanel
                    theme={settings.theme ?? 'dark'}
                    themeVariant={(settings.themeVariant ?? 'default') as ThemeVariant}
                    primaryColor={settings.primaryColor}
                    currency={settings.currency}
                    effectiveMode={effectiveMode}
                    onTheme={handleTheme}
                    onVariant={handleVariant}
                    onColor={handleColor}
                    onResetColor={handleResetColor}
                    onCurrency={handleCurrency}
                  />
                )}

                {section === 'notifications' && (
                  <NotificationsPanel
                    enabled={settings.notifications ?? true}
                    onToggle={handleNotifs}
                  />
                )}

                {section === 'budgets' && (
                  <BudgetsPanel
                    budgets={budgets}
                    categoryTotals={categoryTotals}
                    currency={settings.currency}
                    allCategories={allCategories}
                    onRemove={(cat) => setBudget(cat, 0)}
                    onAdd={handleAddBudget}
                  />
                )}

                {section === 'categories' && (
                  <CategoryManager isOpen={true} onClose={() => {}} inline />
                )}

                {section === 'install' && <InstallPanel />}

                {section === 'danger' && (
                  <DangerPanel onClear={() => setConfirmClear(true)} />
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClearAll}
        title="Clear All Data"
        message="This will permanently delete ALL your transactions, accounts, subscriptions, and bank connections. This cannot be undone."
        confirmLabel="Yes, delete everything"
        loading={clearing}
      />
    </div>
  );
}
