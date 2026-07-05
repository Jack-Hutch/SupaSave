import { getSupabase } from '../lib/supabase';
import type {
  Transaction,
  FinanceAccount,
  Membership,
  Profile,
  BankConnection,
  UserSettings,
  WorkShift,
} from '../types';

// ============================================================
// PROFILE
// ============================================================

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  // maybeSingle: zero rows is a normal state, not a 406 error like .single()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Profile) ?? null;
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'updated_at'>>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function updateSettings(
  userId: string,
  settings: UserSettings
): Promise<void> {
  return upsertProfile(userId, { settings });
}

export async function updateBudget(
  userId: string,
  budget: Record<string, number>
): Promise<void> {
  return upsertProfile(userId, { budget_by_category: budget });
}

// ============================================================
// FINANCE ACCOUNTS
// ============================================================

export async function fetchAccounts(userId: string): Promise<FinanceAccount[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('finance_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('display_name');

  if (error) throw error;
  return (data || []) as unknown as FinanceAccount[];
}

export async function upsertAccounts(accounts: FinanceAccount[]): Promise<void> {
  if (accounts.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase.from('finance_accounts').upsert(
    accounts.map((a) => ({ ...a, updated_at: new Date().toISOString() }))
  );
  if (error) throw error;
}

export async function deleteAllAccounts(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('finance_accounts')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

// ============================================================
// TRANSACTIONS
// ============================================================

export async function fetchTransactions(
  userId: string,
  limit = 500
): Promise<Transaction[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as Transaction[];
}

export async function insertTransaction(
  tx: Omit<Transaction, 'id' | 'updated_at'> & { id?: string }
): Promise<Transaction> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('finance_transactions')
    .insert({ ...tx, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Transaction;
}

export async function updateTransaction(
  id: string,
  userId: string,
  updates: Partial<Transaction>
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('finance_transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteTransaction(
  id: string,
  userId: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function upsertTransactions(
  transactions: Transaction[]
): Promise<void> {
  if (transactions.length === 0) return;
  const supabase = getSupabase();
  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('finance_transactions').upsert(
      batch.map((tx) => ({ ...tx, updated_at: new Date().toISOString() }))
    );
    if (error) throw error;
  }
}

export async function deleteAllTransactions(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

// ============================================================
// MEMBERSHIPS
// ============================================================

export async function fetchMemberships(userId: string): Promise<Membership[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;
  return (data || []) as unknown as Membership[];
}

export async function insertMembership(
  membership: Omit<Membership, 'id' | 'updated_at'> & { id?: string }
): Promise<Membership> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('memberships')
    .insert({ ...membership, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Membership;
}

export async function updateMembership(
  id: string,
  userId: string,
  updates: Partial<Membership>
): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('memberships')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');

  if (error) throw error;
  // Supabase reports success even when the filter matched no rows — which
  // silently swallowed writes against stale/ghost membership ids. Surface it.
  if (!data || data.length === 0) {
    throw new Error('Subscription not found — refresh the page and try again');
  }
}

export async function deleteMembership(
  id: string,
  userId: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteAllMemberships(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

// ============================================================
// BANK CONNECTIONS
// ============================================================

export async function fetchBankConnection(
  userId: string
): Promise<BankConnection | null> {
  const supabase = getSupabase();
  // maybeSingle: zero rows is a normal state, not a 406 error like .single()
  const { data, error } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as BankConnection) ?? null;
}

export async function upsertBankConnection(
  connection: BankConnection
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('bank_connections').upsert({
    ...connection,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteBankConnection(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('bank_connections')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

// ============================================================
// WORK SHIFTS
// ============================================================

export async function fetchWorkShifts(userId: string): Promise<WorkShift[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('work_shifts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as WorkShift[];
}

export async function insertWorkShift(
  shift: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<WorkShift> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('work_shifts')
    .insert({ ...shift, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as WorkShift;
}

export async function updateWorkShift(
  id: string,
  updates: Partial<Omit<WorkShift, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('work_shifts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWorkShift(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('work_shifts').delete().eq('id', id);
  if (error) throw error;
}
