import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Transaction,
  FinanceAccount,
  Membership,
  BankConnection,
  UserSettings,
  TransactionFilters,
  MerchantStats,
  BankProvider,
  CategoryDef,
  ColorKey,
  WorkShift,
} from '../types';
import { getMerchantStats } from '../utils/analyticsUtils';
import { isSupabaseConfigured } from '../lib/supabase';
import { applyTheme as applyThemeConfig } from '../lib/theme';
import { BUILT_IN_CATEGORIES } from '../lib/categories';
import { readLocalShifts, writeLocalShifts } from '../lib/localShifts';
import { addShiftLink, removeShiftLink, getShiftLinkId } from '../utils/shiftUtils';
import * as financeService from '../services/financeService';
import { getProvider } from '../providers';
import { subMonths } from 'date-fns';

// Generate UUID without requiring uuid package if not installed
function generateId(): string {
  try {
    return uuidv4();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

interface CashFlowState {
  period: 'week' | 'month' | 'year';
  dateFrom: string;
  dateTo: string;
}

interface FinanceState {
  // Data
  accounts: FinanceAccount[];
  transactions: Transaction[];
  merchants: MerchantStats[];
  memberships: Membership[];
  bankConnection: BankConnection | null;
  budgets: Record<string, number>;
  settings: UserSettings;
  transactionFilters: TransactionFilters;
  cashFlowState: CashFlowState;
  workShifts: WorkShift[];

  // UI
  loading: boolean;
  syncing: boolean;
  error: string | null;
  userId: string | null;
}

interface FinanceActions {
  // Lifecycle
  hydrateFromDatabase(userId: string): Promise<void>;
  resetToGuest(): void;
  /** Ensure there's a userId in the store (real or guest). Returns the id. */
  ensureGuestUser(): string;

  // Data fetching
  fetchFinanceData(userId: string): Promise<void>;

  // Bank connection
  connectBank(provider: BankProvider, options?: Record<string, unknown>): Promise<void>;
  disconnectBank(): Promise<void>;
  syncBankTransactions(): Promise<void>;

  // Transactions
  addTransaction(tx: Omit<Transaction, 'id' | 'updated_at'>): Promise<void>;
  updateTransaction(id: string, updates: Partial<Transaction>, options?: { silent?: boolean }): Promise<void>;
  deleteTransaction(id: string): Promise<void>;

  // Memberships
  addMembership(m: Omit<Membership, 'id' | 'updated_at'>): Promise<string>;
  updateMembership(id: string, updates: Partial<Membership>): Promise<void>;
  deleteMembership(id: string): Promise<void>;

  // Settings
  setTheme(theme: 'light' | 'dark' | 'system'): void;
  setSettings(settings: Partial<UserSettings>): Promise<void>;
  setBudget(category: string, amount: number): Promise<void>;

  // Filters
  setFilter(filters: Partial<TransactionFilters>): void;
  setCashFlowState(state: Partial<CashFlowState>): void;

  // Custom categories
  addCustomCategory(cat: { name: string; icon: string; color: ColorKey; subcategories: string[] }): Promise<void>;
  updateCustomCategory(id: string, updates: { name?: string; icon?: string; color?: ColorKey; subcategories?: string[] }): Promise<void>;
  deleteCustomCategory(id: string): Promise<void>;
  /** Edit a built-in category — stores the change as a custom override under the same id */
  upsertCategoryOverride(id: string, data: { name: string; icon: string; color: ColorKey; subcategories: string[] }): Promise<void>;
  /** Delete a custom category, or hide a built-in. Restorable via restoreCategory. */
  deleteCategory(id: string): Promise<void>;
  /** Restore a hidden built-in by removing the override entirely. */
  restoreCategory(id: string): Promise<void>;
  /** Delete/hide many at once. */
  bulkDeleteCategories(ids: string[]): Promise<void>;

  // Work shifts
  addWorkShift(shift: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
  updateWorkShift(id: string, updates: Partial<Omit<WorkShift, 'id' | 'user_id' | 'created_at'>>): Promise<void>;
  deleteWorkShift(id: string): Promise<void>;
  markShiftPaid(id: string, transactionId?: string): Promise<void>;
  /** Reverse markShiftPaid: clears shift's paid state AND removes link tag from any linked tx */
  unmarkShiftPaid(id: string): Promise<void>;
  /** Link a transaction to a shift (mark shift paid, tag transaction). */
  linkTransactionToShift(transactionId: string, shiftId: string): Promise<void>;

  // Nuclear option
  clearAllLocalAndRemoteData(): Promise<void>;

  // Errors
  setError(error: string | null): void;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  themeVariant: 'default',
  primaryColor: undefined,
  currency: 'AUD',
  notifications: true,
};

const defaultFilters: TransactionFilters = {
  search: '',
  category: '',
  dateFrom: '',
  dateTo: '',
  source: '',
};

const defaultCashFlowState: CashFlowState = {
  period: 'month',
  dateFrom: subMonths(new Date(), 1).toISOString().split('T')[0],
  dateTo: new Date().toISOString().split('T')[0],
};

export const useFinanceStore = create<FinanceState & FinanceActions>((set, get) => ({
  // Initial state
  accounts: [],
  transactions: [],
  merchants: [],
  memberships: [],
  bankConnection: null,
  budgets: {},
  settings: defaultSettings,
  transactionFilters: defaultFilters,
  cashFlowState: defaultCashFlowState,
  workShifts: [],
  loading: false,
  syncing: false,
  error: null,
  userId: null,

  setError: (error) => set({ error }),

  hydrateFromDatabase: async (userId: string) => {
    // ── Idempotency guard ───────────────────────────────────────────
    // useAuth() is called from multiple components (Header, ProtectedRoute,
    // Transactions, Dashboard, Subscriptions …). Each call site runs its own
    // useEffect that invokes getSession().then(hydrateFromDatabase). Without
    // this guard, every component mount triggers a full DB re-fetch that
    // overwrites in-memory state — including transactions freshly written by
    // syncBankTransactions — with whatever Supabase currently holds (which may
    // be empty if a background persist hasn't completed yet).
    //
    // Once we've loaded data for a given userId, skip all subsequent calls.
    // Data mutations go through store actions (addTransaction, updateTransaction
    // etc.) which update memory directly. The only legitimate reasons to
    // re-hydrate are: first sign-in and post-signout re-sign-in, both of
    // which reset userId to null via resetToGuest() first.
    const { userId: currentUserId, loading } = get();
    if (currentUserId === userId || loading) return;

    set({ loading: true, error: null, userId });
    try {
      if (!isSupabaseConfigured) {
        // No Supabase: just set userId and use empty state
        set({ loading: false });
        return;
      }
      await get().fetchFinanceData(userId);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'Failed to load data';
      set({ error: message, loading: false });
    }
  },

  ensureGuestUser: () => {
    const { userId } = get();
    if (userId) return userId;

    const STORAGE_KEY = 'supasave.guest_user_id';
    let id: string | null = null;
    try {
      id = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    } catch { /* storage disabled */ }
    if (!id) {
      id = `guest-${generateId()}`;
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, id);
      } catch { /* silent */ }
    }

    // Hydrate any locally-stored shifts, transactions, and settings for this
    // guest so the page comes back populated after refresh.
    let workShifts: WorkShift[] = [];
    let transactions: Transaction[] = [];
    let settings = get().settings;
    try { workShifts = readLocalShifts(id); } catch { /* silent */ }
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(`supasave.transactions.${id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) transactions = parsed as Transaction[];
        }
      }
    } catch { /* silent */ }
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(`supasave.settings.${id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') settings = { ...settings, ...parsed };
        }
      }
    } catch { /* silent */ }

    set({ userId: id, workShifts, transactions, settings, merchants: getMerchantStats(transactions) });
    return id;
  },

  resetToGuest: () => {
    set({
      accounts: [],
      transactions: [],
      merchants: [],
      memberships: [],
      bankConnection: null,
      budgets: {},
      settings: defaultSettings,
      transactionFilters: defaultFilters,
      cashFlowState: defaultCashFlowState,
      workShifts: [],
      loading: false,
      syncing: false,
      error: null,
      userId: null,
    });
  },

  fetchFinanceData: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const [profile, accounts, transactions, memberships, bankConnection, workShifts] =
        await Promise.all([
          financeService.fetchProfile(userId),
          financeService.fetchAccounts(userId),
          financeService.fetchTransactions(userId),
          financeService.fetchMemberships(userId),
          financeService.fetchBankConnection(userId),
          // work_shifts table may not exist yet (migration 002 not run) —
          // fall back to localStorage so the Income page still works.
          financeService.fetchWorkShifts(userId).catch((err) => {
            if (financeService.isMissingTableError(err)) {
              console.warn('[work_shifts] table missing — loading from localStorage');
              return readLocalShifts(userId);
            }
            throw err;
          }),
        ]);

      const merchants = getMerchantStats(transactions);

      // If no profile exists yet (user pre-dates the migration or signup trigger
      // didn't fire), upsert one now so subsequent settings saves work correctly.
      if (!profile) {
        financeService.upsertProfile(userId, {
          settings: defaultSettings,
          budget_by_category: {},
          ui_state: {},
        }).catch((e) => console.warn('Could not upsert default profile:', e));
      }

      // Restore Up Bank token from the persisted payload so the user doesn't
      // have to re-enter it after a page refresh.
      if (bankConnection?.provider === 'up' && bankConnection.payload?.upToken) {
        const { setUpToken } = await import('../lib/upTokenSession');
        try {
          setUpToken(bankConnection.payload.upToken as string);
        } catch {
          // Invalid stored token — silently ignore; user will be prompted to reconnect
        }
      }

      set({
        accounts,
        transactions,
        merchants,
        memberships,
        bankConnection,
        workShifts,
        budgets: profile?.budget_by_category ?? {},
        settings: profile?.settings ? { ...defaultSettings, ...profile.settings } : defaultSettings,
        loading: false,
      });

      // Apply theme from profile
      if (profile?.settings) {
        applyTheme({ ...defaultSettings, ...profile.settings });
      }
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'Failed to load data';
      set({ error: message, loading: false });
      throw err;
    }
  },

  connectBank: async (provider: BankProvider, options?: Record<string, unknown>) => {
    const { userId } = get();
    if (!userId) throw new Error('Not authenticated');

    set({ syncing: true, error: null });
    try {
      const providerInstance = getProvider(provider, userId);
      const connection = await providerInstance.connect(options);
      connection.user_id = userId;

      const accounts = await providerInstance.getAccounts(connection.connection_id);
      const accountsWithUser = accounts.map((a) => ({ ...a, user_id: userId }));

      // Optimistic update — do this before persist so UI feels instant
      set({ bankConnection: connection, accounts: accountsWithUser, syncing: false });

      // Persist in the background; a DB hiccup shouldn't fail the connection
      if (isSupabaseConfigured) {
        Promise.all([
          financeService.upsertBankConnection(connection),
          financeService.upsertAccounts(accountsWithUser),
        ]).catch((err) => {
          console.warn('connectBank: background persist failed', err);
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect bank';
      set({ error: message, syncing: false });
      throw err;
    }
  },

  disconnectBank: async () => {
    const { userId, bankConnection } = get();
    if (!userId) return;

    set({ syncing: true, error: null });
    try {
      if (bankConnection) {
        const provider = getProvider(bankConnection.provider, userId);
        await provider.disconnect(bankConnection.connection_id);
      }

      set({ bankConnection: null, accounts: [] });

      if (isSupabaseConfigured) {
        await Promise.all([
          financeService.deleteBankConnection(userId),
          financeService.deleteAllAccounts(userId),
        ]);
      }

      set({ syncing: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      set({ error: message, syncing: false });
      throw err;
    }
  },

  syncBankTransactions: async () => {
    const { userId, bankConnection, accounts } = get();
    if (!userId || !bankConnection) throw new Error('No bank connection');

    set({ syncing: true, error: null });
    try {
      const provider = getProvider(bankConnection.provider, userId);
      const to = new Date();
      const from = subMonths(to, 3);

      const allTransactions: Transaction[] = [];
      for (const accountId of bankConnection.account_ids) {
        const txs = await provider.getTransactions(
          bankConnection.connection_id,
          accountId,
          from,
          to
        );
        allTransactions.push(...txs.map((tx) => ({ ...tx, user_id: userId })));
      }

      // Update balances
      const updatedAccounts = await Promise.all(
        accounts.map(async (acc) => {
          try {
            const balance = await provider.getBalance(
              bankConnection.connection_id,
              acc.external_id || acc.id
            );
            return { ...acc, balance, user_id: userId };
          } catch {
            return acc;
          }
        })
      );

      const merchants = getMerchantStats(allTransactions);
      const updatedConnection: BankConnection = {
        ...bankConnection,
        last_sync_at: new Date().toISOString(),
        status: 'connected',
      };

      // Optimistic update first — UI feels instant, spinner disappears immediately.
      set({
        transactions: allTransactions,
        merchants,
        accounts: updatedAccounts,
        bankConnection: updatedConnection,
        syncing: false,
      });

      // Await the persist before resolving.
      //
      // Previously this was fire-and-forget. The problem: if Supabase's
      // onAuthStateChange fires a TOKEN_REFRESHED or INITIAL_SESSION event
      // while the DB write is still in-flight, hydrateFromDatabase reads 0 rows
      // from Supabase and overwrites the 49 freshly-synced transactions with [].
      // Awaiting here means the function's returned Promise doesn't resolve until
      // the DB is consistent, so any subsequent re-hydration finds real data.
      // Errors are still swallowed — a DB hiccup won't surface as a sync failure.
      if (isSupabaseConfigured) {
        try {
          await Promise.all([
            financeService.upsertTransactions(allTransactions),
            financeService.upsertAccounts(updatedAccounts),
            financeService.upsertBankConnection(updatedConnection),
          ]);
        } catch (err) {
          console.warn('syncBankTransactions: persist failed (in-memory state kept)', err);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      set({ error: message, syncing: false });
      throw err;
    }
  },

  addTransaction: async (txData) => {
    const { userId, transactions } = get();
    if (!userId) throw new Error('Not authenticated');
    const isGuest = userId.startsWith('guest-');

    const newTx: Transaction = {
      ...txData,
      id: generateId(),
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    const updated = [newTx, ...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    set({ transactions: updated, merchants: getMerchantStats(updated) });

    // Guest users: persist to localStorage instead of Supabase (no real auth row)
    if (isGuest) {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`supasave.transactions.${userId}`, JSON.stringify(updated));
        }
      } catch { /* silent */ }
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const saved = await financeService.insertTransaction({
          ...txData,
          user_id: userId,
        });
        // Replace optimistic with server version
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === newTx.id ? saved : tx
          ),
        }));
      } catch (err) {
        // Rollback
        set({ transactions });
        throw err;
      }
    }
  },

  updateTransaction: async (id, updates, { silent = false } = {}) => {
    const { userId, transactions } = get();
    if (!userId) throw new Error('Not authenticated');
    const isGuest = userId.startsWith('guest-');

    const prev = transactions.find((tx) => tx.id === id);
    if (!prev) return;

    // Optimistic update
    const updated = transactions.map((tx) =>
      tx.id === id ? { ...tx, ...updates, updated_at: new Date().toISOString() } : tx
    );
    set({ transactions: updated, merchants: getMerchantStats(updated) });

    if (isGuest) {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`supasave.transactions.${userId}`, JSON.stringify(updated));
        }
      } catch { /* silent */ }
      return;
    }

    if (isSupabaseConfigured) {
      try {
        await financeService.updateTransaction(id, userId, updates);
      } catch (err) {
        if (!silent) {
          // Rollback optimistic update and re-throw so the caller can toast
          set({ transactions });
          throw err;
        }
        // silent=true: keep the optimistic update even if Supabase failed
        console.warn('[updateTransaction] Supabase sync failed (kept local change):', err);
      }
    }
  },

  deleteTransaction: async (id) => {
    const { userId, transactions } = get();
    if (!userId) throw new Error('Not authenticated');

    const updated = transactions.filter((tx) => tx.id !== id);
    set({ transactions: updated, merchants: getMerchantStats(updated) });

    if (isSupabaseConfigured) {
      try {
        await financeService.deleteTransaction(id, userId);
      } catch (err) {
        set({ transactions });
        throw err;
      }
    }
  },

  addMembership: async (mData) => {
    const { userId, memberships } = get();
    if (!userId) throw new Error('Not authenticated');

    const newM: Membership = {
      ...mData,
      id: generateId(),
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    set({ memberships: [...memberships, newM] });

    if (isSupabaseConfigured) {
      try {
        const saved = await financeService.insertMembership({ ...mData, user_id: userId });
        set((state) => ({
          memberships: state.memberships.map((m) => (m.id === newM.id ? saved : m)),
        }));
        return saved.id;
      } catch (err) {
        set({ memberships });
        throw err;
      }
    }

    return newM.id;
  },

  updateMembership: async (id, updates) => {
    const { userId, memberships } = get();
    if (!userId) throw new Error('Not authenticated');

    const updated = memberships.map((m) =>
      m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
    );
    set({ memberships: updated });

    if (isSupabaseConfigured) {
      try {
        await financeService.updateMembership(id, userId, updates);
      } catch (err) {
        set({ memberships });
        throw err;
      }
    }
  },

  deleteMembership: async (id) => {
    const { userId, memberships } = get();
    if (!userId) throw new Error('Not authenticated');

    const updated = memberships.filter((m) => m.id !== id);
    set({ memberships: updated });

    if (isSupabaseConfigured) {
      try {
        await financeService.deleteMembership(id, userId);
      } catch (err) {
        set({ memberships });
        throw err;
      }
    }
  },

  setTheme: (theme) => {
    const newSettings = { ...get().settings, theme };
    set({ settings: newSettings });
    applyTheme(newSettings);
  },

  setSettings: async (updates) => {
    const { userId } = get();
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });

    applyTheme(newSettings);

    const isGuest = userId?.startsWith('guest-');
    if (isGuest && userId) {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`supasave.settings.${userId}`, JSON.stringify(newSettings));
        }
      } catch { /* silent */ }
      return;
    }

    if (isSupabaseConfigured && userId) {
      try {
        await financeService.updateSettings(userId, newSettings);
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
  },

  setBudget: async (category, amount) => {
    const { userId } = get();
    const newBudgets = { ...get().budgets, [category]: amount };
    set({ budgets: newBudgets });

    if (isSupabaseConfigured && userId) {
      try {
        await financeService.updateBudget(userId, newBudgets);
      } catch (err) {
        console.error('Failed to save budget:', err);
      }
    }
  },

  addCustomCategory: async (cat) => {
    const { settings } = get();
    const customCategories = settings.customCategories ?? [];
    const newCat: CategoryDef = {
      ...cat,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      isBuiltIn: false,
    };
    await get().setSettings({ customCategories: [...customCategories, newCat] });
  },

  updateCustomCategory: async (id, updates) => {
    const { settings } = get();
    const customCategories = (settings.customCategories ?? []).map((c) =>
      c.id === id ? { ...c, ...updates } : c,
    );
    await get().setSettings({ customCategories });
  },

  deleteCustomCategory: async (id) => {
    const { settings } = get();
    const customCategories = (settings.customCategories ?? []).filter((c) => c.id !== id);
    await get().setSettings({ customCategories });
  },

  deleteCategory: async (id) => {
    const { settings } = get();
    const list = settings.customCategories ?? [];
    const isBuiltIn = BUILT_IN_CATEGORIES.some((b) => b.id === id);
    if (isBuiltIn) {
      // Hide it via override
      const existing = list.find((c) => c.id === id);
      const builtIn = BUILT_IN_CATEGORIES.find((b) => b.id === id)!;
      const next: CategoryDef = existing
        ? { ...existing, hidden: true }
        : { ...builtIn, hidden: true };
      const customCategories = existing
        ? list.map((c) => (c.id === id ? next : c))
        : [...list, next];
      await get().setSettings({ customCategories });
    } else {
      await get().setSettings({ customCategories: list.filter((c) => c.id !== id) });
    }
  },

  restoreCategory: async (id) => {
    const { settings } = get();
    const list = settings.customCategories ?? [];
    await get().setSettings({ customCategories: list.filter((c) => c.id !== id) });
  },

  bulkDeleteCategories: async (ids) => {
    const { settings } = get();
    const list = settings.customCategories ?? [];
    const idSet = new Set(ids);
    const builtInIds = new Set(BUILT_IN_CATEGORIES.map((b) => b.id));

    // Remove non-built-in customs entirely; for built-ins, upsert hidden=true
    let next = list.filter((c) => !(idSet.has(c.id) && !builtInIds.has(c.id)));
    for (const id of ids) {
      if (!builtInIds.has(id)) continue;
      const existing = next.find((c) => c.id === id);
      const builtIn = BUILT_IN_CATEGORIES.find((b) => b.id === id)!;
      const hiddenRow: CategoryDef = existing ? { ...existing, hidden: true } : { ...builtIn, hidden: true };
      next = existing ? next.map((c) => (c.id === id ? hiddenRow : c)) : [...next, hiddenRow];
    }
    await get().setSettings({ customCategories: next });
  },

  upsertCategoryOverride: async (id, data) => {
    const { settings } = get();
    const list = settings.customCategories ?? [];
    const existing = list.find((c) => c.id === id);
    const next: CategoryDef = {
      id,
      name: data.name,
      icon: data.icon,
      color: data.color,
      subcategories: data.subcategories,
      isBuiltIn: existing?.isBuiltIn ?? true, // preserve flag on built-in overrides
    };
    const customCategories = existing
      ? list.map((c) => (c.id === id ? next : c))
      : [...list, next];
    await get().setSettings({ customCategories });
  },

  setFilter: (filters) => {
    set((state) => ({
      transactionFilters: { ...state.transactionFilters, ...filters },
    }));
  },

  setCashFlowState: (updates) => {
    set((state) => ({
      cashFlowState: { ...state.cashFlowState, ...updates },
    }));
  },

  addWorkShift: async (shiftData) => {
    const { userId, workShifts } = get();
    if (!userId) throw new Error('Not authenticated');
    const isGuest = userId.startsWith('guest-');

    const now = new Date().toISOString();
    const optimistic: WorkShift = {
      ...shiftData,
      id: generateId(),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };

    const nextLocal = [optimistic, ...workShifts].sort((a, b) => b.date.localeCompare(a.date));
    set({ workShifts: nextLocal });

    if (isGuest) {
      writeLocalShifts(userId, nextLocal);
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const saved = await financeService.insertWorkShift({ ...shiftData, user_id: userId });
        // Merge: keep optimistic fields the DB didn't return (e.g. when migrations
        // 003/004 haven't been applied, status/source_* columns are missing).
        set((state) => ({
          workShifts: state.workShifts.map((s) => (s.id === optimistic.id ? { ...optimistic, ...saved } : s)),
        }));
      } catch (err) {
        // If the table itself is missing (migrations not run) fall back to
        // localStorage so the page keeps working — the user just doesn't get
        // cross-device sync until they apply the SQL migrations.
        if (financeService.isMissingTableError(err)) {
          console.warn('[work_shifts] table missing — using localStorage fallback');
          writeLocalShifts(userId, nextLocal);
          return;
        }
        set({ workShifts });
        throw err;
      }
    } else {
      writeLocalShifts(userId, nextLocal);
    }
  },

  updateWorkShift: async (id, updates) => {
    const { userId, workShifts } = get();
    const isGuest = userId?.startsWith('guest-');

    const updated = workShifts.map((s) =>
      s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
    );
    set({ workShifts: updated });

    if (isGuest && userId) {
      writeLocalShifts(userId, updated);
      return;
    }

    if (isSupabaseConfigured) {
      try {
        await financeService.updateWorkShift(id, updates);
      } catch (err) {
        if (financeService.isMissingTableError(err)) {
          if (userId) writeLocalShifts(userId, updated);
          return;
        }
        set({ workShifts });
        throw err;
      }
    } else if (userId) {
      writeLocalShifts(userId, updated);
    }
  },

  deleteWorkShift: async (id) => {
    const { userId, workShifts } = get();
    const isGuest = userId?.startsWith('guest-');
    const next = workShifts.filter((s) => s.id !== id);
    set({ workShifts: next });

    if (isGuest && userId) {
      writeLocalShifts(userId, next);
      return;
    }

    if (isSupabaseConfigured) {
      try {
        await financeService.deleteWorkShift(id);
      } catch (err) {
        if (financeService.isMissingTableError(err)) {
          if (userId) writeLocalShifts(userId, next);
          return;
        }
        set({ workShifts });
        throw err;
      }
    } else if (userId) {
      writeLocalShifts(userId, next);
    }
  },

  unmarkShiftPaid: async (id) => {
    const { workShifts, transactions } = get();
    const shift = workShifts.find((s) => s.id === id);
    if (!shift) return;

    const linkedTxId = shift.paid_transaction_id;

    await get().updateWorkShift(id, {
      is_paid: false,
      paid_transaction_id: undefined,
      paid_at: undefined,
      status: undefined,
    });

    // Strip the shift-link tag from the transaction (don't change its
    // category — the user may have intentionally categorized it as Income).
    if (linkedTxId) {
      const tx = transactions.find((t) => t.id === linkedTxId);
      if (tx && getShiftLinkId(tx.tags) === id) {
        await get().updateTransaction(linkedTxId, { tags: removeShiftLink(tx.tags) }, { silent: true });
      }
    }
  },

  linkTransactionToShift: async (transactionId, shiftId) => {
    // This is the reverse-direction entry point: from a transaction, link to
    // an unpaid completed shift. Internally identical to markShiftPaid.
    await get().markShiftPaid(shiftId, transactionId);
  },

  markShiftPaid: async (id, transactionId) => {
    const now = new Date().toISOString();
    const { transactions, workShifts } = get();

    // Update the shift first
    await get().updateWorkShift(id, {
      is_paid: true,
      paid_transaction_id: transactionId,
      paid_at: now,
      status: 'paid',
    });

    // If a transaction was linked, also update IT: tag it back to the shift
    // and ensure it's marked as income with the right category. The category
    // defaults to "Income"; if the shift's source has its own name we keep
    // that as the category override (e.g. "Cafe") so reports group it nicely.
    if (transactionId) {
      const tx = transactions.find((t) => t.id === transactionId);
      const shift = workShifts.find((s) => s.id === id);
      if (tx) {
        // Best-effort: tag the txn so we can show the back-reference badge.
        // The category becomes "Income" so it shows up in income totals.
        const newTags = addShiftLink(tx.tags, id);
        const updates: Partial<typeof tx> = {
          tags: newTags,
          is_income: true,
          category: 'Income',
        };
        // Use silent: true so a Supabase column issue doesn't roll the txn back.
        // The shift-side update already succeeded.
        void shift;
        await get().updateTransaction(transactionId, updates, { silent: true });
      }
    }
  },

  clearAllLocalAndRemoteData: async () => {
    const { userId } = get();

    // Reset local state immediately
    get().resetToGuest();

    if (isSupabaseConfigured && userId) {
      try {
        await Promise.all([
          financeService.deleteAllTransactions(userId),
          financeService.deleteAllAccounts(userId),
          financeService.deleteAllMemberships(userId),
          financeService.deleteBankConnection(userId),
        ]);
      } catch (err) {
        console.error('Failed to clear remote data:', err);
        throw err;
      }
    }
  },
}));

function applyTheme(settings: UserSettings): void {
  applyThemeConfig({
    mode: settings.theme,
    variant: settings.themeVariant ?? 'default',
    primaryColor: settings.primaryColor,
  });
}
