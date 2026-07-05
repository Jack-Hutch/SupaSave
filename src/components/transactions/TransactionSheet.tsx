import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { getAllCategories, COLOR_CLASSES } from '../../lib/categories';
import { SUB_LINK_PREFIX, getSubLinkId, advanceBillingDate, cycleStartOf } from '../../utils/subscriptionUtils';
import type { Transaction, TransactionSource } from '../../types';
import { format } from 'date-fns';

// ─── Payment methods ───────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  '', 'Card', 'Cash', 'Bank Transfer', 'Direct Debit', 'BPAY', 'PayID', 'PayPal', 'Other',
];

// ─── Structured tag helpers ───────────────────────────────────────────────────
// Subcategory        → stored as "sub:Fast Food"        in the tags array
// Payment            → stored as "pay:Card"             in the tags array
// Subscription link  → stored as "sub-link:<uuid>"      in the tags array
// Regular tags       → everything else
// NOTE: "sub-link:" must be checked before "sub:" fallthrough — it gets its
// own field and must never leak into the free-text tags input where the raw
// uuid could be mangled.

const SUB_PREFIX = 'sub:';
const PAY_PREFIX = 'pay:';

function parseTags(tags: string[] = []) {
  const subcategory   = tags.find((t) => t.startsWith(SUB_PREFIX) && !t.startsWith(SUB_LINK_PREFIX))?.slice(SUB_PREFIX.length) ?? '';
  const paymentMethod = tags.find((t) => t.startsWith(PAY_PREFIX))?.slice(PAY_PREFIX.length) ?? '';
  const subscriptionId = getSubLinkId(tags) ?? '';
  const regularTags   = tags.filter(
    (t) => !t.startsWith(SUB_PREFIX) && !t.startsWith(PAY_PREFIX) && !t.startsWith(SUB_LINK_PREFIX),
  );
  return { subcategory, paymentMethod, subscriptionId, regularTags };
}

function buildTags(regularTags: string[], subcategory: string, paymentMethod: string, subscriptionId: string): string[] {
  const out = [...regularTags];
  if (subcategory)    out.push(`${SUB_PREFIX}${subcategory}`);
  if (paymentMethod)  out.push(`${PAY_PREFIX}${paymentMethod}`);
  if (subscriptionId) out.push(`${SUB_LINK_PREFIX}${subscriptionId}`);
  return out;
}

// ─── Props / form types ───────────────────────────────────────────────────────

interface TransactionSheetProps {
  isOpen:       boolean;
  onClose:      () => void;
  onSave:       (data: Omit<Transaction, 'id' | 'updated_at'>) => Promise<void>;
  transaction?: Transaction | null;
  userId:       string;
}

interface FormData {
  description:    string;
  amount:         string;
  date:           string;
  category:       string;
  subcategory:    string;
  paymentMethod:  string;
  subscriptionId: string; // '' = not a subscription payment
  is_income:      boolean;
  notes:          string;
  merchant_name:  string;
  tags:           string; // comma-separated regular tags
}

