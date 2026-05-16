-- SupaSave: shift lifecycle status
-- Run after 003_income_sources.sql

alter table public.work_shifts
  add column if not exists status text;  -- 'scheduled' | 'completed' | 'paid' (nullable, derived when null)

create index if not exists work_shifts_user_status
  on public.work_shifts(user_id, status);
