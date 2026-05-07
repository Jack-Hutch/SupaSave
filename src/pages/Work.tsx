import { useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
} from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { formatCurrency } from '../lib/utils';
import type { WorkShift, Transaction } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, mins / 60);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')}${ampm}`;
}

function groupByMonth(shifts: WorkShift[]): Record<string, WorkShift[]> {
  const out: Record<string, WorkShift[]> = {};
  for (const s of shifts) {
    const key = s.date.slice(0, 7); // YYYY-MM
    if (!out[key]) out[key] = [];
    out[key].push(s);
  }
  return out;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}

function SummaryCard({ label, value, icon, accent = 'var(--accent)' }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex gap-3 items-center">
      <div
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}22`, color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)] truncate">{label}</p>
        <p className="text-lg font-semibold text-[var(--foreground)] leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Shift Form ───────────────────────────────────────────────────────────────

interface ShiftFormProps {
  initial?: Partial<WorkShift>;
  onSave: (data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  userId: string;
}

function ShiftForm({ initial, onSave, onCancel, userId }: ShiftFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(initial?.date ?? today);
  const [startTime, setStartTime] = useState(initial?.start_time ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.end_time ?? '17:00');
  const [rate, setRate] = useState(String(initial?.hourly_rate ?? 25));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const hours = calcHours(startTime, endTime);
  const pay = hours * parseFloat(rate || '0');

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
      setErr('Failed to save shift. Please try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">Start</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">End</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">Rate ($/hr)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Live preview */}
      {hours > 0 && (
        <div className="rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 p-3 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">
            <Clock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {hours.toFixed(2)} hrs
          </span>
          <span className="font-semibold text-[var(--accent)]">= {formatCurrency(pay, 'AUD')}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. busy Saturday, covered extra shift…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
        />
      </div>

      {err && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {err}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add shift'}
        </button>
      </div>
    </form>
  );
}

// ─── Shift Row ────────────────────────────────────────────────────────────────

interface ShiftRowProps {
  shift: WorkShift;
  transactions: Transaction[];
  onEdit: (s: WorkShift) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string, txId?: string) => void;
  currency: string;
}

function ShiftRow({ shift, transactions, onEdit, onDelete, onMarkPaid, currency }: ShiftRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedTx = transactions.find((tx) => tx.id === shift.paid_transaction_id);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Paid indicator */}
        <div className="flex-shrink-0">
          {shift.is_paid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className="w-5 h-5 text-[var(--muted)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">
            {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {shift.hours_worked}h &middot; {formatCurrency(shift.pay_owed, currency)}
            {shift.is_paid && (
              <span className="ml-2 text-emerald-400 font-medium">Paid</span>
            )}
          </p>
        </div>

        <div className="flex-shrink-0 text-[var(--muted)]">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-[var(--border)] space-y-3">
              {/* Detail grid */}
              <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                <div>
                  <p className="text-xs text-[var(--muted)]">Hours</p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{shift.hours_worked}h</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Rate</p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">${shift.hourly_rate}/hr</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Earned</p>
                  <p className="text-sm font-semibold text-[var(--accent)]">{formatCurrency(shift.pay_owed, currency)}</p>
                </div>
              </div>

              {shift.notes && (
                <p className="text-xs text-[var(--muted)] italic">{shift.notes}</p>
              )}

              {shift.is_paid && linkedTx && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">
                  Linked to: {linkedTx.description} · {formatCurrency(linkedTx.amount, currency)}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!shift.is_paid && (
                  <div className="flex-1 relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v); }}
                      className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity"
                      style={{ background: 'var(--accent)' }}
                    >
                      Mark Paid
                    </button>
                    <AnimatePresence>
                      {pickerOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-1 left-0 right-0 z-10 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl p-2 space-y-1 max-h-48 overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--foreground)]"
                            onClick={() => { onMarkPaid(shift.id, undefined); setPickerOpen(false); }}
                          >
                            Mark paid (no transaction)
                          </button>
                          <p className="text-xs text-[var(--muted)] px-2 pt-1">Or link to a transaction:</p>
                          {transactions
                            .filter((tx) => tx.is_income)
                            .slice(0, 20)
                            .map((tx) => (
                              <button
                                key={tx.id}
                                className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--foreground)]"
                                onClick={() => { onMarkPaid(shift.id, tx.id); setPickerOpen(false); }}
                              >
                                {tx.description} · {formatCurrency(tx.amount, currency)}
                                <span className="text-[var(--muted)] ml-1">({tx.date})</span>
                              </button>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {shift.is_paid && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkPaid(shift.id); }}
                    className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
                  >
                    Unmark paid
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                  className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
                  className="rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Work() {
  const workShifts = useFinanceStore((s) => s.workShifts);
  const transactions = useFinanceStore((s) => s.transactions);
  const userId = useFinanceStore((s) => s.userId);
  const currency = useFinanceStore((s) => s.settings.currency);
  const addWorkShift = useFinanceStore((s) => s.addWorkShift);
  const updateWorkShift = useFinanceStore((s) => s.updateWorkShift);
  const deleteWorkShift = useFinanceStore((s) => s.deleteWorkShift);
  const markShiftPaid = useFinanceStore((s) => s.markShiftPaid);

  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Current month key
  const thisMonth = new Date().toISOString().slice(0, 7);

  // Stats
  const stats = useMemo(() => {
    const totalEarned = workShifts.reduce((sum, s) => sum + s.pay_owed, 0);
    const totalPaid = workShifts.filter((s) => s.is_paid).reduce((sum, s) => sum + s.pay_owed, 0);
    const outstanding = totalEarned - totalPaid;
    const thisMonthShifts = workShifts.filter((s) => s.date.startsWith(thisMonth));
    const hoursThisMonth = thisMonthShifts.reduce((sum, s) => sum + s.hours_worked, 0);
    const earningsThisMonth = thisMonthShifts.reduce((sum, s) => sum + s.pay_owed, 0);
    return { totalEarned, totalPaid, outstanding, hoursThisMonth, earningsThisMonth };
  }, [workShifts, thisMonth]);

  const grouped = useMemo(() => groupByMonth(workShifts), [workShifts]);
  const sortedMonths = useMemo(
    () => Object.keys(grouped).sort((a, b) => b.localeCompare(a)),
    [grouped]
  );

  // Auto-expand current month
  useMemo(() => {
    if (sortedMonths.length > 0) {
      setExpandedMonths(new Set([sortedMonths[0]]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedMonths.length]);

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave(data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) {
    if (editingShift) {
      await updateWorkShift(editingShift.id, data);
      setEditingShift(null);
    } else {
      await addWorkShift(data);
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteWorkShift(id);
  }

  async function handleMarkPaid(id: string, txId?: string) {
    const shift = workShifts.find((s) => s.id === id);
    if (!shift) return;
    if (shift.is_paid) {
      // Unmark paid
      await updateWorkShift(id, { is_paid: false, paid_transaction_id: undefined, paid_at: undefined });
    } else {
      await markShiftPaid(id, txId);
    }
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--muted)] text-sm">
        Sign in to track your work shifts.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }}
      className="max-w-2xl mx-auto px-4 py-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}>
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">Work Shifts</h1>
            <p className="text-xs text-[var(--muted)]">Track your cafe hours &amp; pay</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingShift(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white shadow transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <Plus className="w-4 h-4" />
          Add shift
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && !editingShift && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] as const }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">New Shift</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ShiftForm
              userId={userId}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit form */}
      <AnimatePresence>
        {editingShift && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] as const }}
            className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--card)] p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Edit Shift — {formatDate(editingShift.date)}</h2>
              <button onClick={() => setEditingShift(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ShiftForm
              initial={editingShift}
              userId={userId}
              onSave={handleSave}
              onCancel={() => setEditingShift(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="This month"
          value={formatCurrency(stats.earningsThisMonth, currency)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <SummaryCard
          label="Hours this month"
          value={`${stats.hoursThisMonth.toFixed(1)}h`}
          icon={<Clock className="w-5 h-5" />}
          accent="#6366f1"
        />
        <SummaryCard
          label="Outstanding"
          value={formatCurrency(stats.outstanding, currency)}
          icon={<Circle className="w-5 h-5" />}
          accent="#f59e0b"
        />
        <SummaryCard
          label="Total paid"
          value={formatCurrency(stats.totalPaid, currency)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="#10b981"
        />
      </div>

      {/* Shift list */}
      {workShifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--surface)]">
            <Briefcase className="w-7 h-7 text-[var(--muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--foreground)]">No shifts yet</p>
          <p className="text-xs text-[var(--muted)] max-w-xs">
            Tap "Add shift" to log your first cafe shift and start tracking your pay.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMonths.map((monthKey) => {
            const monthShifts = grouped[monthKey];
            const isExpanded = expandedMonths.has(monthKey);
            const monthTotal = monthShifts.reduce((s, sh) => s + sh.pay_owed, 0);
            const monthHours = monthShifts.reduce((s, sh) => s + sh.hours_worked, 0);
            const unpaidCount = monthShifts.filter((s) => !s.is_paid).length;

            return (
              <div key={monthKey}>
                {/* Month header */}
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between px-1 py-2 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {monthLabel(monthKey)}
                    </span>
                    {unpaidCount > 0 && (
                      <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: 'var(--accent)22', color: 'var(--accent)' }}>
                        {unpaidCount} unpaid
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                    <span>{monthHours.toFixed(1)}h · {formatCurrency(monthTotal, currency)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pb-2">
                        {monthShifts.map((shift) => (
                          <div key={shift.id}>
                            <p className="text-xs text-[var(--muted)] px-1 mb-1">{formatDate(shift.date)}</p>
                            <ShiftRow
                              shift={shift}
                              transactions={transactions}
                              onEdit={setEditingShift}
                              onDelete={handleDelete}
                              onMarkPaid={handleMarkPaid}
                              currency={currency}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
