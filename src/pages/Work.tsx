import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Clock, Pencil, Trash2, AlertCircle,
  AlertTriangle, TrendingUp, Check,
} from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { WorkShift } from '../types';

// ─── Animation (matches Dashboard stagger) ───────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.22 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function fmtShortDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

function groupByMonth(shifts: WorkShift[]): Record<string, WorkShift[]> {
  return shifts.reduce<Record<string, WorkShift[]>>((acc, s) => {
    const k = s.date.slice(0, 7);
    (acc[k] ??= []).push(s);
    return acc;
  }, {});
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  meta?: string;
  delta?: { value: string; up: boolean };
  iconBg: string;   // CSS class for icon background colour
  iconColor: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, meta, delta, iconBg, iconColor, icon }: StatCardProps) {
  return (
    <div className="rounded-[18px] border border-border-base bg-surface p-5 relative hover:border-border-strong hover:bg-surface-raised transition-colors">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-foreground-subtle">{label}</p>
      <div
        className={`absolute top-[18px] right-[18px] w-7 h-7 rounded-lg border flex items-center justify-center ${iconBg}`}
        style={{ color: iconColor }}
      >
        {icon}
      </div>
      <p className="font-mono text-[28px] font-bold tracking-tight leading-none mt-[18px]">{value}</p>
      {(meta || delta) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground-muted">
          {delta && (
            <span
              className="font-mono font-medium text-[11.5px] px-1.5 py-0.5 rounded"
              style={{
                color: delta.up ? 'rgb(var(--income))' : 'rgb(var(--expense))',
                background: delta.up ? 'var(--income-soft)' : 'var(--expense-soft)',
              }}
            >
              {delta.up ? '+' : ''}{delta.value}
            </span>
          )}
          {meta && <span>{meta}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Shift Form ───────────────────────────────────────────────────────────────

interface ShiftFormProps {
  initial?: Partial<WorkShift>;
  userId: string;
  onSave: (data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

function ShiftForm({ initial, userId, onSave, onCancel }: ShiftFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate]           = useState(initial?.date ?? today);
  const [startTime, setStartTime] = useState(initial?.start_time ?? '09:00');
  const [endTime, setEndTime]     = useState(initial?.end_time ?? '17:00');
  const [rate, setRate]           = useState(String(initial?.hourly_rate ?? 21));
  const [notes, setNotes]         = useState(initial?.notes ?? '');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  const hours = calcHours(startTime, endTime);
  const pay   = hours * (parseFloat(rate) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hours <= 0) { setErr('End time must be after start time'); return; }
    const r = parseFloat(rate);
    if (isNaN(r) || r <= 0) { setErr('Enter a valid hourly rate'); return; }
    setErr(''); setSaving(true);
    try {
      await onSave({
        user_id: userId, date,
        start_time: startTime, end_time: endTime,
        hourly_rate: r,
        hours_worked: Math.round(hours * 100) / 100,
        pay_owed: Math.round(pay * 100) / 100,
        notes: notes.trim() || undefined,
        is_paid: initial?.is_paid ?? false,
        paid_transaction_id: initial?.paid_transaction_id ?? undefined,
        paid_at: initial?.paid_at ?? undefined,
      });
    } catch (e) {
      const msg = (e as { message?: string })?.message;
      setErr(msg ? `Error: ${msg}` : 'Failed to save. Try again.');
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-border-base bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors';
  const lblCls   = 'block text-[10.5px] font-semibold uppercase tracking-[0.09em] text-foreground-subtle mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <label className={lblCls}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lblCls}>Start</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className={lblCls}>End</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className={inputCls} />
        </div>
      </div>
      <div>
        <label className={lblCls}>Rate ($/hr)</label>
        <input type="number" step="0.01" min="0" value={rate} onChange={e => setRate(e.target.value)} required placeholder="21.00" className={inputCls} />
      </div>

      {/* Live preview */}
      {hours > 0 && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-foreground-subtle flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />{hours.toFixed(2)} hrs
          </span>
          <span className="font-mono text-sm font-bold text-accent">{formatCurrency(pay, 'AUD')}</span>
        </div>
      )}

      <div>
        <label className={lblCls}>Notes <span className="normal-case font-normal">(optional)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. busy Saturday…" className={`${inputCls} resize-none`} />
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />{err}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" loading={saving} className="flex-1">{initial ? 'Save changes' : 'Log shift'}</Button>
      </div>
    </form>
  );
}

// ─── Shift Row ────────────────────────────────────────────────────────────────

interface ShiftRowProps {
  shift: WorkShift;
  currency: string;
  onEdit: (s: WorkShift) => void;
  onDelete: (s: WorkShift) => void;
  onTogglePaid: (s: WorkShift) => void;
  toggling: boolean;
}

function ShiftRow({ shift, currency, onEdit, onDelete, onTogglePaid, toggling }: ShiftRowProps) {
  return (
    <motion.div
      layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="group grid items-center gap-4 px-[18px] py-[14px] border-b border-border-base last:border-0 hover:bg-surface-raised transition-colors"
      style={{ gridTemplateColumns: '28px 1.6fr 80px 110px 1fr' }}
    >
      {/* Inline paid checkbox */}
      <button
        onClick={() => onTogglePaid(shift)}
        disabled={toggling}
        title={shift.is_paid ? 'Mark unpaid' : 'Mark as paid'}
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 disabled:opacity-50"
        style={shift.is_paid
          ? {
              background: 'rgb(var(--income))',
              borderColor: 'rgb(var(--income))',
              boxShadow: '0 0 0 3px var(--income-soft)',
            }
          : {
              background: 'transparent',
              borderColor: 'rgb(var(--border-strong))',
            }
        }
      >
        {shift.is_paid && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </button>

      {/* When */}
      <div className="min-w-0">
        <p className="font-mono font-semibold text-[13.5px] tracking-tight text-foreground leading-none">
          {fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
        </p>
        <p className="text-xs text-foreground-muted mt-1">{fmtShortDate(shift.date)}</p>
      </div>

      {/* Hours */}
      <p className="font-mono text-[13px] text-foreground-muted">
        <strong className="text-foreground font-semibold">{shift.hours_worked}</strong>h
      </p>

      {/* Amount */}
      <p
        className="font-mono font-bold text-[14px] tracking-tight"
        style={{ color: shift.is_paid ? 'rgb(var(--income))' : 'rgb(var(--warn))' }}
      >
        {formatCurrency(shift.pay_owed, currency)}
      </p>

      {/* Actions — hover reveal */}
      <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(shift)}
          className="p-1.5 rounded-md text-foreground-subtle hover:bg-surface hover:text-foreground transition-colors"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(shift)}
          className="p-1.5 rounded-md text-foreground-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Month Group ──────────────────────────────────────────────────────────────

interface MonthGroupProps {
  monthKey: string;
  shifts: WorkShift[];
  currency: string;
  onEdit: (s: WorkShift) => void;
  onDelete: (s: WorkShift) => void;
  onTogglePaid: (s: WorkShift) => void;
  togglingId: string | null;
}

function MonthGroup({ monthKey, shifts, currency, onEdit, onDelete, onTogglePaid, togglingId }: MonthGroupProps) {
  const [open, setOpen] = useState(true);

  const totalHours = shifts.reduce((s, sh) => s + sh.hours_worked, 0);
  const totalPay   = shifts.reduce((s, sh) => s + sh.pay_owed, 0);
  const allPaid    = shifts.every(s => s.is_paid);
  const anyUnpaid  = shifts.some(s => !s.is_paid);

  return (
    <div className="mb-5">
      {/* Month header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-[18px] py-[10px] bg-canvas border border-border-base rounded-t-[10px] text-left"
        style={{ borderBottomColor: open ? 'transparent' : 'var(--border-base)' }}
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-foreground-muted">
          {monthLabel(monthKey)}
        </span>
        <div className="ml-auto flex items-center gap-4 font-mono text-xs">
          <span className="text-foreground-subtle">
            Hours <strong className="text-foreground font-semibold">
              {totalHours % 1 === 0 ? `${totalHours}h` : `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`}
            </strong>
          </span>
          <span className="text-foreground-subtle">
            Earned <strong className="text-foreground font-semibold">{formatCurrency(totalPay, currency)}</strong>
          </span>
          <span className="text-foreground-subtle">
            Status{' '}
            <strong
              className="font-semibold"
              style={{ color: allPaid ? 'rgb(var(--income))' : anyUnpaid ? 'rgb(var(--warn))' : 'rgb(var(--income))' }}
            >
              {allPaid ? 'Paid' : anyUnpaid ? 'Unpaid' : 'Partial'}
            </strong>
          </span>
          <motion.svg
            animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}
            className="w-3.5 h-3.5 text-foreground-subtle" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </motion.svg>
        </div>
      </button>

      {/* Shift list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }}
            className="overflow-hidden"
          >
            <div className="border border-border-base rounded-b-[10px] bg-surface">
              <AnimatePresence mode="popLayout">
                {shifts.map(shift => (
                  <ShiftRow
                    key={shift.id} shift={shift} currency={currency}
                    onEdit={onEdit} onDelete={onDelete}
                    onTogglePaid={onTogglePaid}
                    toggling={togglingId === shift.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Work() {
  const workShifts      = useFinanceStore(s => s.workShifts);
  const userId          = useFinanceStore(s => s.userId);
  const currency        = useFinanceStore(s => s.settings.currency);
  const addWorkShift    = useFinanceStore(s => s.addWorkShift);
  const updateWorkShift = useFinanceStore(s => s.updateWorkShift);
  const deleteWorkShift = useFinanceStore(s => s.deleteWorkShift);
  const markShiftPaid   = useFinanceStore(s => s.markShiftPaid);
  const { success, error } = useToast();

  const [addOpen, setAddOpen]         = useState(false);
  const [editShift, setEditShift]     = useState<WorkShift | null>(null);
  const [deleteShift, setDeleteShift] = useState<WorkShift | null>(null);
  const [togglingId, setTogglingId]   = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const thisMonthShifts = workShifts.filter(s => s.date.startsWith(thisMonth));
    const totalEarned  = workShifts.reduce((s, sh) => s + sh.pay_owed, 0);
    const totalPaid    = workShifts.filter(s => s.is_paid).reduce((s, sh) => s + sh.pay_owed, 0);
    const unpaidCount  = workShifts.filter(s => !s.is_paid).length;
    const hoursMonth   = thisMonthShifts.reduce((s, sh) => s + sh.hours_worked, 0);
    const earningsMonth = thisMonthShifts.reduce((s, sh) => s + sh.pay_owed, 0);
    const avgRate      = workShifts.length
      ? workShifts.reduce((s, sh) => s + sh.hourly_rate, 0) / workShifts.length
      : 0;
    return { totalEarned, totalPaid, outstanding: totalEarned - totalPaid, unpaidCount, hoursMonth, earningsMonth, avgRate };
  }, [workShifts, thisMonth]);

  const grouped      = useMemo(() => groupByMonth(workShifts), [workShifts]);
  const sortedMonths = useMemo(() => Object.keys(grouped).sort((a, b) => b.localeCompare(a)), [grouped]);

  // Handlers
  async function handleAdd(data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) {
    await addWorkShift(data); setAddOpen(false); success('Shift logged');
  }
  async function handleEdit(data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) {
    if (!editShift) return;
    await updateWorkShift(editShift.id, data); setEditShift(null); success('Shift updated');
  }
  async function handleDelete() {
    if (!deleteShift) return;
    setDeleting(true);
    try { await deleteWorkShift(deleteShift.id); success('Shift deleted'); setDeleteShift(null); }
    catch { error('Failed to delete shift'); }
    finally { setDeleting(false); }
  }
  async function handleTogglePaid(shift: WorkShift) {
    if (togglingId) return; // debounce double-clicks
    setTogglingId(shift.id);
    try {
      if (shift.is_paid) {
        await updateWorkShift(shift.id, { is_paid: false, paid_transaction_id: undefined, paid_at: undefined });
        success('Marked unpaid');
      } else {
        await markShiftPaid(shift.id);
        success('Marked as paid ✓');
      }
    } catch (e) {
      error((e as { message?: string })?.message ?? 'Failed to update shift');
    } finally {
      setTogglingId(null);
    }
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-foreground-subtle">Sign in to track your work shifts.</p>
      </div>
    );
  }

  const hoursDisplay = stats.hoursMonth % 1 === 0
    ? `${stats.hoursMonth}h`
    : `${Math.floor(stats.hoursMonth)}h ${Math.round((stats.hoursMonth % 1) * 60)}m`;

  return (
    <>
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="max-w-4xl mx-auto px-4 py-9 lg:px-8 space-y-6"
      >
        {/* Page header */}
        <motion.div variants={item} className="flex items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-semibold tracking-tight text-foreground leading-none">
                Work shifts
              </h1>
              {stats.unpaidCount > 0 && (
                <span
                  className="font-mono text-[11px] font-medium px-2 py-1 rounded"
                  style={{ color: 'rgb(var(--accent))', background: 'var(--accent-soft)' }}
                >
                  {stats.unpaidCount} unpaid
                </span>
              )}
            </div>
            <p className="text-[13.5px] text-foreground-muted">
              Track shifts, hours, and what your employer still owes you.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Log shift
            </Button>
          </div>
        </motion.div>

        {/* Stat cards */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="This month"
            value={`$${stats.earningsMonth.toFixed(2)}`}
            meta="current month"
            iconBg="border-accent/22 bg-accent/10"
            iconColor="rgb(var(--accent))"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Hours worked"
            value={hoursDisplay}
            meta={stats.avgRate > 0 ? `avg $${stats.avgRate.toFixed(2)}/hr` : undefined}
            iconBg="border-border-base bg-canvas"
            iconColor="rgb(var(--foreground-muted))"
            icon={
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="9"/>
              </svg>
            }
          />
          <StatCard
            label="Outstanding"
            value={`$${stats.outstanding.toFixed(2)}`}
            meta={`${stats.unpaidCount} shift${stats.unpaidCount !== 1 ? 's' : ''} unpaid`}
            iconBg="border-amber-500/18 bg-amber-500/10"
            iconColor="rgb(var(--warn))"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Total paid (YTD)"
            value={`$${stats.totalPaid.toFixed(2)}`}
            iconBg="border-emerald-500/18 bg-emerald-500/10"
            iconColor="rgb(var(--income))"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
        </motion.div>

        {/* Empty state */}
        {workShifts.length === 0 && (
          <motion.div variants={item}>
            <div className="rounded-[18px] border border-border-base bg-surface/50 p-14 text-center">
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--accent-soft)', color: 'rgb(var(--accent))' }}
              >
                <Clock className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No shifts logged</p>
              <p className="text-xs text-foreground-subtle mb-5 max-w-xs mx-auto">
                Start tracking your cafe shifts to see earnings, hours, and outstanding pay.
              </p>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Log your first shift
              </Button>
            </div>
          </motion.div>
        )}

        {/* Shift groups */}
        {sortedMonths.length > 0 && (
          <motion.div variants={item}>
            {sortedMonths.map(key => (
              <MonthGroup
                key={key} monthKey={key} shifts={grouped[key]} currency={currency}
                onEdit={setEditShift} onDelete={setDeleteShift}
                onTogglePaid={handleTogglePaid} togglingId={togglingId}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Modals */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Log shift" size="sm">
        <ShiftForm userId={userId} onSave={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal isOpen={!!editShift} onClose={() => setEditShift(null)} title="Edit shift" size="sm">
        {editShift && (
          <ShiftForm initial={editShift} userId={userId} onSave={handleEdit} onCancel={() => setEditShift(null)} />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteShift} onClose={() => setDeleteShift(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Delete shift"
        message={deleteShift ? `Delete ${fmtShortDate(deleteShift.date)} (${formatCurrency(deleteShift.pay_owed, currency)})? This can't be undone.` : ''}
        confirmLabel="Delete" variant="destructive"
      />
    </>
  );
}
