-- SupaSave Initial Schema
-- Run this in your Supabase SQL Editor

-- uuid-ossp not needed — use gen_random_uuid() (native since Postgres 13)

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{"theme":"system","currency":"AUD","notifications":true}'::jsonb,
  budget_by_category jsonb not null default '{}'::jsonb,
  ui_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- ============================================================
-- FINANCE ACCOUNTS
-- ============================================================
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null default '',
  display_name text not null default '',
  balance numeric(18, 2) not null default 0,
  currency text not null default 'AUD',
  updated_at timestamptz not null default now()
);

alter table public.finance_accounts enable row level security;

create policy "finance_accounts_select_own" on public.finance_accounts
  for select using (auth.uid() = user_id);

create policy "finance_accounts_insert_own" on public.finance_accounts
  for insert with check (auth.uid() = user_id);

create policy "finance_accounts_update_own" on public.finance_accounts
  for update using (auth.uid() = user_id);

create policy "finance_accounts_delete_own" on public.finance_accounts
  for delete using (auth.uid() = user_id);

create index if not exists idx_finance_accounts_user_id on public.finance_accounts(user_id);

-- ============================================================
-- FINANCE TRANSACTIONS
-- ============================================================
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(18, 2) not null default 0,
  description text not null default '',
  category text not null default 'Uncategorized',
  date date not null default current_date,
  created_at_tx timestamptz,
  time_str text,
  notes text,
  is_income boolean not null default false,
  direction text not null default 'DEBIT',
  merchant_name text,
  merchant_logo text,
  is_round_up boolean not null default false,
  raw_text text,
  bank_ref text,
  tags text[],
  source text not null default 'manual',
  updated_at timestamptz not null default now()
);

alter table public.finance_transactions enable row level security;

create policy "finance_transactions_select_own" on public.finance_transactions
  for select using (auth.uid() = user_id);

create policy "finance_transactions_insert_own" on public.finance_transactions
  for insert with check (auth.uid() = user_id);

create policy "finance_transactions_update_own" on public.finance_transactions
  for update using (auth.uid() = user_id);

create policy "finance_transactions_delete_own" on public.finance_transactions
  for delete using (auth.uid() = user_id);

create index if not exists idx_finance_transactions_user_id on public.finance_transactions(user_id);
create index if not exists idx_finance_transactions_date on public.finance_transactions(date desc);
create index if not exists idx_finance_transactions_category on public.finance_transactions(category);
create index if not exists idx_finance_transactions_user_date on public.finance_transactions(user_id, date desc);

-- ============================================================
-- MEMBERSHIPS (Subscriptions)
-- ============================================================
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  icon text not null default '📦',
  cost numeric(18, 2) not null default 0,
  billing_cycle text not null default 'monthly' check (billing_cycle in ('weekly', 'monthly', 'yearly')),
  start_date date not null default current_date,
  next_billing_date date not null default current_date,
  cancel_reminder boolean not null default false,
  notes text,
  category text not null default 'Entertainment',
  updated_at timestamptz not null default now()
);

alter table public.memberships enable row level security;

create policy "memberships_select_own" on public.memberships
  for select using (auth.uid() = user_id);

create policy "memberships_insert_own" on public.memberships
  for insert with check (auth.uid() = user_id);

create policy "memberships_update_own" on public.memberships
  for update using (auth.uid() = user_id);

create policy "memberships_delete_own" on public.memberships
  for delete using (auth.uid() = user_id);

create index if not exists idx_memberships_user_id on public.memberships(user_id);
create index if not exists idx_memberships_next_billing on public.memberships(next_billing_date);

-- ============================================================
-- BANK CONNECTIONS
-- ============================================================
create table if not exists public.bank_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'mock',
  connection_id text not null default '',
  account_ids text[] not null default '{}',
  last_sync_at timestamptz,
  status text not null default 'disconnected',
  error_message text,
  payload jsonb,
  updated_at timestamptz not null default now()
);

alter table public.bank_connections enable row level security;

create policy "bank_connections_select_own" on public.bank_connections
  for select using (auth.uid() = user_id);

create policy "bank_connections_insert_own" on public.bank_connections
  for insert with check (auth.uid() = user_id);

create policy "bank_connections_update_own" on public.bank_connections
  for update using (auth.uid() = user_id);

create policy "bank_connections_delete_own" on public.bank_connections
  for delete using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, settings, budget_by_category, ui_state)
  values (
    new.id,
    '{"theme":"system","currency":"AUD","notifications":true}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop trigger if exists before recreating
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_finance_accounts_updated_at before update on public.finance_accounts
  for each row execute procedure public.update_updated_at_column();

create trigger update_finance_transactions_updated_at before update on public.finance_transactions
  for each row execute procedure public.update_updated_at_column();

create trigger update_memberships_updated_at before update on public.memberships
  for each row execute procedure public.update_updated_at_column();

create trigger update_bank_connections_updated_at before update on public.bank_connections
  for each row execute procedure public.update_updated_at_column();
