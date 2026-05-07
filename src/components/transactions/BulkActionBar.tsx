import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, FolderOpen, Repeat, ChevronUp } from 'lucide-react';
import type { Membership, CategoryDef } from '../../types';
import { getAllCategories, COLOR_CLASSES } from '../../lib/categories';

interface BulkActionBarProps {
  selectedCount: number;
  memberships: Membership[];
  customCategories?: CategoryDef[];
  onCancel: () => void;
  onAssignCategory: (category: string) => Promise<void> | void;
  onLinkSubscription: (membershipId: string) => Promise<void> | void;
  onAddTag: (tag: string) => Promise<void> | void;
}

type Sheet = 'category' | 'subscription' | 'tag' | null;

const TWEEN = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const };

export function BulkActionBar({
  selectedCount,
  memberships,
  customCategories,
  onCancel,
  onAssignCategory,
  onLinkSubscription,
  onAddTag,
}: BulkActionBarProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [tagInput, setTagInput] = useState('');
  const [working, setWorking] = useState(false);
  const allCategories = getAllCategories(customCategories);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sheet === 'tag') setTimeout(() => tagInputRef.current?.focus(), 80);
  }, [sheet]);

  async function withClose(fn: () => Promise<void> | void) {
    setWorking(true);
    try { await fn(); setSheet(null); }
    finally { setWorking(false); }
  }

  // Close sheet on Escape
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const bar = (
    <>
      {/* Selection bar — slides up from bottom */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={TWEEN}
        className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
      >
        <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl px-2 py-1.5 backdrop-blur-md">
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
            aria-label="Cancel selection"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-[var(--foreground)] px-1.5 min-w-[60px]">
            {selectedCount} selected
          </span>
          <div className="h-5 w-px bg-[var(--border)]" />
          <ActionButton
            label="Category"
            icon={<FolderOpen className="w-3.5 h-3.5" />}
            onClick={() => setSheet('category')}
            disabled={selectedCount === 0}
          />
          <ActionButton
            label="Subscription"
            icon={<Repeat className="w-3.5 h-3.5" />}
            onClick={() => setSheet('subscription')}
            disabled={selectedCount === 0 || memberships.length === 0}
          />
          <ActionButton
            label="Tag"
            icon={<Tag className="w-3.5 h-3.5" />}
            onClick={() => setSheet('tag')}
            disabled={selectedCount === 0}
          />
        </div>
      </motion.div>

      {/* Action sheet — appears above the bar */}
      <AnimatePresence>
        {sheet && (
          <>
            {/* Click-away overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => !working && setSheet(null)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={TWEEN}
              className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
              style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 140px)' }}
            >
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    {sheet === 'category' && `Set category for ${selectedCount}`}
                    {sheet === 'subscription' && `Link ${selectedCount} to subscription`}
                    {sheet === 'tag' && `Add tag to ${selectedCount}`}
                  </h3>
                  <button onClick={() => setSheet(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                    <ChevronUp className="w-4 h-4 rotate-180" />
                  </button>
                </div>

                {sheet === 'category' && (
                  <div className="max-h-[50vh] overflow-y-auto p-2 grid grid-cols-2 gap-1.5">
                    {allCategories.map((cat) => {
                      const cls = COLOR_CLASSES[cat.color];
                      return (
                        <button
                          key={cat.id}
                          disabled={working}
                          onClick={() => withClose(() => onAssignCategory(cat.name))}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold text-left transition-colors hover:ring-2 hover:ring-current/20 disabled:opacity-50 ${cls.badge}`}
                        >
                          <span>{cat.icon}</span>
                          <span className="truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {sheet === 'subscription' && (
                  <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
                    {memberships.length === 0 ? (
                      <p className="text-xs text-[var(--muted)] text-center py-6">No subscriptions yet</p>
                    ) : (
                      memberships.map((m) => (
                        <button
                          key={m.id}
                          disabled={working}
                          onClick={() => withClose(() => onLinkSubscription(m.id))}
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                        >
                          <span className="text-lg">{m.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{m.name}</p>
                            <p className="text-xs text-[var(--muted)]">${m.cost.toFixed(2)} / {m.billing_cycle}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {sheet === 'tag' && (
                  <div className="p-3 space-y-3">
                    <input
                      ref={tagInputRef}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="e.g. business, refund, holiday"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          withClose(() => onAddTag(tagInput.trim()));
                          setTagInput('');
                        }
                      }}
                    />
                    <button
                      disabled={working || !tagInput.trim()}
                      onClick={() => { withClose(() => onAddTag(tagInput.trim())); setTagInput(''); }}
                      className="w-full rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ background: 'var(--accent)' }}
                    >
                      Apply tag
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(bar, document.body);
}

function ActionButton({ label, icon, onClick, disabled }: {
  label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
