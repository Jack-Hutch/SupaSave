import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, X } from 'lucide-react';
import type { WorkShift } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface ShiftPickerPopoverProps {
  anchorRef: React.RefObject<HTMLElement>;
  isOpen: boolean;
  onClose: () => void;
  /** Pool of shifts to show — caller filters/sorts (typically: unpaid completed) */
  shifts: WorkShift[];
  onSelect: (shiftId: string) => void;
  currency?: string;
}

const POPOVER_W = 280;

export function ShiftPickerPopover({
  anchorRef, isOpen, onClose, shifts, onSelect, currency = 'AUD',
}: ShiftPickerPopoverProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8;
    if (top + 320 > vh - 8) top = rect.top - 320 - 6;
    setPos({ top: Math.max(8, top), left: Math.max(8, left) });
  }, [isOpen, anchorRef]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(t) && anchorRef.current && !anchorRef.current.contains(t)) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [isOpen, onClose, anchorRef]);

  function fmtDate(d: string): string {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  const popover = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] as const }}
          className="fixed z-50 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: POPOVER_W }}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <p className="text-xs font-semibold text-[var(--foreground)]">Link to shift</p>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {shifts.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Briefcase className="mx-auto mb-2 h-6 w-6 text-[var(--muted)] opacity-50" />
                <p className="text-xs text-[var(--muted)]">No unpaid shifts</p>
                <p className="text-[10px] text-[var(--muted)] mt-1">Log a shift on the Income page first.</p>
              </div>
            ) : shifts.map((shift) => (
              <button
                key={shift.id}
                onClick={() => onSelect(shift.id)}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[var(--surface)] transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5 flex-shrink-0 text-[var(--muted)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--foreground)] truncate">
                    {shift.source_label ?? 'Shift'} · {fmtDate(shift.date)}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {shift.hours_worked > 0 && `${shift.hours_worked}h · `}
                    {formatCurrency(shift.pay_owed, currency)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(popover, document.body);
}
