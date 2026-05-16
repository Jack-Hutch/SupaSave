import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, CalendarPlus, Check, Briefcase } from 'lucide-react';
import type { Transaction, CategoryDef, WorkShift } from '../../types';
import { getCategoryBadgeClass, getCategoryDef } from '../../lib/categories';
import { formatCurrency, formatRelativeDate } from '../../lib/utils';
import { CategoryPickerPopover } from './CategoryPickerPopover';
import { ShiftPickerPopover } from './ShiftPickerPopover';
import { isLinkedToSubscription } from '../../utils/subscriptionUtils';
import { isLinkedToShift, getShiftLinkId } from '../../utils/shiftUtils';

interface TransactionItemProps {
  transaction:           Transaction;
  onEdit?:               (tx: Transaction) => void;
  onDelete?:             (id: string) => void;
  onCategoryChange?:     (txId: string, category: string) => void;
  onAddToSubscription?:  (tx: Transaction) => void;
  currency?:             string;
  index?:                number;
  customCategories?:     CategoryDef[];
  selectionMode?:        boolean;
  selected?:             boolean;
  onToggleSelect?:       (txId: string) => void;
  /** Pool of unpaid completed shifts; if provided, shows a "link to shift" action on income tx */
  unpaidShifts?:         WorkShift[];
  onLinkToShift?:        (txId: string, shiftId: string) => void;
}

