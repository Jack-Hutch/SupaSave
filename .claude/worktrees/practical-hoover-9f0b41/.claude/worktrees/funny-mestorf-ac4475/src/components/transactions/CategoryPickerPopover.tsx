import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Command } from 'cmdk';
import { Search, Check } from 'lucide-react';
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

const POPOVER_W = 280;

export function CategoryPickerPopover({
  anchorRef,
  isOpen,
  onClose,
  onSelect,
  currentCategory,
  customCategories,
}: CategoryPickerPopoverProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const allCategories = getAllCategories(customCategories);

  // Position the popover beside the anchor each time it opens
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    let top = rect.bottom + 6;

    if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8;
    if (left < 8) left = 8;

    if (top + 360 > vh) {
      top = rect.top - 360 - 6;
      if (top < 8) top = 8;
    }

    setPos({ top, left });
  }, [isOpen, anchorRef]);

  // Outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  // Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [isOpen, onClose]);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />

          <motion.div
            ref={popoverRef}
            className="fixed z-50 overflow-hidden rounded-xl border border-border-base bg-surface shadow-2xl"
            style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] as const }}
          >
            <Command label="Pick category" className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-border-base px-2.5 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
                <Command.Input
                  autoFocus
                  placeholder="Search categories…"
                  className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-foreground-subtle"
                />
              </div>
              <Command.List className="max-h-72 overflow-y-auto p-1">
                <Command.Empty className="px-3 py-6 text-center text-xs text-foreground-subtle">
                  No categories match
                </Command.Empty>
                {allCategories.map((cat) => {
                  const cls = COLOR_CLASSES[cat.color];
                  const isActive = cat.name === currentCategory;
                  return (
                    <Command.Item
                      key={cat.id}
                      value={cat.name}
                      onSelect={() => {
                        onSelect(cat.name);
                        onClose();
                      }}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors aria-selected:bg-surface-raised data-[selected=true]:bg-surface-raised ${
                        isActive ? cls.badge : 'text-foreground-muted'
                      }`}
                    >
                      <span className="text-sm leading-none shrink-0">{cat.icon}</span>
                      <span className="flex-1 truncate">{cat.name}</span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </Command.Item>
                  );
                })}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
