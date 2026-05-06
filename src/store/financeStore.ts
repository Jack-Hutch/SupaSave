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
} from '../types';
import { getMerchantStats } from '../utils/analyticsUtils';
import { isSupabaseConfigured } from '../lib/supabase';
import { applyTheme as applyThemeConfig } from '../lib/theme';
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
      loading: false,
      syncing: false,
      error: null,
      userId: null,
    });
  },

  fetchFinanceData: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const [profile, accounts, transactions, memberships, bankConnection] =
        await Promise.all([
          financeService.fetchProfile(userId),
          financeService.fetchAccounts(userId),
          financeService.fetchTransactions(userId),
          financeService.fetchMemberships(userId),
          financeService.fetchBankConnection(userId),
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

    const prev = transactions.find((tx) => tx.id === id);
    if (!prev) return;

    // Optimistic update
    const updated = transactions.map((tx) =>
      tx.id === id ? { ...tx, ...updates, updated_at: new Date().toISOString() } : tx
    );
    set({ transactions: updated, merchants: getMerchantStats(updated) });

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
