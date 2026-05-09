import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Clock,
  DollarSign,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../lib/utils';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { WorkShift, Transaction } from '../types';

// ─── Animation variants (matches Dashboard pattern) ───────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')}${ampm}`;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

function groupByMonth(shifts: WorkShift[]): Record<string, WorkShift[]> {
  return shifts.reduce<Record<string, WorkShift[]>>((acc, s) => {
    const key = s.date.slice(0, 7);
    (acc[key] ??= []).push(s);
    return acc;
  }, {});
}

// ─── Shift Form (inside Modal) ────────────────────────────────────────────────

interface ShiftFormProps {
  initial?: Partial<WorkShift>;
  userId: string;
  onSave: (data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

function ShiftForm({ initial, userId, onSave, onCancel }: ShiftFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initial?.date ?? today);
  const [startTime, setStartTime] = useState(initial?.start_time ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.end_time ?? '17:00');
  const [rate, setRate] = useState(String(initial?.hourly_rate ?? 21));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const hours = calcHours(startTime, endTime);
  const pay = hours * (parseFloat(rate) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hours <= 0) { setErr('End time must be after start time'); return; }
    const parsedRate = parseFloat(rate);
    if (isNaN(parsedRate) || parsedRate <= 0) { setErr('Enter a valid hourly rate'); return; }
    setErr('');
    setSaving(true);
    try {
      await onSave({
        user_id: userId,
        date,
        start_time: startTime,
        end_time: endTime,
        hourly_rate: parsedRate,
        hours_worked: Math.round(hours * 100) / 100,
        pay_owed: Math.round(pay * 100) / 100,
        notes: notes.trim() || undefined,
        is_paid: initial?.is_paid ?? false,
        paid_transaction_id: initial?.paid_transaction_id,
        paid_at: initial?.paid_at,
      });
    } catch {
      setErr('Failed to save shift. Try again.');
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-border-base bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors';
  const labelClass = 'block text-xs font-medium text-foreground-subtle uppercase tracking-wider mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <label className={labelClass}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Start time</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End time</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Hourly rate ($/hr)</label>
        <input
          type="number" step="0.01" min="0" value={rate}
          onChange={(e) => setRate(e.target.value)} required className={inputClass}
          placeholder="21.00"
        />
      </div>

      {/* Live pay preview */}
      {hours > 0 && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-foreground-subtle flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {hours.toFixed(2)} hrs
          </span>
          <span className="font-mono text-sm font-bold text-accent">{formatCurrency(pay, 'AUD')}</span>
        </div>
      )}

      <div>
        <label className={labelClass}>Notes <span className="normal-case font-normal">(optional)</span></label>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="e.g. busy Saturday, covered extra shift…"
          className={`${inputClass} resize-none`}
        />
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {err}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" loading={saving} className="flex-1">
          {initial ? 'Save changes' : 'Add shift'}
        </Button>
      </div>
    </form>
  );
}

// ─── Mark Paid Modal ──────────────────────────────────────────────────────────

interface MarkPaidModalProps {
  shift: WorkShift;
  transactions: Transaction[];
  currency: string;
  onConfirm: (shiftId: string, txId?: string) => Promise<void>;
  onClose: () => void;
}

