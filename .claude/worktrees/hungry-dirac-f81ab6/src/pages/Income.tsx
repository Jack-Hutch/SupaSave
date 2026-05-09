import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Plus, Clock, Pencil, Trash2, ChevronDown, ChevronUp, X, AlertCircle,
  Briefcase, Code2, Sparkles, MoreHorizontal, Settings2,
  CalendarClock, Hourglass, BadgeCheck,
} from 'lucide-react';
import { useFinanceStore } from '../store/financeStore';
import { formatCurrency } from '../lib/utils';
import type { WorkShift, Transaction, IncomeSource, IncomeSourceType, PayType } from '../types';

// ────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ────────────────────────────────────────────────────────────────────────────

const SOURCE_TYPE_META: Record<IncomeSourceType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  main:     { label: 'Main income', icon: Briefcase,       color: 'var(--accent)' },
  freelance:{ label: 'Freelance',   icon: Code2,           color: '#6366f1' },
  sidejob:  { label: 'Side jobs',   icon: Sparkles,        color: '#f59e0b' },
  other:    { label: 'Other',       icon: MoreHorizontal,  color: '#10b981' },
};

const TYPE_ORDER: IncomeSourceType[] = ['main', 'freelance', 'sidejob', 'other'];

const DEFAULT_SOURCES: IncomeSource[] = [
  { id: 'cafe', name: 'Cafe', type: 'main', default_pay_type: 'hourly', default_rate: 25 },
];

const TWEEN = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const };

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
  if (!t || t === '00:00') return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')}${ampm}`;
}

function shiftSourceId(shift: WorkShift, sources: IncomeSource[]): string {
  if (shift.source_id && sources.some((s) => s.id === shift.source_id)) return shift.source_id;
  // legacy shifts: bucket into the first main source
  const main = sources.find((s) => s.type === 'main');
  return main?.id ?? sources[0]?.id ?? 'cafe';
}

function shiftPayType(shift: WorkShift): PayType {
  return shift.pay_type ?? 'hourly';
}

type ShiftStatus = 'scheduled' | 'completed' | 'paid';

function shiftStatus(s: WorkShift): ShiftStatus {
  if (s.is_paid) return 'paid';
  if (s.status === 'scheduled') return 'scheduled';
  return 'completed';
}

function isFutureDate(date: string): boolean {
  const d = new Date(date + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}

const STATUS_META: Record<ShiftStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Used for the small text label */
  textCls: string;
  /** Solid hex for status dot */
  dot: string;
}> = {
  scheduled: { label: 'Scheduled', icon: CalendarClock, textCls: 'text-indigo-400',  dot: '#818cf8' },
  completed: { label: 'To collect', icon: Hourglass,    textCls: 'text-amber-400',   dot: '#f59e0b' },
  paid:      { label: 'Paid',       icon: BadgeCheck,   textCls: 'text-emerald-400', dot: '#10b981' },
};

// ────────────────────────────────────────────────────────────────────────────
// Summary card
// ────────────────────────────────────────────────────────────────────────────

