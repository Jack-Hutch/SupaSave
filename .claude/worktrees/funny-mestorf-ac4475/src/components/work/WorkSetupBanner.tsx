import React, { useState } from 'react';
import { AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';

const MIGRATION_SQL = `-- SupaSave: Work Shifts
create table if not exists public.work_shifts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  hourly_rate      numeric(10, 2) not null default 25.00,
  hours_worked     numeric(5, 2) not null,
  pay_owed         numeric(10, 2) not null,
  notes            text,
  is_paid          boolean not null default false,
  paid_transaction_id text,
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
`;

export function WorkSetupBanner(): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(MIGRATION_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const projectRef = (() => {
    try {
      const u = new URL(supabaseUrl);
      return u.hostname.split('.')[0];
    } catch {
      return '';
    }
  })();
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : 'https://supabase.com/dashboard';

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-200">
            Work Shifts table not found in Supabase
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            The <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-[11px]">work_shifts</code> table doesn't exist yet. Run the migration below in your Supabase SQL editor — takes 5 seconds.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy migration SQL'}
        </button>
        <a
          href={sqlEditorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 transition-colors"
        >
          Open Supabase SQL editor
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <details className="text-xs text-amber-200/70">
        <summary className="cursor-pointer hover:text-amber-200">View SQL</summary>
        <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-black/30 p-3 text-[11px] text-foreground-muted whitespace-pre-wrap font-mono">
          {MIGRATION_SQL}
        </pre>
      </details>
    </div>
  );
}

/**
 * Detects whether a Supabase error means the work_shifts table doesn't exist.
 * Postgres code 42P01 = undefined_table; PostgREST may return PGRST205 when
 * the schema cache doesn't know about the table.
 */
export function isMissingWorkShiftsTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (!e) return false;
  if (e.code === '42P01' || e.code === 'PGRST205') return true;
  const msg = (e.message || '').toLowerCase();
  return (
    msg.includes('work_shifts') &&
    (msg.includes('does not exist') || msg.includes('not found') || msg.includes('schema cache'))
  );
}