// Row entrance — slides up + fades in
const rowVariants = {
  hidden: { opacity: 0, y: 7 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.26, ease: [0.32, 0.72, 0, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
};

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  onCategoryChange,
  onAddToSubscription,
  currency = 'AUD',
  index: _index,
  customCategories,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  unpaidShifts,
  onLinkToShift,
}: TransactionItemProps) {
  const [hovered,    setHovered]    = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [shiftPickerOpen, setShiftPickerOpen] = React.useState(false);
  const badgeRef = React.useRef<HTMLButtonElement>(null);
  const shiftBtnRef = React.useRef<HTMLButtonElement>(null);

  // Touch devices never fire hover, so action buttons are always visible
  const alwaysShowActions = React.useMemo(
    () => window.matchMedia('(hover: none)').matches,
    [],
  );

  const isIncome  = transaction.is_income;
  const amountCls = isIncome ? 'text-income' : 'text-expense';
  const sign      = isIncome ? '+' : '-';

  const catDef         = getCategoryDef(transaction.category, customCategories);
  const badgeCls       = getCategoryBadgeClass(transaction.category, customCategories);
  const catIcon        = catDef?.icon ?? '';
  const isSubscription = isLinkedToSubscription(transaction.tags);
  const linkedShiftId  = getShiftLinkId(transaction.tags);
  const hasShiftLink   = isLinkedToShift(transaction.tags);

  const hasActions = !!(onEdit || onDelete || onAddToSubscription || (onLinkToShift && transaction.is_income));

  const handleRowClick = () => {
    if (selectionMode && onToggleSelect) onToggleSelect(transaction.id);
  };

  return (
    // Single root element — CategoryPickerPopover portals to document.body so
    // it doesn't sit inside this motion.div, avoiding layout/AnimatePresence issues.
    <motion.div
      variants={rowVariants}
      layout
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={handleRowClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        selectionMode
          ? 'cursor-pointer ' + (selected ? 'bg-accent/10' : 'hover:bg-surface-raised')
          : 'cursor-default hover:bg-surface-raised'
      }`}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Avatar / checkbox */}
      <motion.div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full select-none overflow-hidden text-sm font-semibold ${
          selectionMode && selected
            ? 'bg-accent text-accent-fg'
            : 'bg-surface-raised text-foreground-muted'
        }`}
        animate={{ scale: hovered && !selectionMode ? 1.06 : 1 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        style={{ willChange: 'transform' }}
      >
        {selectionMode ? (
          selected ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="block w-4 h-4 rounded-full border-2 border-foreground-subtle" />
          )
        ) : transaction.merchant_logo ? (
          <img
            src={transaction.merchant_logo}
            alt={transaction.merchant_name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          (transaction.merchant_name || transaction.description)
            .charAt(0)
            .toUpperCase()
        )}
      </motion.div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {transaction.merchant_name || transaction.description}
          </p>
          {transaction.is_round_up && (
            <span className="text-[10px] text-foreground-subtle bg-surface-raised rounded-full px-1.5 py-0.5 shrink-0">
              round-up
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {/* Clickable category badge — opens inline picker (disabled in selection mode) */}
          <button
            ref={badgeRef}
            onClick={(e) => {
              if (selectionMode) return;
              e.stopPropagation();
              if (onCategoryChange) setPickerOpen((v) => !v);
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeCls} ${
              onCategoryChange
                ? 'cursor-pointer hover:ring-1 hover:ring-current/30 transition-shadow active:scale-95'
                : 'cursor-default'
            }`}
            aria-label={onCategoryChange ? `Change category (currently ${transaction.category})` : transaction.category}
            aria-expanded={pickerOpen}
            aria-haspopup={onCategoryChange ? 'listbox' : undefined}
          >
            {catIcon && <span>{catIcon}</span>}
            {transaction.category}
          </button>

          {isSubscription && (
            <span
              className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
              title="Linked to a subscription"
            >
              🔁
            </span>
          )}
          {hasShiftLink && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"
              title="Linked to a shift"
            >
              <Briefcase className="h-2.5 w-2.5" />
              shift
            </span>
          )}
          <span className="text-[11px] text-foreground-subtle">
            {formatRelativeDate(transaction.date)}
          </span>
          {transaction.notes && (
            <span className="text-[11px] text-foreground-subtle truncate max-w-[120px]">
              · {transaction.notes}
            </span>
          )}
        </div>
      </div>

      {/* Amount + action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <motion.span
          className={`font-mono text-sm font-semibold tabular-nums ${amountCls}`}
          animate={{ opacity: hovered ? 0.75 : 1 }}
          transition={{ duration: 0.18 }}
        >
          {sign}{formatCurrency(Math.abs(transaction.amount), currency)}
        </motion.span>

        {/* Action buttons — hidden in selection mode */}
        {hasActions && !selectionMode && (
          <div
            className={`flex items-center gap-1 transition-opacity duration-150 ${
              alwaysShowActions || hovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {onEdit && (
              <motion.button
                onClick={() => onEdit(transaction)}
                whileTap={{ scale: 0.88 }}
                className="rounded p-1 text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
                aria-label="Edit transaction"
              >
                <Pencil className="h-3.5 w-3.5" />
              </motion.button>
            )}
            {onAddToSubscription && !transaction.is_income && (
              <motion.button
                onClick={() => onAddToSubscription(transaction)}
                whileTap={{ scale: 0.88 }}
                className="rounded p-1 text-foreground-subtle hover:text-accent hover:bg-accent/10 transition-colors"
                aria-label="Add to subscriptions"
                title="Add as subscription"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
              </motion.button>
            )}
            {onLinkToShift && transaction.is_income && !linkedShiftId && (
              <motion.button
                ref={shiftBtnRef}
                onClick={(e) => { e.stopPropagation(); setShiftPickerOpen((v) => !v); }}
                whileTap={{ scale: 0.88 }}
                className="rounded p-1 text-foreground-subtle hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                aria-label="Link to shift"
                title="Link to a logged shift"
              >
                <Briefcase className="h-3.5 w-3.5" />
              </motion.button>
            )}
            {onDelete && (
              <motion.button
                onClick={() => onDelete(transaction.id)}
                whileTap={{ scale: 0.88 }}
                className="rounded p-1 text-foreground-subtle hover:text-expense hover:bg-expense/10 transition-colors"
                aria-label="Delete transaction"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Category picker — portals to document.body, so this motion.div stays single-root */}
      {onCategoryChange && (
        <CategoryPickerPopover
          anchorRef={badgeRef}
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(cat) => onCategoryChange(transaction.id, cat)}
          currentCategory={transaction.category}
          customCategories={customCategories}
        />
      )}

      {/* Shift picker — opens from the briefcase action button */}
      {onLinkToShift && unpaidShifts && (
        <ShiftPickerPopover
          anchorRef={shiftBtnRef}
          isOpen={shiftPickerOpen}
          onClose={() => setShiftPickerOpen(false)}
          shifts={unpaidShifts}
          onSelect={(shiftId) => { onLinkToShift(transaction.id, shiftId); setShiftPickerOpen(false); }}
          currency={currency}
        />
      )}
    </motion.div>
  );
}
