import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Check, X, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { useToast } from '../../hooks/useToast';
import {
  BUILT_IN_CATEGORIES,
  getAllCategories,
  COLOR_CLASSES,
  COLOR_KEYS,
} from '../../lib/categories';
import type { CategoryDef, ColorKey } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMON_ICONS = [
  '📦', '🎯', '🛠️', '🏋️', '🎁', '🍀', '🐾', '🎸',
  '🧴', '🚀', '💡', '🌟', '🧩', '🎲', '🌍', '🔑',
  '🍔', '🧃', '🛶', '🎹', '🏄', '🧘', '🌊', '🎪',
];

const SECTION_SPRING = { type: 'spring' as const, stiffness: 400, damping: 34 };

// ── Sub-components ────────────────────────────────────────────────────────────

function ColourPicker({
  value,
  onChange,
}: {
  value: ColorKey;
  onChange: (c: ColorKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
            COLOR_CLASSES[key].swatch
          } ${value === key ? 'border-foreground ring-2 ring-foreground/30 scale-110' : 'border-transparent'}`}
          aria-label={key}
        />
      ))}
    </div>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [custom, setCustom] = useState('');
  const isPreset = COMMON_ICONS.includes(value);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {COMMON_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => { onChange(icon); setCustom(''); }}
            className={`h-8 w-8 flex items-center justify-center rounded-lg text-base border-2 transition-colors ${
              value === icon && isPreset
                ? 'border-accent bg-accent/15'
                : 'border-border-base bg-surface-raised hover:border-accent/50'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
      <Input
        placeholder="Or type your own emoji…"
        value={custom}
        onChange={(e) => {
          setCustom(e.target.value);
          if (e.target.value) onChange(e.target.value);
        }}
      />
    </div>
  );
}

interface SubcategoryEditorProps {
  subcategories: string[];
  onChange: (subs: string[]) => void;
}

function SubcategoryEditor({ subcategories, onChange }: SubcategoryEditorProps) {
  const [newSub, setNewSub] = useState('');

  const add = () => {
    const trimmed = newSub.trim();
    if (!trimmed || subcategories.includes(trimmed)) return;
    onChange([...subcategories, trimmed]);
    setNewSub('');
  };

  const remove = (sub: string) => onChange(subcategories.filter((s) => s !== sub));

  return (
    <div className="space-y-2">
      {/* Existing */}
      <div className="flex flex-wrap gap-1.5">
        {subcategories.map((sub) => (
          <span
            key={sub}
            className="flex items-center gap-1 rounded-full border border-border-base bg-surface-raised px-2.5 py-0.5 text-xs text-foreground-muted"
          >
            {sub}
            <button
              type="button"
              onClick={() => remove(sub)}
              className="rounded-full p-0.5 hover:text-expense hover:bg-expense/10 transition-colors"
              aria-label={`Remove ${sub}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {subcategories.length === 0 && (
          <span className="text-xs text-foreground-subtle">No subcategories yet</span>
        )}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="Add subcategory…"
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

// ── Inline form for creating / editing a custom category ──────────────────────

interface CategoryFormProps {
  initial?: CategoryDef;
  onSave:   (data: { name: string; icon: string; color: ColorKey; subcategories: string[] }) => void;
  onCancel: () => void;
}

function CategoryForm({ initial, onSave, onCancel }: CategoryFormProps) {
  const [name,          setName]          = useState(initial?.name          ?? '');
  const [icon,          setIcon]          = useState(initial?.icon          ?? '📦');
  const [color,         setColor]         = useState<ColorKey>(initial?.color ?? 'blue');
  const [subcategories, setSubcategories] = useState<string[]>(initial?.subcategories ?? []);
  const [error,         setError]         = useState('');
  const [showSubs,      setShowSubs]      = useState(false);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required'); return; }
    onSave({ name: trimmed, icon, color, subcategories });
  };

  const badgePreview = COLOR_CLASSES[color].badge;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={SECTION_SPRING}
      className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-4"
    >
      {/* Preview badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${badgePreview}`}>
          {icon} {name || 'Preview'}
        </span>
      </div>

      {/* Name */}
      <Input
        label="Category name"
        placeholder="e.g. Pets, Side hustle…"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(''); }}
        error={error}
        autoFocus
      />

      {/* Icon */}
      <div>
        <p className="text-sm font-medium text-foreground-muted mb-2">Icon</p>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {/* Colour */}
      <div>
        <p className="text-sm font-medium text-foreground-muted mb-2">Colour</p>
        <ColourPicker value={color} onChange={setColor} />
      </div>

      {/* Subcategories (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowSubs((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
        >
          {showSubs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Subcategories ({subcategories.length})
        </button>
        <AnimatePresence initial={false}>
          {showSubs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-2"
            >
              <SubcategoryEditor subcategories={subcategories} onChange={setSubcategories} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSave}>
          <Check className="h-3.5 w-3.5" />
          {initial ? 'Save changes' : 'Create category'}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface CategoryManagerProps {
  isOpen:  boolean;
  onClose: () => void;
}

export function CategoryManager({ isOpen, onClose }: CategoryManagerProps) {
  const settings             = useFinanceStore((s) => s.settings);
  const addCustomCategory    = useFinanceStore((s) => s.addCustomCategory);
  const updateCustomCategory = useFinanceStore((s) => s.updateCustomCategory);
  const deleteCustomCategory = useFinanceStore((s) => s.deleteCustomCategory);
  const { success }          = useToast();

  const customCategories = settings.customCategories ?? [];
  const allCategories    = getAllCategories(customCategories);

  const [showNewForm,   setShowNewForm]   = useState(false);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showBuiltIn,   setShowBuiltIn]   = useState(false);

  const handleCreate = async (data: { name: string; icon: string; color: ColorKey; subcategories: string[] }) => {
    const exists = allCategories.some((c) => c.name.toLowerCase() === data.name.toLowerCase());
    if (exists) return;
    await addCustomCategory(data);
    success(`"${data.name}" added`);
    setShowNewForm(false);
  };

  const handleUpdate = async (id: string, data: { name: string; icon: string; color: ColorKey; subcategories: string[] }) => {
    await updateCustomCategory(id, data);
    success('Category updated');
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const cat = customCategories.find((c) => c.id === id);
    await deleteCustomCategory(id);
    if (cat) success(`"${cat.name}" deleted`);
    setConfirmDelete(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories" size="lg">
      <div className="p-5 space-y-6">

        {/* ── Custom categories ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
              My Categories
            </h3>
            {!showNewForm && (
              <Button size="sm" variant="outline" onClick={() => { setShowNewForm(true); setEditingId(null); }}>
                <Plus className="h-3.5 w-3.5" /> New category
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {/* New-category form */}
            <AnimatePresence initial={false}>
              {showNewForm && (
                <CategoryForm
                  key="new"
                  onSave={handleCreate}
                  onCancel={() => setShowNewForm(false)}
                />
              )}
            </AnimatePresence>

            {/* Existing custom categories */}
            {customCategories.length === 0 && !showNewForm && (
              <div className="rounded-xl border border-dashed border-border-base py-8 text-center">
                <p className="text-sm text-foreground-subtle">No custom categories yet.</p>
                <p className="text-xs text-foreground-subtle mt-1">Create one to organise your spending your way.</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {customCategories.map((cat) => (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, height: 0, overflow: 'hidden' }}
                  transition={SECTION_SPRING}
                  className="space-y-2"
                >
                  {editingId === cat.id ? (
                    <CategoryForm
                      initial={cat}
                      onSave={(data) => handleUpdate(cat.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : confirmDelete === cat.id ? (
                    /* Inline delete confirmation */
                    <div className="flex items-center gap-3 rounded-xl border border-expense/30 bg-expense/5 px-4 py-3">
                      <span className="flex-1 text-sm text-foreground">
                        Delete <span className="font-semibold">"{cat.name}"</span>? Transactions keep their category name.
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(cat.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Keep
                      </Button>
                    </div>
                  ) : (
                    /* Row */
                    <div className="flex items-center gap-3 rounded-xl border border-border-base bg-surface px-4 py-3 hover:bg-surface-raised transition-colors">
                      {/* Badge preview */}
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${COLOR_CLASSES[cat.color].badge}`}>
                        {cat.icon} {cat.name}
                      </span>

                      {/* Subcategory count */}
                      {cat.subcategories.length > 0 && (
                        <span className="text-xs text-foreground-subtle">
                          {cat.subcategories.length} subcategories
                        </span>
                      )}

                      <div className="flex-1" />

                      {/* Actions */}
                      <button
                        onClick={() => { setEditingId(cat.id); setShowNewForm(false); setConfirmDelete(null); }}
                        className="rounded-lg p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
                        aria-label={`Edit ${cat.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(cat.id); setEditingId(null); }}
                        className="rounded-lg p-1.5 text-foreground-subtle hover:text-expense hover:bg-expense/10 transition-colors"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Built-in categories (collapsible reference) ────────────── */}
        <section>
          <button
            type="button"
            onClick={() => setShowBuiltIn((v) => !v)}
            className="flex w-full items-center justify-between mb-3 group"
          >
            <h3 className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider group-hover:text-foreground-muted transition-colors">
              Built-in Categories ({BUILT_IN_CATEGORIES.length})
            </h3>
            <motion.div
              animate={{ rotate: showBuiltIn ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-foreground-subtle"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {showBuiltIn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BUILT_IN_CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2.5 rounded-lg border border-border-base bg-surface/50 px-3 py-2"
                    >
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${COLOR_CLASSES[cat.color].badge}`}>
                        {cat.icon} {cat.name}
                      </span>
                      <Lock className="h-3 w-3 text-foreground-subtle ml-auto shrink-0" aria-label="Built-in, read-only" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </Modal>
  );
}
