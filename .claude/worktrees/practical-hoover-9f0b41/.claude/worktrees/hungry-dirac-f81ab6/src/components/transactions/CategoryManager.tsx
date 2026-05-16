import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Check, X, RotateCcw, ChevronDown, ChevronUp, CheckSquare, Square, Eye } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { useToast } from '../../hooks/useToast';
import {
  BUILT_IN_CATEGORIES,
  getAllCategories,
  getAllCategoriesIncludingHidden,
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
  inline?: boolean;
}

export function CategoryManager({ isOpen, onClose, inline }: CategoryManagerProps) {
  const settings               = useFinanceStore((s) => s.settings);
  const addCustomCategory      = useFinanceStore((s) => s.addCustomCategory);
  const updateCustomCategory   = useFinanceStore((s) => s.updateCustomCategory);
  const upsertCategoryOverride = useFinanceStore((s) => s.upsertCategoryOverride);
  const deleteCategory         = useFinanceStore((s) => s.deleteCategory);
  const restoreCategory        = useFinanceStore((s) => s.restoreCategory);
  const bulkDeleteCategories   = useFinanceStore((s) => s.bulkDeleteCategories);
  const { success }            = useToast();

  const customCategories = settings.customCategories ?? [];
  const visible = getAllCategories(customCategories);
  const all     = getAllCategoriesIncludingHidden(customCategories);
  const hidden  = all.filter((c) => c.hidden);

  const isBuiltIn      = (id: string) => BUILT_IN_CATEGORIES.some((b) => b.id === id);
  const isOverridden   = (id: string) =>
    customCategories.some((c) => c.id === id) && isBuiltIn(id);

  const [showNewForm,    setShowNewForm]    = useState(false);
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null);
  const [showHidden,     setShowHidden]     = useState(false);
  const [selectionMode,  setSelectionMode]  = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [confirmBulk,    setConfirmBulk]    = useState(false);

  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(visible.map((c) => c.id)));

  const handleCreate = async (data: { name: string; icon: string; color: ColorKey; subcategories: string[] }) => {
    const exists = visible.some((c) => c.name.toLowerCase() === data.name.toLowerCase());
    if (exists) return;
    await addCustomCategory(data);
    success(`"${data.name}" added`);
    setShowNewForm(false);
  };

  const handleSaveEdit = async (id: string, data: { name: string; icon: string; color: ColorKey; subcategories: string[] }) => {
    if (isBuiltIn(id)) {
      await upsertCategoryOverride(id, data);
    } else {
      await updateCustomCategory(id, data);
    }
    success(`"${data.name}" updated`);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const cat = all.find((c) => c.id === id);
    await deleteCategory(id);
    if (cat) success(`"${cat.name}" deleted`);
    setConfirmDelete(null);
  };

  const handleResetOverride = async (id: string) => {
    await restoreCategory(id);
    success('Reset to default');
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await bulkDeleteCategories(ids);
    success(`Deleted ${ids.length} categor${ids.length === 1 ? 'y' : 'ies'}`);
    setConfirmBulk(false);
    exitSelection();
  };

  const renderRow = (cat: CategoryDef, opts: { isHidden: boolean }) => {
    const editing       = editingId === cat.id;
    const confirming    = confirmDelete === cat.id;
    const overridden    = isOverridden(cat.id);
    const selected      = selectedIds.has(cat.id);

    if (editing) {
      return (
        <CategoryForm
          initial={cat}
          onSave={(data) => handleSaveEdit(cat.id, data)}
          onCancel={() => setEditingId(null)}
        />
      );
    }
    if (confirming) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-expense/30 bg-expense/5 px-4 py-3">
          <span className="flex-1 text-sm text-foreground">
            Delete <span className="font-semibold">"{cat.name}"</span>?
            {isBuiltIn(cat.id) ? ' You can restore it from "Hidden" later.' : ' Transactions keep their category name.'}
          </span>
          <Button size="sm" variant="destructive" onClick={() => handleDelete(cat.id)}>Delete</Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>Keep</Button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => { if (selectionMode) toggleSelect(cat.id); }}
        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors text-left ${
          opts.isHidden
            ? 'border-dashed border-border-base bg-surface/30 opacity-60'
            : selected
              ? 'border-accent bg-accent/10'
              : 'border-border-base bg-surface hover:bg-surface-raised'
        } ${selectionMode ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {selectionMode && (
          <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 shrink-0 ${
            selected ? 'bg-accent border-accent text-accent-fg' : 'border-foreground-subtle'
          }`}>
            {selected ? <Check className="h-3.5 w-3.5" /> : null}
          </span>
        )}

        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${COLOR_CLASSES[cat.color].badge}`}>
          {cat.icon} {cat.name}
        </span>

        {cat.subcategories.length > 0 && (
          <span className="text-xs text-foreground-subtle">
            {cat.subcategories.length} subcategories
          </span>
        )}

        {overridden && !opts.isHidden && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">edited</span>
        )}
        {opts.isHidden && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground-subtle">hidden</span>
        )}
        {!isBuiltIn(cat.id) && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground-subtle">custom</span>
        )}

        <div className="flex-1" />

        {!selectionMode && (
          <>
            {opts.isHidden ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleResetOverride(cat.id); }}
                className="rounded-lg p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
                aria-label={`Restore ${cat.name}`}
                title="Restore"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                {overridden && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResetOverride(cat.id); }}
                    className="rounded-lg p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
                    aria-label={`Reset ${cat.name} to default`}
                    title="Reset to default"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(cat.id); setShowNewForm(false); setConfirmDelete(null); }}
                  className="rounded-lg p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
                  aria-label={`Edit ${cat.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(cat.id); setEditingId(null); }}
                  className="rounded-lg p-1.5 text-foreground-subtle hover:text-expense hover:bg-expense/10 transition-colors"
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </>
        )}
      </button>
    );
  };

  const content = (
    <div className="p-5 space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
          Categories ({visible.length})
        </h3>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <button
                onClick={selectAll}
                className="text-xs text-foreground-muted hover:text-foreground transition-colors"
              >
                Select all
              </button>
              {selectedIds.size > 0 && (
                <Button size="sm" variant="destructive" onClick={() => setConfirmBulk(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete ({selectedIds.size})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={exitSelection}>
                <X className="h-3.5 w-3.5" />
                Done
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => { setSelectionMode(true); setShowNewForm(false); setEditingId(null); }}>
                <CheckSquare className="h-3.5 w-3.5" />
                Select
              </Button>
              {!showNewForm && (
                <Button size="sm" variant="outline" onClick={() => { setShowNewForm(true); setEditingId(null); }}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Bulk-delete confirm ─────────────────────────────────────── */}
      {confirmBulk && (
        <div className="flex items-center gap-3 rounded-xl border border-expense/30 bg-expense/5 px-4 py-3">
          <span className="flex-1 text-sm text-foreground">
            Delete {selectedIds.size} categor{selectedIds.size === 1 ? 'y' : 'ies'}? Built-in ones can be restored later.
          </span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Delete all</Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmBulk(false)}>Cancel</Button>
        </div>
      )}

      {/* ── New-category form ───────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {showNewForm && (
          <CategoryForm
            key="new"
            onSave={handleCreate}
            onCancel={() => setShowNewForm(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Unified list ────────────────────────────────────────────── */}
      <div className="space-y-2">
        {visible.length === 0 && !showNewForm && (
          <div className="rounded-xl border border-dashed border-border-base py-8 text-center">
            <p className="text-sm text-foreground-subtle">No categories.</p>
            <p className="text-xs text-foreground-subtle mt-1">Add one with the New button.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {visible.map((cat) => (
            <motion.div
              key={cat.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, height: 0, overflow: 'hidden' }}
              transition={SECTION_SPRING}
            >
              {renderRow(cat, { isHidden: false })}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Hidden built-ins (collapsible) ──────────────────────────── */}
      {hidden.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold text-foreground-subtle uppercase tracking-wider hover:text-foreground-muted transition-colors py-2"
          >
            <span>Hidden ({hidden.length})</span>
            <motion.div animate={{ rotate: showHidden ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {showHidden && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden space-y-2"
              >
                {hidden.map((cat) => (
                  <div key={cat.id}>{renderRow(cat, { isHidden: true })}</div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories" size="lg">
      {content}
    </Modal>
  );
}
