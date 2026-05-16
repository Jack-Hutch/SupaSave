-- SupaSave: Work Shifts
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql

create table if not exists public.work_shifts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  hourly_rate      numeric(10, 2) not null default 25.00,
  hours_worked     numeric(5, 2) not null,  -- stored, calculated on insert
  pay_owed         numeric(10, 2) not null, -- hours_worked * hourly_rate
  notes            text,
  is_paid          boolean not null default false,
  paid_transaction_id text,                 -- optional link to transactions.id
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.work_shifts enable row level security;

create policy "shifts_select_own" on public.work_shifts
  for select using (auth.uid() = user_id);

create policy "shifts_insert_own" on public.work_shifts
  for insert with check (auth.uid() = user_id);

create policy "shifts_update_own" on public.work_shifts
  for update using (auth.uid() = user_id);

create policy "shifts_delete_own" on public.work_shifts
  for delete using (auth.uid() = user_id);

create index if not exists work_shifts_user_date
  on public.work_shifts(user_id, date desc);