function SummaryCard({ label, value, accentText }: {
  label: string; value: string; accentText?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] truncate">{label}</p>
      <p className={`mt-0.5 text-base sm:text-lg font-semibold leading-tight tabular-nums truncate ${accentText ?? 'text-[var(--foreground)]'}`}>
        {value}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Entry form (hourly or flat)
// ────────────────────────────────────────────────────────────────────────────

interface EntryFormProps {
  initial?: Partial<WorkShift>;
  source: IncomeSource;
  onSave: (data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  userId: string;
}

function EntryForm({ initial, source, onSave, onCancel, userId }: EntryFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const initialPayType: PayType = initial?.pay_type ?? source.default_pay_type;

  const [payType, setPayType] = useState<PayType>(initialPayType);
  const [date, setDate] = useState(initial?.date ?? today);
  const [startTime, setStartTime] = useState(initial?.start_time ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.end_time ?? '17:00');
  const [rate, setRate] = useState(String(initial?.hourly_rate ?? source.default_rate ?? 25));
  const [flatAmount, setFlatAmount] = useState(String(initial?.flat_amount ?? ''));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const hours = payType === 'hourly' ? calcHours(startTime, endTime) : 0;
  const pay = payType === 'hourly'
    ? hours * (parseFloat(rate) || 0)
    : parseFloat(flatAmount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (payType === 'hourly') {
      if (hours <= 0) return setErr('End time must be after start time');
      const r = parseFloat(rate);
      if (isNaN(r) || r <= 0) return setErr('Enter a valid hourly rate');
    } else {
      const a = parseFloat(flatAmount);
      if (isNaN(a) || a <= 0) return setErr('Enter a valid amount');
    }
    setErr('');
    setSaving(true);
    try {
      // Status: preserve when editing; default to 'scheduled' for future dates,
      // 'completed' (undefined) for past/today.
      const nextStatus: WorkShift['status'] = initial
        ? initial.status
        : isFutureDate(date)
          ? 'scheduled'
          : undefined;

      await onSave({
        user_id: userId,
        date,
        start_time: payType === 'hourly' ? startTime : '00:00',
        end_time:   payType === 'hourly' ? endTime   : '00:00',
        hourly_rate: payType === 'hourly' ? parseFloat(rate) : 0,
        hours_worked: payType === 'hourly' ? Math.round(hours * 100) / 100 : 0,
        pay_owed: Math.round(pay * 100) / 100,
        flat_amount: payType === 'flat' ? Math.round(pay * 100) / 100 : undefined,
        pay_type: payType,
        source_id: source.id,
        source_label: source.name,
        source_type: source.type,
        notes: notes.trim() || undefined,
        status: nextStatus,
        is_paid: initial?.is_paid ?? false,
        paid_transaction_id: initial?.paid_transaction_id,
        paid_at: initial?.paid_at,
      });
    } catch (e) {
      console.error('[Income] save failed', e);
      const msg = (e as { message?: string })?.message;
      setErr(msg ? `Save failed: ${msg}` : 'Failed to save. Please try again.');
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pay type toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface)] p-1 text-xs">
        {(['hourly', 'flat'] as PayType[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPayType(p)}
            className={`rounded-lg py-1.5 font-medium transition-colors ${
              payType === p
                ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {p === 'hourly' ? 'Shift / hourly' : 'Flat amount'}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCls} />
        {!initial && isFutureDate(date) && (
          <p className="mt-1 text-[11px] text-indigo-400 flex items-center gap-1">
            <CalendarClock className="w-3 h-3" /> Saved as scheduled — mark complete after the shift.
          </p>
        )}
      </div>

      {payType === 'hourly' ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">End</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Rate ($/hr)</label>
            <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required className={inputCls} />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1">Amount ($)</label>
          <input type="number" step="0.01" min="0" value={flatAmount} onChange={(e) => setFlatAmount(e.target.value)} required placeholder="e.g. 80" className={inputCls} autoFocus />
        </div>
      )}

      {pay > 0 && (
        <div className="rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 p-3 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">
            {payType === 'hourly' && (
              <><Clock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />{hours.toFixed(2)} hrs</>
            )}
            {payType === 'flat' && 'Flat payment'}
          </span>
          <span className="font-semibold text-[var(--accent)]">= {formatCurrency(pay, 'AUD')}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="e.g. busy Saturday, covered extra shift…"
                  className={`${inputCls} resize-none`} />
      </div>

      {err && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{err}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
                className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface)] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
                className="flex-1 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: 'var(--accent)' }}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add entry'}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Entry row
// ────────────────────────────────────────────────────────────────────────────

interface EntryRowProps {
  shift: WorkShift;
  transactions: Transaction[];
  onEdit: (s: WorkShift) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string, txId?: string) => void;
  onCompleteShift: (id: string) => void;
  onUncompleteShift: (id: string) => void;
  /** Create a new income transaction and link it to this shift in one step. */
  onLogPayment: (shiftId: string, payment: { date: string; amount: number; description: string }) => Promise<void>;
  currency: string;
}

function EntryRow({ shift, transactions, onEdit, onDelete, onMarkPaid, onCompleteShift, onUncompleteShift, onLogPayment, currency }: EntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [logSaving, setLogSaving] = useState(false);

  function openLogger() {
    setPayAmount(String(shift.pay_owed.toFixed(2)));
    setPayDesc(shift.source_label ?? 'Shift payment');
    setPayDate(new Date().toISOString().split('T')[0]);
    setLogging(true);
  }

  async function submitLog() {
    const amt = parseFloat(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setLogSaving(true);
    try {
      await onLogPayment(shift.id, { date: payDate, amount: amt, description: payDesc.trim() || 'Shift payment' });
      setLogging(false);
      setPickerOpen(false);
    } finally {
      setLogSaving(false);
    }
  }
  const linkedTx = transactions.find((tx) => tx.id === shift.paid_transaction_id);
  const isFlat = shiftPayType(shift) === 'flat';
  const status = shiftStatus(shift);
  const meta = STATUS_META[status];

  return (
    <div className={`group transition-colors ${expanded ? 'bg-[var(--surface)]/40 rounded-xl' : ''}`}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-2 py-2.5 select-none text-left rounded-xl hover:bg-[var(--surface)]/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Tiny status dot */}
        <span
          className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
          style={{ background: meta.dot }}
          aria-label={meta.label}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--foreground)] truncate">
            {isFlat
              ? formatDate(shift.date)
              : `${formatDate(shift.date)} · ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            {!isFlat && `${shift.hours_worked}h · `}
            <span className={meta.textCls}>{meta.label}</span>
          </p>
        </div>
        <p className="flex-shrink-0 text-sm font-semibold text-[var(--foreground)] tabular-nums">
          {formatCurrency(shift.pay_owed, currency)}
        </p>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TWEEN}
            className="overflow-hidden"
          >
            <div className="px-2 pb-3 pt-0 space-y-3">
              {!isFlat ? (
                <div className="flex items-center justify-between gap-4 text-[11px] text-[var(--muted)] px-1">
                  <span><span className="text-[var(--foreground)] font-medium">{shift.hours_worked}h</span> worked</span>
                  <span>·</span>
                  <span><span className="text-[var(--foreground)] font-medium">${shift.hourly_rate}</span>/hr</span>
                  <span>·</span>
                  <span>{formatDate(shift.date)}</span>
                </div>
              ) : (
                <p className="text-[11px] text-[var(--muted)] px-1">{formatDate(shift.date)}</p>
              )}

              {shift.notes && <p className="text-xs text-[var(--muted)] italic px-1">{shift.notes}</p>}

              {shift.is_paid && linkedTx && (
                <p className="text-[11px] text-emerald-400 px-1">
                  Linked to {linkedTx.description} · {formatCurrency(linkedTx.amount, currency)}
                </p>
              )}

              <div className="flex gap-2">
                {/* Primary action depends on status */}
                {status === 'scheduled' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCompleteShift(shift.id); }}
                    className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    Complete shift
                  </button>
                )}
                {status === 'completed' && (
                  <div className="flex-1 relative">
                    <button onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v); }}
                            className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                            style={{ background: 'var(--accent)' }}>
                      Collect payment
                    </button>
                    <AnimatePresence>
                      {pickerOpen && (
                        <>
                          {/* click-away catcher */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => { e.stopPropagation(); setPickerOpen(false); }}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full mb-1 left-0 right-0 z-50 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl p-2 space-y-1 max-h-72 overflow-y-auto"
                            style={{ backgroundColor: 'rgb(15, 23, 42)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {logging ? (
                              <div className="space-y-2 p-1" onClick={(e) => e.stopPropagation()}>
                                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Log payment received</p>
                                <input
                                  type="date" value={payDate}
                                  onChange={(e) => setPayDate(e.target.value)}
                                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                />
                                <input
                                  type="number" step="0.01" min="0" value={payAmount}
                                  onChange={(e) => setPayAmount(e.target.value)}
                                  placeholder="Amount" autoFocus
                                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                />
                                <input
                                  type="text" value={payDesc}
                                  onChange={(e) => setPayDesc(e.target.value)}
                                  placeholder="Description (e.g. Cafe pay)"
                                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                                />
                                <div className="flex gap-1.5 pt-0.5">
                                  <button
                                    onClick={() => setLogging(false)}
                                    className="flex-1 rounded-lg border border-[var(--border)] py-1.5 text-[11px] text-[var(--muted)] hover:bg-[var(--surface)]"
                                  >
                                    Back
                                  </button>
                                  <button
                                    onClick={submitLog}
                                    disabled={logSaving || !payAmount}
                                    className="flex-1 rounded-lg py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
                                    style={{ background: 'var(--accent)' }}
                                  >
                                    {logSaving ? 'Saving…' : 'Save & link'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--foreground)] font-medium flex items-center gap-1.5"
                                  onClick={openLogger}
                                >
                                  <Plus className="w-3.5 h-3.5" /> Log payment received
                                </button>
                                <button
                                  className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--foreground)]"
                                  onClick={() => { onMarkPaid(shift.id, undefined); setPickerOpen(false); }}
                                >
                                  ✓ Mark paid (no transaction)
                                </button>
                                {transactions.filter((tx) => tx.is_income).length > 0 && (
                                  <>
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] px-2 pt-1.5">Or link existing</p>
                                    {transactions.filter((tx) => tx.is_income).slice(0, 20).map((tx) => (
                                      <button key={tx.id}
                                              className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--foreground)]"
                                              onClick={() => { onMarkPaid(shift.id, tx.id); setPickerOpen(false); }}>
                                        {tx.description} · {formatCurrency(tx.amount, currency)}
                                        <span className="text-[var(--muted)] ml-1">({tx.date})</span>
                                      </button>
                                    ))}
                                  </>
                                )}
                              </>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {status === 'paid' && (
                  <button onClick={(e) => { e.stopPropagation(); onMarkPaid(shift.id); }}
                          className="flex-1 rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors">
                    Unmark paid
                  </button>
                )}

                {/* Secondary: undo "completed" back to scheduled */}
                {status === 'completed' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onUncompleteShift(shift.id); }}
                    title="Move back to scheduled"
                    className="rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                  </button>
                )}

                <button onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
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