function MarkPaidModal({ shift, transactions, currency, onConfirm, onClose }: MarkPaidModalProps) {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const incomeTxs = useMemo(() =>
    transactions
      .filter((tx) => tx.is_income)
      .filter((tx) =>
        search.trim() === '' ||
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        (tx.merchant_name ?? '').toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 15),
    [transactions, search]
  );

  async function handle(txId?: string) {
    setSaving(true);
    try {
      await onConfirm(shift.id, txId);
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 space-y-4">
      <p className="text-sm text-foreground-subtle">
        Mark <span className="text-foreground font-medium">{formatShortDate(shift.date)}</span> —{' '}
        {formatTime(shift.start_time)}–{formatTime(shift.end_time)} (
        <span className="text-accent font-medium">{formatCurrency(shift.pay_owed, currency)}</span>) as paid.
      </p>

      {/* Option A — no transaction */}
      <button
        onClick={() => handle(undefined)}
        disabled={saving}
        className="w-full flex items-center gap-3 rounded-lg border border-border-base bg-surface px-4 py-3 text-left hover:bg-surface-raised transition-colors disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Mark paid (no transaction)</p>
          <p className="text-xs text-foreground-subtle mt-0.5">Just flag this shift as paid</p>
        </div>
      </button>

      {/* Option B — link to transaction */}
      <div>
        <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider mb-2">
          Or link to an income transaction
        </p>
        <input
          type="text"
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border-base bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors mb-2"
        />
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {incomeTxs.length === 0 ? (
            <p className="text-xs text-foreground-subtle text-center py-4">No income transactions found</p>
          ) : (
            incomeTxs.map((tx) => (
              <button
                key={tx.id}
                onClick={() => handle(tx.id)}
                disabled={saving}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-surface-raised transition-colors disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{tx.description}</p>
                  <p className="text-xs text-foreground-subtle">{tx.date}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-emerald-400 ml-3 shrink-0">
                  +{formatCurrency(tx.amount, currency)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shift Row ────────────────────────────────────────────────────────────────

interface ShiftRowProps {
  shift: WorkShift;
  transactions: Transaction[];
  currency: string;
  onEdit: (s: WorkShift) => void;
  onDelete: (s: WorkShift) => void;
  onMarkPaid: (s: WorkShift) => void;
  onUnmarkPaid: (s: WorkShift) => void;
}

function ShiftRow({ shift, transactions, currency, onEdit, onDelete, onMarkPaid, onUnmarkPaid }: ShiftRowProps) {
  const linkedTx = transactions.find((tx) => tx.id === shift.paid_transaction_id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised rounded-lg transition-colors group"
    >
      {/* Status dot */}
      <div className="shrink-0 mt-0.5">
        {shift.is_paid
          ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          : <Circle className="h-4 w-4 text-foreground-subtle" />
        }
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">
            {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
          </span>
          <span className="text-xs text-foreground-subtle">{shift.hours_worked}h</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-foreground-subtle">{formatShortDate(shift.date)}</span>
          {shift.is_paid && (
            <span className="text-xs font-medium text-emerald-400">Paid{linkedTx ? ` · ${linkedTx.description}` : ''}</span>
          )}
          {shift.notes && (
            <span className="text-xs text-foreground-subtle truncate max-w-[120px]">{shift.notes}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      <span className={`font-mono text-sm font-bold shrink-0 ${shift.is_paid ? 'text-foreground-muted' : 'text-foreground'}`}>
        {formatCurrency(shift.pay_owed, currency)}
      </span>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {shift.is_paid ? (
          <button
            onClick={() => onUnmarkPaid(shift)}
            className="rounded-md px-2 py-1 text-xs text-foreground-subtle hover:bg-surface hover:text-foreground border border-transparent hover:border-border-base transition-all"
          >
            Unmark
          </button>
        ) : (
          <button
            onClick={() => onMarkPaid(shift)}
            className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            Mark paid
          </button>
        )}
        <button
          onClick={() => onEdit(shift)}
          className="rounded-md p-1.5 text-foreground-subtle hover:bg-surface hover:text-foreground transition-colors"
          aria-label="Edit shift"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(shift)}
          className="rounded-md p-1.5 text-foreground-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Delete shift"
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
  transactions: Transaction[];
  currency: string;
  onEdit: (s: WorkShift) => void;
  onDelete: (s: WorkShift) => void;
  onMarkPaid: (s: WorkShift) => void;
  onUnmarkPaid: (s: WorkShift) => void;
}

function MonthGroup({ monthKey, shifts, transactions, currency, onEdit, onDelete, onMarkPaid, onUnmarkPaid }: MonthGroupProps) {
  const [open, setOpen] = useState(true);

  const totalPay = shifts.reduce((s, sh) => s + sh.pay_owed, 0);
  const totalHours = shifts.reduce((s, sh) => s + sh.hours_worked, 0);
  const unpaid = shifts.filter((s) => !s.is_paid);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-2 px-1 group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-foreground">{monthLabel(monthKey)}</span>
          {unpaid.length > 0 && (
            <span className="text-xs rounded-full px-2 py-0.5 border border-accent/25 bg-accent/10 text-accent font-medium">
              {unpaid.length} unpaid
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground-subtle">
            {totalHours.toFixed(1)}h · {formatCurrency(totalPay, currency)}
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-foreground-subtle" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }}
            className="overflow-hidden"
          >
            <Card padding="none" className="divide-y divide-border-base">
              <AnimatePresence mode="popLayout">
                {shifts.map((shift) => (
                  <ShiftRow
                    key={shift.id}
                    shift={shift}
                    transactions={transactions}
                    currency={currency}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMarkPaid={onMarkPaid}
                    onUnmarkPaid={onUnmarkPaid}
                  />
                ))}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Work() {
  const workShifts    = useFinanceStore((s) => s.workShifts);
  const transactions  = useFinanceStore((s) => s.transactions);
  const userId        = useFinanceStore((s) => s.userId);
  const currency      = useFinanceStore((s) => s.settings.currency);
  const addWorkShift  = useFinanceStore((s) => s.addWorkShift);
  const updateWorkShift = useFinanceStore((s) => s.updateWorkShift);
  const deleteWorkShift = useFinanceStore((s) => s.deleteWorkShift);
  const markShiftPaid   = useFinanceStore((s) => s.markShiftPaid);
  const { success, error } = useToast();

  const [addOpen, setAddOpen]     = useState(false);
  const [editShift, setEditShift] = useState<WorkShift | null>(null);
  const [deleteShift, setDeleteShift] = useState<WorkShift | null>(null);
  const [payShift, setPayShift]   = useState<WorkShift | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const totalEarned = workShifts.reduce((s, sh) => s + sh.pay_owed, 0);
    const totalPaid   = workShifts.filter((s) => s.is_paid).reduce((s, sh) => s + sh.pay_owed, 0);
    const outstanding = totalEarned - totalPaid;
    const thisMonthShifts = workShifts.filter((s) => s.date.startsWith(thisMonth));
    return {
      totalEarned,
      totalPaid,
      outstanding,
      hoursThisMonth:    thisMonthShifts.reduce((s, sh) => s + sh.hours_worked, 0),
      earningsThisMonth: thisMonthShifts.reduce((s, sh) => s + sh.pay_owed, 0),
    };
  }, [workShifts, thisMonth]);

  const grouped      = useMemo(() => groupByMonth(workShifts), [workShifts]);
  const sortedMonths = useMemo(() => Object.keys(grouped).sort((a, b) => b.localeCompare(a)), [grouped]);

  // ── Handlers ──────────────────────────────────────────────────────────

  async function handleAdd(data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) {
    await addWorkShift(data);
    setAddOpen(false);
    success('Shift added');
  }

  async function handleEdit(data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) {
    if (!editShift) return;
    await updateWorkShift(editShift.id, data);
    setEditShift(null);
    success('Shift updated');
  }

  async function handleDelete() {
    if (!deleteShift) return;
    setDeleting(true);
    try {
      await deleteWorkShift(deleteShift.id);
      success('Shift deleted');
      setDeleteShift(null);
    } catch {
      error('Failed to delete shift');
    } finally {
      setDeleting(false);
    }
  }

  async function handleMarkPaid(shiftId: string, txId?: string) {
    await markShiftPaid(shiftId, txId);
    success('Shift marked as paid');
  }

  async function handleUnmarkPaid(shift: WorkShift) {
    await updateWorkShift(shift.id, { is_paid: false, paid_transaction_id: undefined, paid_at: undefined });
    success('Shift unmarked');
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-foreground-subtle">Sign in to track your work shifts.</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto px-4 py-5 lg:px-6 space-y-5"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2.5">
              <Briefcase className="h-5 w-5 text-accent" />
              Work Shifts
            </h1>
            <p className="text-xs text-foreground-subtle mt-0.5">Track your cafe hours &amp; pay</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add shift
          </Button>
        </motion.div>

        {/* Stats — same pattern as SummaryCard grid on Dashboard */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-accent/25 bg-surface p-4">
            <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">This month</p>
            <p className="mt-1.5 font-mono text-xl font-bold text-accent">
              {formatCurrency(stats.earningsThisMonth, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-border-base bg-surface p-4">
            <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Hours
            </p>
            <p className="mt-1.5 font-mono text-xl font-bold text-foreground">
              {stats.hoursThisMonth.toFixed(1)}h
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-surface p-4">
            <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">Outstanding</p>
            <p className="mt-1.5 font-mono text-xl font-bold text-amber-400">
              {formatCurrency(stats.outstanding, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/25 bg-surface p-4">
            <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Total paid
            </p>
            <p className="mt-1.5 font-mono text-xl font-bold text-emerald-400">
              {formatCurrency(stats.totalPaid, currency)}
            </p>
          </div>
        </motion.div>

        {/* Shift list */}
        {workShifts.length === 0 ? (
          <motion.div variants={item}>
            <div className="rounded-xl border border-border-base bg-surface/50 p-12 text-center">
              <Briefcase className="h-8 w-8 text-foreground-subtle mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground-muted">No shifts yet</p>
              <p className="text-xs text-foreground-subtle mt-1 mb-4">
                Log your first shift to start tracking hours and pay.
              </p>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add your first shift
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={item} className="space-y-4">
            {sortedMonths.map((key) => (
              <MonthGroup
                key={key}
                monthKey={key}
                shifts={grouped[key]}
                transactions={transactions}
                currency={currency}
                onEdit={setEditShift}
                onDelete={setDeleteShift}
                onMarkPaid={setPayShift}
                onUnmarkPaid={handleUnmarkPaid}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Add shift modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add shift" size="sm">
        <ShiftForm userId={userId} onSave={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Edit shift modal */}
      <Modal isOpen={!!editShift} onClose={() => setEditShift(null)} title="Edit shift" size="sm">
        {editShift && (
          <ShiftForm
            initial={editShift}
            userId={userId}
            onSave={handleEdit}
            onCancel={() => setEditShift(null)}
          />
        )}
      </Modal>

      {/* Mark paid modal */}
      <Modal isOpen={!!payShift} onClose={() => setPayShift(null)} title="Mark shift as paid" size="sm">
        {payShift && (
          <MarkPaidModal
            shift={payShift}
            transactions={transactions}
            currency={currency}
            onConfirm={handleMarkPaid}
            onClose={() => setPayShift(null)}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteShift}
        onClose={() => setDeleteShift(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete shift"
        message={
          deleteShift
            ? `Delete ${formatShortDate(deleteShift.date)} (${formatCurrency(deleteShift.pay_owed, currency)})? This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
