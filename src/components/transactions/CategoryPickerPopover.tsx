import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { getAllCategories, COLOR_CLASSES } from '../../lib/categories';
import type { CategoryDef } from '../../types';

interface CategoryPickerPopoverProps {
  /** The badge button element the popover anchors to */
  anchorRef: React.RefObject<HTMLButtonElement>;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (categoryName: string) => void;
  currentCategory: string;
  customCategories?: CategoryDef[];
}

const POPOVER_W = 256;

export function CategoryPickerPopover({
  anchorRef,
  isOpen,
  onClose,
  onSelect,
  currentCategory,
  customCategories,
}: CategoryPickerPopoverProps) {
  const [search, setSearch]   = useState('');
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const popoverRef            = useRef<HTMLDivElement>(null);
  const searchRef             = useRef<HTMLInputElement>(null);
  const allCategories         = getAllCategories(customCategories);

  const filtered = allCategories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Recompute position each time the popover opens
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    setSearch('');

    const rect = anchorRef.current.getBoundingClientRect();
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;

    let left = rect.left;
    let top  = rect.bottom + 6;

    if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8;
    if (left < 8) left = 8;

    // Flip above when not enough room below
    if (top + 340 > vh) {
      top = rect.top - 340 - 6;
      if (top < 8) top = 8;
    }

    setPos({ top, left });
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [isOpen, anchorRef]);

  // Close on outside click (excluding the anchor itself)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current  && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [isOpen, onClose]);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible full-screen layer — closes on outside tap (mobile-safe) */}
          <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />

          <motion.div
            ref={popoverRef}
            className="fixed z-50 overflow-hidden rounded-xl border border-border-base bg-surface shadow-2xl"
            style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Search */}
            <div className="border-b border-border-base p-2">
              <div className="flex items-center gap-2 rounded-lg bg-surface-raised px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
                <input
                  ref={searchRef}
                  className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-foreground-subtle"
                  placeholder="Search categories…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-foreground-subtle hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Category grid */}
            <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto p-1.5">
              {filtered.map((cat) => {
                const cls      = COLOR_CLASSES[cat.color];
                const isActive = cat.name === currentCategory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { onSelect(cat.name); onClose(); }}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                      isActive
                        ? `${cls.badge} ring-1 ring-current/25`
                        : 'text-foreground-muted hover:bg-surface-raised'
                    }`}
                  >
                    <span className="text-sm leading-none">{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-2 py-6 text-center text-xs text-foreground-subtle">
                  No categories match
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Portal to document.body — the popover is completely outside the row's DOM tree,
  // so it can't interfere with layout animations, group headers, or scroll containers.
  return createPortal(content, document.body);
}