function makeDefault(): FormData {
  return {
    description:    '',
    amount:         '',
    date:           format(new Date(), 'yyyy-MM-dd'),
    category:       'Uncategorized',
    subcategory:    '',
    paymentMethod:  '',
    subscriptionId: '',
    is_income:      false,
    notes:          '',
    merchant_name:  '',
    tags:           '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionSheet({
  isOpen,
  onClose,
  onSave,
  transaction,
  userId,
}: TransactionSheetProps) {
  const customCategories = useFinanceStore((s) => s.settings.customCategories);
  const memberships      = useFinanceStore((s) => s.memberships);
  const updateMembership = useFinanceStore((s) => s.updateMembership);

  // Merged list — built-in first, then custom
  const allCategories = useMemo(
    () => getAllCategories(customCategories),
    [customCategories],
  );

  const [form, setForm]     = useState<FormData>(makeDefault);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const set = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  // Seed form when the sheet opens or the transaction changes
  useEffect(() => {
    if (transaction) {
      const { subcategory, paymentMethod, subscriptionId, regularTags } = parseTags(transaction.tags);
      setForm({
        description:   transaction.description,
        amount:        String(transaction.amount),
        date:          transaction.date,
        category:      transaction.category,
        subcategory,
        paymentMethod,
        subscriptionId,
        is_income:     transaction.is_income,
        notes:         transaction.notes || '',
        merchant_name: transaction.merchant_name || '',
        tags:          regularTags.join(', '),
      });
    } else {
      setForm(makeDefault());
    }
    setErrors({});
  }, [transaction, isOpen]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      e.amount = 'Enter a valid amount';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const regularTags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const allTags     = buildTags(regularTags, form.subcategory, form.paymentMethod, form.subscriptionId);
      await onSave({
        user_id:       userId,
        description:   form.description.trim(),
        amount:        parseFloat(form.amount),
        date:          form.date,
        category:      form.category,
        is_income:     form.is_income,
        direction:     form.is_income ? 'CREDIT' : 'DEBIT',
        notes:         form.notes.trim() || undefined,
        merchant_name: form.merchant_name.trim() || undefined,
        // Always send the array — `undefined` is dropped from the JSON body
        // by supabase-js, so clearing the last tag (e.g. unlinking a
        // subscription payment) would silently never persist and the link
        // would resurrect on the next reload. `[]` actually clears.
        tags:          allTags,
        source:        (transaction?.source || 'manual') as TransactionSource,
      });

      // Newly linked to a subscription → treat like a confirmed renewal,
      // but only advance the due date when this payment covers the CURRENT
      // cycle. Linking a historical charge is a history backfill and must
      // not push the due date past the real upcoming charge.
      const prevSubId = getSubLinkId(transaction?.tags) ?? '';
      if (form.subscriptionId && form.subscriptionId !== prevSubId) {
        const m = memberships.find((x) => x.id === form.subscriptionId);
        if (m && form.date >= cycleStartOf(m.next_billing_date, m.billing_cycle)) {
          await updateMembership(m.id, {
            next_billing_date: advanceBillingDate(m.next_billing_date, m.billing_cycle, form.date),
          }).catch(() => undefined); // link is saved either way; date can be fixed on the Subs page
        }
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Current category definition (for badge preview + subcategory list)
  const catDef          = allCategories.find((c) => c.name === form.category);
  const badgeClass      = catDef ? COLOR_CLASSES[catDef.color].badge : '';
  const subcatOptions   = catDef?.subcategories ?? [];

  // Expense categories exclude Income; Income mode locks to Income only
  const categoryOptions = form.is_income
    ? allCategories.filter((c) => c.name === 'Income')
    : allCategories.filter((c) => c.name !== 'Income');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? 'Edit Transaction' : 'Add Transaction'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">

        {/* ── Income / Expense toggle ── */}
        <div className="flex rounded-lg overflow-hidden border border-border-base">
          <button
            type="button"
            onClick={() => set({
              is_income: false,
              category: form.category === 'Income' ? 'Uncategorized' : form.category,
              subcategory: '',
            })}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              !form.is_income
                ? 'bg-expense/15 text-expense'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => set({ is_income: true, category: 'Income', subcategory: '' })}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              form.is_income
                ? 'bg-income/15 text-income'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Income
          </button>
        </div>

        {/* ── Description ── */}
        <Input
          label="Description"
          placeholder="e.g. Coffee at Campos"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          error={errors.description}
          autoFocus
        />

        {/* ── Amount + Date ── */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            error={errors.amount}
            leftIcon={<span className="text-sm font-medium">$</span>}
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => set({ date: e.target.value })}
            error={errors.date}
          />
        </div>

        {/* ── Category ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground-muted">Category</label>
            {/* Live badge preview — only shown when a non-default category is selected */}
            {badgeClass && form.category !== 'Uncategorized' && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                {catDef?.icon} {form.category}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {categoryOptions.map((cat) => {
              const active = form.category === cat.name;
              const cls    = COLOR_CLASSES[cat.color];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => set({ category: cat.name, subcategory: '' })}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-left transition-colors ${
                    active
                      ? `${cls.badge} border-current`
                      : 'border-border-base bg-surface text-foreground-muted hover:bg-surface-raised'
                  }`}
                >
                  <span className="shrink-0">{cat.icon}</span>
                  <span className="leading-tight">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Subcategory ── */}
        {subcatOptions.length > 0 ? (
          <Select
            label="Subcategory"
            value={form.subcategory}
            onChange={(e) => set({ subcategory: e.target.value })}
            options={[
              { value: '', label: 'None' },
              ...subcatOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
        ) : (
          <Input
            label="Subcategory (optional)"
            placeholder="e.g. Coffee, EFTPOS…"
            value={form.subcategory}
            onChange={(e) => set({ subcategory: e.target.value })}
          />
        )}

        {/* ── Payment method ── */}
        <Select
          label="Payment method"
          value={form.paymentMethod}
          onChange={(e) => set({ paymentMethod: e.target.value })}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m || 'Not specified' }))}
        />

        {/* ── Subscription link ── */}
        {!form.is_income && memberships.length > 0 && (
          <div className="space-y-1">
            <Select
              label="Subscription payment"
              value={form.subscriptionId}
              onChange={(e) => set({ subscriptionId: e.target.value })}
              options={[
                { value: '', label: 'Not a subscription payment' },
                ...memberships.map((m) => ({ value: m.id, label: `${m.icon} ${m.name}` })),
              ]}
            />
            <p className="text-[11px] text-foreground-subtle">
              Linking adds this to the subscription's payment history and moves its next billing date forward.
            </p>
          </div>
        )}

        {/* ── Merchant ── */}
        <Input
          label="Merchant (optional)"
          placeholder="e.g. Woolworths"
          value={form.merchant_name}
          onChange={(e) => set({ merchant_name: e.target.value })}
        />

        {/* ── Notes ── */}
        <Textarea
          label="Notes (optional)"
          placeholder="Any notes…"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
        />

        {/* ── Tags ── */}
        <Input
          label="Tags (comma-separated)"
          placeholder="e.g. work, reimbursable"
          value={form.tags}
          onChange={(e) => set({ tags: e.target.value })}
        />

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {transaction ? 'Save changes' : 'Add transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