// ────────────────────────────────────────────────────────────────────────────
// Source manager modal
// ────────────────────────────────────────────────────────────────────────────

function SourceManager({ sources, onClose, onSave }: {
  sources: IncomeSource[];
  onClose: () => void;
  onSave: (next: IncomeSource[]) => Promise<void>;
}) {
  const [list, setList] = useState<IncomeSource[]>(sources);
  const [saving, setSaving] = useState(false);

  function addSource() {
    setList((prev) => [...prev, {
      id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      type: 'sidejob',
      default_pay_type: 'hourly',
      default_rate: 25,
    }]);
  }

  function updateAt(i: number, patch: Partial<IncomeSource>) {
    setList((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeAt(i: number) {
    setList((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const cleaned = list
      .map((s) => ({ ...s, name: s.name.trim() }))
      .filter((s) => s.name.length > 0);
    if (cleaned.length === 0) return;
    setSaving(true);
    try {
      await onSave(cleaned);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={TWEEN}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Manage income sources</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          {list.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-[var(--border)] p-2 space-y-2">
              <div className="flex gap-2">
                <input value={s.name} onChange={(e) => updateAt(i, { name: e.target.value })} placeholder="Source name (e.g. Babysitting)" className={`${inputCls} flex-1`} />
                <button onClick={() => removeAt(i)} className="rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={s.type} onChange={(e) => updateAt(i, { type: e.target.value as IncomeSourceType })} className={inputCls}>
                  {TYPE_ORDER.map((t) => <option key={t} value={t}>{SOURCE_TYPE_META[t].label}</option>)}
                </select>
                <select value={s.default_pay_type} onChange={(e) => updateAt(i, { default_pay_type: e.target.value as PayType })} className={inputCls}>
                  <option value="hourly">Hourly default</option>
                  <option value="flat">Flat default</option>
                </select>
              </div>
              {s.default_pay_type === 'hourly' && (
                <input type="number" step="0.01" min="0" value={s.default_rate ?? ''} onChange={(e) => updateAt(i, { default_rate: parseFloat(e.target.value) || 0 })} placeholder="Default rate ($/hr)" className={inputCls} />
              )}
            </div>
          ))}
        </div>

        <button onClick={addSource}
                className="mt-3 w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
          <Plus className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />Add source
        </button>

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--border)] py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface)]">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {saving ? 'Saving…' : 'Save sources'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

export function Income() {
  const workShifts   = useFinanceStore((s) => s.workShifts);
  const transactions = useFinanceStore((s) => s.transactions);
  const userId       = useFinanceStore((s) => s.userId);
  const settings     = useFinanceStore((s) => s.settings);
  const currency     = settings.currency;
  const setSettings  = useFinanceStore((s) => s.setSettings);
  const addWorkShift    = useFinanceStore((s) => s.addWorkShift);
  const updateWorkShift = useFinanceStore((s) => s.updateWorkShift);
  const deleteWorkShift = useFinanceStore((s) => s.deleteWorkShift);
  const markShiftPaid   = useFinanceStore((s) => s.markShiftPaid);
  const unmarkShiftPaid = useFinanceStore((s) => s.unmarkShiftPaid);
  const addTransaction  = useFinanceStore((s) => s.addTransaction);
  const ensureGuestUser = useFinanceStore((s) => s.ensureGuestUser);

  // Bootstrap a guest user id (from localStorage) so the page is usable
  // without sign-in. If a real user is already logged in this is a no-op.
  useEffect(() => {
    if (!userId) ensureGuestUser();
  }, [userId, ensureGuestUser]);

  const sources = useMemo<IncomeSource[]>(
    () => (settings.incomeSources && settings.incomeSources.length > 0)
      ? settings.incomeSources
      : DEFAULT_SOURCES,
    [settings.incomeSources]
  );

  // Seed defaults once if empty
  useEffect(() => {
    if (!userId) return;
    if (!settings.incomeSources || settings.incomeSources.length === 0) {
      setSettings({ incomeSources: DEFAULT_SOURCES }).catch(() => { /* non-blocking */ });
    }
  }, [userId, settings.incomeSources, setSettings]);

  const [addingFor,    setAddingFor]    = useState<IncomeSource | null>(null);
  const [editing,      setEditing]      = useState<WorkShift | null>(null);
  const [managerOpen,  setManagerOpen]  = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [collapsed,    setCollapsed]    = useState<Set<string>>(new Set());
  // Buckets in this set are collapsed. Default: paid buckets collapsed.
  const [bucketCollapsed, setBucketCollapsed] = useState<Set<string>>(new Set());

  const thisMonth = new Date().toISOString().slice(0, 7);

  // Stats — scheduled shifts are excluded from earnings/paid/outstanding
  // (they haven't been worked yet) but counted separately in "Upcoming".
  const stats = useMemo(() => {
    const earned   = workShifts.filter((s) => shiftStatus(s) !== 'scheduled');
    const upcoming = workShifts.filter((s) => shiftStatus(s) === 'scheduled');

    const totalEarned = earned.reduce((sum, s) => sum + s.pay_owed, 0);
    const totalPaid   = earned.filter((s) => s.is_paid).reduce((sum, s) => sum + s.pay_owed, 0);
    const outstanding = totalEarned - totalPaid;

    const tm = earned.filter((s) => s.date.startsWith(thisMonth));
    const hoursThisMonth    = tm.reduce((sum, s) => sum + s.hours_worked, 0);
    const earningsThisMonth = tm.reduce((sum, s) => sum + s.pay_owed, 0);

    const upcomingTotal = upcoming.reduce((sum, s) => sum + s.pay_owed, 0);
    const upcomingHours = upcoming.reduce((sum, s) => sum + s.hours_worked, 0);
    const upcomingCount = upcoming.length;

    return {
      totalEarned, totalPaid, outstanding,
      hoursThisMonth, earningsThisMonth,
      upcomingTotal, upcomingHours, upcomingCount,
    };
  }, [workShifts, thisMonth]);

  // Group shifts by source id
  const shiftsBySource = useMemo<Record<string, WorkShift[]>>(() => {
    const out: Record<string, WorkShift[]> = {};
    for (const s of workShifts) {
      const id = shiftSourceId(s, sources);
      (out[id] ??= []).push(s);
    }
    return out;
  }, [workShifts, sources]);

  // Group sources by type
  const sourcesByType = useMemo<Record<IncomeSourceType, IncomeSource[]>>(() => {
    const out: Record<IncomeSourceType, IncomeSource[]> = { main: [], freelance: [], sidejob: [], other: [] };
    for (const s of sources) out[s.type].push(s);
    return out;
  }, [sources]);

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleBucket(key: string) {
    setBucketCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleSave(data: Omit<WorkShift, 'id' | 'created_at' | 'updated_at'>) {
    if (editing) {
      await updateWorkShift(editing.id, data);
      setEditing(null);
    } else {
      await addWorkShift(data);
      setAddingFor(null);
    }
  }

  async function handleMarkPaid(id: string, txId?: string) {
    const shift = workShifts.find((s) => s.id === id);
    if (!shift) return;
    if (shift.is_paid) {
      await unmarkShiftPaid(id);
    } else {
      await markShiftPaid(id, txId);
    }
  }

  async function handleCompleteShift(id: string) {
    // Promote scheduled → completed (status field cleared)
    await updateWorkShift(id, { status: undefined });
  }

  async function handleUncompleteShift(id: string) {
    // Demote completed → scheduled
    await updateWorkShift(id, { status: 'scheduled' });
  }

  // Create a new income transaction and link it to the shift in one step.
  async function handleLogPayment(
    shiftId: string,
    payment: { date: string; amount: number; description: string },
  ) {
    if (!userId) return;
    // Find the shift to inherit source label as a tag for nicer history
    const shift = workShifts.find((s) => s.id === shiftId);
    const sourceLabel = shift?.source_label;

    // Create the transaction (id is generated inside addTransaction)
    await addTransaction({
      user_id: userId,
      amount: payment.amount,
      description: payment.description,
      category: 'Income',
      date: payment.date,
      is_income: true,
      direction: 'credit',
      tags: sourceLabel ? [`source:${sourceLabel}`] : [],
      source: 'manual',
    });

    // Locate the freshly-added transaction (matches by amount + date + desc, newest first)
    const created = useFinanceStore.getState().transactions.find(
      (t) => t.is_income && t.amount === payment.amount && t.date === payment.date && t.description === payment.description,
    );
    if (created) {
      await markShiftPaid(shiftId, created.id);
    } else {
      await markShiftPaid(shiftId);
    }
  }

  if (!userId) {
    // ensureGuestUser runs in the effect above; this is the brief gap before it sets state.
    return <div className="flex items-center justify-center h-64 text-[var(--muted)] text-sm">Loading…</div>;
  }

  const editingSource = editing ? sources.find((s) => s.id === editing.source_id) ?? sources[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }}
      className="max-w-2xl mx-auto px-4 py-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--foreground)] truncate">Income</h1>
          <p className="text-xs text-[var(--muted)] truncate mt-0.5">Track your earnings across every source</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setManagerOpen(true)}
            className="rounded-lg p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
            aria-label="Manage sources"
            title="Manage sources"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          {/* Add entry — opens form. Picks source first if multiple, else uses the only one. */}
          <div className="relative">
            <button
              onClick={() => {
                if (sources.length === 1) {
                  setEditing(null);
                  setAddingFor(sources[0]);
                } else {
                  setSourceMenuOpen((v) => !v);
                }
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
              aria-haspopup={sources.length > 1 ? 'menu' : undefined}
              aria-expanded={sources.length > 1 ? sourceMenuOpen : undefined}
            >
              <Plus className="w-4 h-4" />
              <span>Add entry</span>
            </button>
            <AnimatePresence>
              {sourceMenuOpen && sources.length > 1 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSourceMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden"
                    style={{ backgroundColor: 'rgb(15, 23, 42)' }}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] px-3 py-2 border-b border-[var(--border)]">
                      Add to which source?
                    </p>
                    <div className="max-h-[60vh] overflow-y-auto p-1">
                      {sources.map((src) => {
                        const TypeIcon = SOURCE_TYPE_META[src.type].icon;
                        return (
                          <button
                            key={src.id}
                            onClick={() => {
                              setEditing(null);
                              setAddingFor(src);
                              setSourceMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--surface)] transition-colors"
                          >
                            <span className="flex-shrink-0" style={{ color: SOURCE_TYPE_META[src.type].color }}>
                              <TypeIcon className="w-3.5 h-3.5" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[var(--foreground)] truncate">{src.name}</p>
                              <p className="text-[10px] text-[var(--muted)]">{SOURCE_TYPE_META[src.type].label}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => { setManagerOpen(true); setSourceMenuOpen(false); }}
                      className="w-full text-left text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] px-3 py-2 border-t border-[var(--border)] hover:bg-[var(--surface)]"
                    >
                      <Settings2 className="inline w-3 h-3 mr-1 -mt-0.5" />
                      Manage sources…
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Summary — single panel, vertical dividers, no icons */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-4 gap-x-4 divide-x-0 sm:divide-x sm:divide-[var(--border)]">
        <div className="sm:px-1">
          <SummaryCard label="This month" value={formatCurrency(stats.earningsThisMonth, currency)} />
        </div>
        <div className="sm:px-3">
          <SummaryCard label="Hours" value={`${stats.hoursThisMonth.toFixed(1)}h`} />
        </div>
        <div className="sm:px-3">
          <SummaryCard
            label={stats.upcomingCount > 0 ? `Upcoming · ${stats.upcomingCount}` : 'Upcoming'}
            value={stats.upcomingTotal > 0 ? formatCurrency(stats.upcomingTotal, currency) : '—'}
            accentText={stats.upcomingTotal > 0 ? 'text-indigo-400' : undefined}
          />
        </div>
        <div className="sm:px-3">
          <SummaryCard
            label="To collect"
            value={formatCurrency(stats.outstanding, currency)}
            accentText={stats.outstanding > 0 ? 'text-amber-400' : undefined}
          />
        </div>
        <div className="sm:px-3">
          <SummaryCard
            label="Paid"
            value={formatCurrency(stats.totalPaid, currency)}
            accentText={stats.totalPaid > 0 ? 'text-emerald-400' : undefined}
          />
        </div>
      </div>

      {/* Edit form (modal-ish, inline above the source) */}
      <AnimatePresence>
        {editing && editingSource && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={TWEEN}
            className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--card)] p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Edit entry — {formatDate(editing.date)}
              </h2>
              <button onClick={() => setEditing(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X className="w-4 h-4" /></button>
            </div>
            <EntryForm initial={editing} source={editingSource} userId={userId} onSave={handleSave} onCancel={() => setEditing(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sections by type */}
      {TYPE_ORDER.map((type) => {
        const typeSources = sourcesByType[type];
        if (typeSources.length === 0) return null;

        return (
          <section key={type} className="space-y-2">
            <h2 className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] px-1">
              {SOURCE_TYPE_META[type].label}
            </h2>

            {typeSources.map((source) => {
              const sShifts     = shiftsBySource[source.id] ?? [];
              const isCollapsed = collapsed.has(source.id);
              const earnedShifts = sShifts.filter((s) => shiftStatus(s) !== 'scheduled');
              const upcomingShifts = sShifts.filter((s) => shiftStatus(s) === 'scheduled');
              const totalEarned    = earnedShifts.reduce((s, sh) => s + sh.pay_owed, 0);
              const totalHours     = earnedShifts.reduce((s, sh) => s + sh.hours_worked, 0);
              const upcomingTotal  = upcomingShifts.reduce((s, sh) => s + sh.pay_owed, 0);
              const toCollect      = earnedShifts.filter((s) => !s.is_paid).length;
              const showAddForm    = addingFor?.id === source.id && !editing;

              return (
                <div key={source.id} className="space-y-2">
                  {/* Source header — flat row, no boxed container */}
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(source.id)}
                    className="w-full flex items-center justify-between gap-3 px-1 py-1.5 rounded-lg hover:bg-[var(--surface)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-[var(--foreground)] truncate">{source.name}</span>
                      {toCollect > 0 && (
                        <span className="text-[10px] text-amber-400">· {toCollect} to collect</span>
                      )}
                      {upcomingShifts.length > 0 && (
                        <span className="text-[10px] text-indigo-400">· {upcomingShifts.length} upcoming</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-[var(--muted)] tabular-nums">
                      {totalHours > 0 && <span>{totalHours.toFixed(1)}h</span>}
                      <span className="font-semibold text-[var(--foreground)]">{formatCurrency(totalEarned, currency)}</span>
                      {upcomingTotal > 0 && (
                        <span className="text-indigo-400">+{formatCurrency(upcomingTotal, currency)}</span>
                      )}
                      {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronUp className="w-3.5 h-3.5 opacity-60" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={TWEEN}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2">
                          {/* Add button / inline form */}
                          {!showAddForm ? (
                            <button
                              onClick={() => { setEditing(null); setAddingFor(source); }}
                              className="w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                            >
                              <Plus className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                              Add entry to {source.name}
                            </button>
                          ) : (
                            <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--card)] p-3">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-[var(--foreground)]">New entry — {source.name}</h3>
                                <button onClick={() => setAddingFor(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]"><X className="w-4 h-4" /></button>
                              </div>
                              <EntryForm source={source} userId={userId} onSave={handleSave} onCancel={() => setAddingFor(null)} />
                            </div>
                          )}

                          {/* Entries — bucketed by status */}
                          {sShifts.length === 0 ? (
                            <p className="text-xs text-[var(--muted)] text-center py-2">No entries yet</p>
                          ) : (() => {
                            // Bucket shifts by status; sort scheduled asc (soonest first), others desc
                            const upcoming = sShifts
                              .filter((s) => shiftStatus(s) === 'scheduled')
                              .sort((a, b) => a.date.localeCompare(b.date));
                            const toCollect = sShifts
                              .filter((s) => shiftStatus(s) === 'completed')
                              .sort((a, b) => b.date.localeCompare(a.date));
                            const paid = sShifts
                              .filter((s) => shiftStatus(s) === 'paid')
                              .sort((a, b) => b.date.localeCompare(a.date));

                            const buckets: Array<{ status: ShiftStatus; items: WorkShift[] }> = [
                              { status: 'scheduled', items: upcoming  },
                              { status: 'completed', items: toCollect },
                              { status: 'paid',      items: paid      },
                            ];

                            return buckets.filter((b) => b.items.length > 0).map(({ status: bStatus, items }) => {
                              const bMeta = STATUS_META[bStatus];
                              const bKey = `${source.id}:${bStatus}`;
                              const bOpen = !bucketCollapsed.has(bKey);
                              const bTotal = items.reduce((s, sh) => s + sh.pay_owed, 0);

                              return (
                                <div key={bKey} className="space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleBucket(bKey)}
                                    className="w-full flex items-center gap-2 px-2 py-1 text-left rounded-md hover:bg-[var(--surface)]/40 transition-colors"
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{ background: bMeta.dot }}
                                    />
                                    <span className={`text-[11px] font-medium ${bMeta.textCls}`}>{bMeta.label}</span>
                                    <span className="text-[10px] text-[var(--muted)]">· {items.length}</span>
                                    <div className="flex-1" />
                                    <span className="text-[11px] text-[var(--muted)] tabular-nums">{formatCurrency(bTotal, currency)}</span>
                                    {bOpen ? <ChevronUp className="w-3 h-3 opacity-50" /> : <ChevronDown className="w-3 h-3 opacity-50" />}
                                  </button>

                                  <AnimatePresence initial={false}>
                                    {bOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={TWEEN}
                                        className="overflow-hidden"
                                      >
                                        <div className="space-y-0.5 pt-0.5 pb-1">
                                          {items.map((shift) => (
                                            <div key={shift.id}>
                                              <EntryRow
                                                shift={shift}
                                                transactions={transactions}
                                                onEdit={(s) => { setAddingFor(null); setEditing(s); }}
                                                onDelete={(id) => deleteWorkShift(id)}
                                                onMarkPaid={handleMarkPaid}
                                                onCompleteShift={handleCompleteShift}
                                                onUncompleteShift={handleUncompleteShift}
                                                onLogPayment={handleLogPayment}
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
                            });
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </section>
        );
      })}

      {/* Empty state */}
      {sources.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--surface)]"><Wallet className="w-7 h-7 text-[var(--muted)]" /></div>
          <p className="text-sm font-medium text-[var(--foreground)]">No income sources yet</p>
          <p className="text-xs text-[var(--muted)] max-w-xs">Add a source like "Cafe", "Babysitting", or "Freelance design" to start logging income.</p>
          <button onClick={() => setManagerOpen(true)} className="rounded-xl px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
            Add a source
          </button>
        </div>
      )}

      <AnimatePresence>
        {managerOpen && (
          <SourceManager
            sources={sources}
            onClose={() => setManagerOpen(false)}
            onSave={async (next) => { await setSettings({ incomeSources: next }); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Backwards-compat export
export { Income as Work };
