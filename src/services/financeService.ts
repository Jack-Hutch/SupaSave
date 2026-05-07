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
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as unknown as Profile;
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
  tx: Omit<Transaction, 'id' | 'updated_at'>
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
  membership: Omit<Membership, 'id' | 'updated_at'>
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
  const { error } = await supabase
    .from('memberships')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
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
  const { data, error } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as unknown as BankConnection;
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

// Columns added by migrations 003/004. If those migrations haven't been run
// yet on a user's Supabase project, the insert/update will fail with "column
// does not exist". We retry without those fields so basic shift saving still
// works — the user just doesn't get the extra features until they run the SQL.
const OPTIONAL_SHIFT_COLS = [
  'source_id', 'source_label', 'source_type',
  'pay_type', 'flat_amount', 'status',
] as const;

function stripOptional<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out = { ...obj };
  for (const k of OPTIONAL_SHIFT_COLS) delete (out as Record<string, unknown>)[k];
  return out;
}

export function isMissingTableError(err: unknown): boolean {
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const msg = `${e?.message ?? ''} ${e?.details ?? ''} ${e?.hint ?? ''}`.toLowerCase();
  const code = e?.code ?? '';
  if (['42P01', 'PGRST205', 'PGRST302'].includes(code)) return true;
  return (
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (msg.includes('table') && msg.includes('not')) ||
    (msg.includes('schema cache') && msg.includes('table'))
  );
}

function isMissingColumnError(err: unknown): boolean {
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const msg     = e?.message ?? '';
  const details = e?.details ?? '';
  const hint    = e?.hint ?? '';
  const code    = e?.code ?? '';
  const haystack = `${msg} ${details} ${hint}`.toLowerCase();

  // Postgres "undefined column": 42703
  // PostgREST schema cache miss: PGRST204 (also known as PGRST116/PGRST301 in some versions)
  if (['42703', 'PGRST204', 'PGRST301', 'PGRST116'].includes(code)) return true;
  return (
    haystack.includes('column') && (
      haystack.includes('does not exist') ||
      haystack.includes('not found') ||
      haystack.includes('schema cache')
    )
  );
}

export async function insertWorkShift(
  shift: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkShift> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const payload = { ...shift, created_at: now, updated_at: now };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  let { data, error } = await sb.from('work_shifts').insert(payload).select().single();

  if (error && isMissingColumnError(error)) {
    console.warn('[work_shifts] migration 003/004 not applied — retrying without optional columns');
    ({ data, error } = await sb.from('work_shifts').insert(stripOptional(payload)).select().single());
  }

  if (error) throw error;
  return data as unknown as WorkShift;
}

export async function updateWorkShift(
  id: string,
  updates: Partial<Omit<WorkShift, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const supabase = getSupabase();
  const payload = { ...updates, updated_at: new Date().toISOString() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  let { error } = await sb.from('work_shifts').update(payload).eq('id', id);

  if (error && isMissingColumnError(error)) {
    console.warn('[work_shifts] migration 003/004 not applied — retrying without optional columns');
    ({ error } = await sb.from('work_shifts').update(stripOptional(payload)).eq('id', id));
  }

  if (error) throw error;
}

export async function deleteWorkShift(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('work_shifts').delete().eq('id', id);
  if (error) throw error;
}
