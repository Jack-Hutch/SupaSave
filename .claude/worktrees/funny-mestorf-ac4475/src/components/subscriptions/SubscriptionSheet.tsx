import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { Membership, BillingCycle } from '../../types';
import { format, addMonths, addWeeks, addYears } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Entertainment', 'Technology', 'Health & Fitness', 'Education',
  'Finance', 'Utilities', 'Shopping', 'Gaming', 'Music', 'Video',
  'News & Media', 'Productivity', 'Other',
];

const BILLING_CYCLE_OPTIONS = [
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
];

const COMMON_ICONS = [
  '📦', '🎬', '🎵', '🎮', '📰', '💪', '📚', '🌐', '☁️', '🔒',
  '📺', '🎧', '💻', '📱', '🍕', '🚗', '✈️', '🏠', '💊', '🎨',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday() {
  return format(new Date(), 'yyyy-MM-dd');
}

function getNextMonth() {
  return format(addMonths(new Date(), 1), 'yyyy-MM-dd');
}

function computeNextDate(startDate: string, cycle: BillingCycle): string {
  try {
    const date = new Date(startDate);
    if (isNaN(date.getTime())) return getNextMonth();

    // Advance by one cycle from start, then keep advancing until the result
    // is in the future — so a transaction from months ago still gets a
    // correct upcoming billing date rather than one already overdue.
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const advance = (d: Date): Date => {
      switch (cycle) {
        case 'weekly': return addWeeks(d, 1);
        case 'yearly': return addYears(d, 1);
        default:       return addMonths(d, 1);
      }
    };

    let next = advance(date);
    while (next <= today) next = advance(next);
    return format(next, 'yyyy-MM-dd');
  } catch {
    return getNextMonth();
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionPrefill {
  name?:              string;
  icon?:              string;
  cost?:              string;
  billing_cycle?:     BillingCycle;
  category?:          string;
  start_date?:        string;
  next_billing_date?: string;
  notes?:             string;
}

interface SubscriptionSheetProps {
  isOpen:      boolean;
  onClose:     () => void;
  onSave:      (data: Omit<Membership, 'id' | 'updated_at'>) => Promise<void>;
  membership?: Membership | null;
  /** Pre-populate form fields without entering edit mode (used by "Add as subscription" flow) */
  prefill?:    SubscriptionPrefill | null;
  userId:      string;
}

interface FormData {
  name:              string;
  icon:              string;
  cost:              string;
  billing_cycle:     BillingCycle;
  category:          string;
  start_date:        string;
  next_billing_date: string;
  notes:             string;
  cancel_reminder:   boolean;
  customIcon:        string; // separate field for the text input so it doesn't conflict
}

function makeDefaultForm(): FormData {
  return {
    name:              '',
    icon:              '📦',
    cost:              '',
    billing_cycle:     'monthly',
    category:          'Entertainment',
    start_date:        getToday(),
    next_billing_date: getNextMonth(),
    notes:             '',
    cancel_reminder:   false,
    customIcon:        '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubscriptionSheet({
  isOpen,
  onClose,
  onSave,
  membership,
  prefill,
  userId,
}: SubscriptionSheetProps) {
  const [form, setForm]     = useState<FormData>(makeDefaultForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const set = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  // Seed form whenever membership / prefill / isOpen changes
  useEffect(() => {
    if (membership) {
      // Edit mode — fill from existing membership
      const isPreset = COMMON_ICONS.includes(membership.icon);
      set({
        name:              membership.name,
        icon:              membership.icon,
        cost:              String(membership.cost),
        billing_cycle:     membership.billing_cycle,
        category:          membership.category,
        start_date:        membership.start_date,
        next_billing_date: membership.next_billing_date,
        notes:             membership.notes || '',
        cancel_reminder:   membership.cancel_reminder,
        customIcon:        isPreset ? '' : membership.icon,
      });
    } else if (prefill) {
      // "Add from transaction" mode — start fresh but apply prefill values
      const base = makeDefaultForm();
      const icon = prefill.icon ?? base.icon;
      set({
        ...base,
        name:              prefill.name              ?? base.name,
        icon,
        customIcon:        COMMON_ICONS.includes(icon) ? '' : icon,
        cost:              prefill.cost              ?? base.cost,
        billing_cycle:     prefill.billing_cycle     ?? base.billing_cycle,
        category:          prefill.category          ?? base.category,
        start_date:        prefill.start_date        ?? base.start_date,
        next_billing_date: prefill.next_billing_date ?? base.next_billing_date,
        notes:             prefill.notes             ?? base.notes,
      });
    } else {
      setForm(makeDefaultForm());
    }
    setErrors({});
  }, [membership, prefill, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCycleChange = (cycle: BillingCycle) => {
    const next = computeNextDate(form.start_date, cycle);
    set({ billing_cycle: cycle, next_billing_date: next });
  };

  const handleStartDateChange = (date: string) => {
    const next = computeNextDate(date, form.billing_cycle);
    set({ start_date: date, next_billing_date: next });
  };

  const handleIconPreset = (icon: string) => {
    set({ icon, customIcon: '' });
  };

  const handleCustomIcon = (val: string) => {
    set({ customIcon: val, icon: val || '📦' });
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim())  e.name = 'Name is required';
    if (!form.cost || isNaN(parseFloat(form.cost)) || parseFloat(form.cost) <= 0)
      e.cost = 'Enter a valid amount';
    if (!form.next_billing_date) e.next_billing_date = 'Next billing date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        user_id:           userId,
        name:              form.name.trim(),
        icon:              form.icon || '📦',
        cost:              parseFloat(form.cost),
        billing_cycle:     form.billing_cycle,
        category:          form.category,
        start_date:        form.start_date,
        next_billing_date: form.next_billing_date,
        notes:             form.notes.trim() || undefined,
        cancel_reminder:   form.cancel_reminder,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isPresetSelected = COMMON_ICONS.includes(form.icon);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={membership ? 'Edit Subscription' : prefill ? 'Add as Subscription' : 'Add Subscription'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-5">

        {/* ── Name ── */}
        <Input
          label="Name"
          placeholder="e.g. Netflix, Spotify, iCloud"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          error={errors.name}
          autoFocus
        />

        {/* ── Amount + Cycle ── */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={form.cost}
            onChange={(e) => set({ cost: e.target.value })}
            error={errors.cost}
          />
          <Select
            label="Billing Cycle"
            value={form.billing_cycle}
            onChange={(e) => handleCycleChange(e.target.value as BillingCycle)}
            options={BILLING_CYCLE_OPTIONS}
          />
        </div>

        {/* ── Category ── */}
        <Select
          label="Category"
          value={form.category}
          onChange={(e) => set({ category: e.target.value })}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />

        {/* ── Dates ── */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={form.start_date}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
          <Input
            label="Next Billing"
            type="date"
            value={form.next_billing_date}
            onChange={(e) => set({ next_billing_date: e.target.value })}
            error={errors.next_billing_date}
          />
        </div>

        {/* ── Icon ── */}
        <div>
          <p className="text-sm font-medium text-foreground-muted mb-2">Icon</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => handleIconPreset(icon)}
                className={`h-9 w-9 flex items-center justify-center rounded-lg text-lg border-2 transition-colors ${
                  form.icon === icon && isPresetSelected
                    ? 'border-accent bg-accent/15'
                    : 'border-border-base bg-surface-raised hover:border-accent/50'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
          <Input
            placeholder="Or type an emoji / text…"
            value={form.customIcon}
            onChange={(e) => handleCustomIcon(e.target.value)}
          />
        </div>

        {/* ── Notes ── */}
        <Textarea
          label="Notes (optional)"
          placeholder="Any notes about this subscription…"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
        />

        {/* ── Cancel reminder toggle ── */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={form.cancel_reminder}
            onClick={() => set({ cancel_reminder: !form.cancel_reminder })}
            className={`relative h-5 w-9 rounded-full border-2 transition-colors ${
              form.cancel_reminder
                ? 'bg-accent border-accent'
                : 'bg-surface-raised border-border-base'
            }`}
          >
            <span
              className={`absolute top-0 left-0 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                form.cancel_reminder ? 'translate-x-4' : 'translate-x-0'
              }`}
              style={{ marginTop: '-1px', marginLeft: '-1px' }}
            />
          </button>
          <span className="text-sm text-foreground-muted">Cancel reminder</span>
        </label>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {membership ? 'Save changes' : 'Add subscription'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
