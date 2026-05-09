-- SupaSave: extend work_shifts with income-source metadata
-- Run after 002_work_shifts.sql

alter table public.work_shifts
  add column if not exists source_id     text,
  add column if not exists source_label  text,
  add column if not exists source_type   text,   -- 'main' | 'freelance' | 'sidejob' | 'other'
  add column if not exists pay_type      text,   -- 'hourly' | 'flat'
  add column if not exists flat_amount   numeric(10, 2);

create index if not exists work_shifts_user_source
  on public.work_shifts(user_id, source_id);
