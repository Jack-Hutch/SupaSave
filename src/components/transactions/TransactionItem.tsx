import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, CalendarPlus } from 'lucide-react';
import type { Transaction, CategoryDef } from '../../types';
import { getCategoryBadgeClass, getCategoryDef } from '../../lib/categories';
import { formatCurrency, formatRelativeDate } from '../../lib/utils';
import { CategoryPickerPopover } from './CategoryPickerPopover';
import { isLinkedToSubscription } from '../../utils/subscriptionUtils';

// Deterministic color palettes for merchant avatars based on first letter
const AVATAR_PALETTES = [
  { bg: '#1f3a5f', fg: '#6cb6ff' }, // blue
  { bg: '#3a2a4d', fg: '#c692ff' }, // purple
  { bg: '#2a4a3e', fg: '#4ade80' }, // green
  { bg: '#4a3a22', fg: '#f5b461' }, // amber
  { bg: '#28403b', fg: '#6ce5d0' }, // teal
  { bg: '#4a2c38', fg: '#ff8fb1' }, // pink
  { bg: '#3a3a3a', fg: '#cfd1d6' }, // neutral
  { bg: '#2e3a24', fg: '#b6e36b' }, // lime
];

function getMerchantPalette(name: string): { bg: string; fg: string } {
  const code = name.toUpperCase().charCodeAt(0) || 65;
  return AVATAR_PALETTES[(code - 65) % AVATAR_PALETTES.length];
}

function getMerchantBg(name: string): string { return getMerchantPalette(name).bg; }
function getMerchantFg(name: string): string { return getMerchantPalette(name).fg; }

interface TransactionItemProps {
  transaction:           Transaction;
  onEdit?:               (tx: Transaction) => void;
  onDelete?:             (id: string) => void;
  onCategoryChange?:     (txId: string, category: string) => void;
  onAddToSubscription?:  (tx: Transaction) => void;
  currency?:             string;
  index?:                number;
  customCategories?:     CategoryDef[];
  /** Selection mode — shows a checkbox on the left */
  selectable?:           boolean;
  selected?:             boolean;
  onSelect?:             () => void;
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

export const TransactionItem = React.memo(function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  onCategoryChange,
  onAddToSubscription,
  currency = 'AUD',
  index: _index,
  customCategories,
  selectable,
  selected,
  onSelect,
}: TransactionItemProps) {
  const [hovered,    setHovered]    = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const badgeRef = React.useRef<HTMLButtonElement>(null);

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

  const hasActions = !!(onEdit || onDelete || onAddToSubscription);

  return (
    <motion.div
      variants={rowVariants}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-default transition-colors hover:bg-surface-raised"
      style={{
        background: selected ? 'var(--accent-soft)' : undefined,
      }}
    >
      {/* Checkbox — only shown in selection mode */}
      {selectable && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 shrink-0 rounded-[3px] cursor-pointer"
          style={{ accentColor: 'rgb(var(--accent))' }}
          aria-label="Select transaction"
        />
      )}
      {/* Avatar / merchant initial — colored circle matching category */}
      <motion.div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono font-semibold text-[13px] select-none overflow-hidden"
        style={{
          background: isIncome
            ? 'rgba(74,222,128,0.16)'
            : getMerchantBg(transaction.merchant_name || transaction.description),
          color: isIncome ? 'rgb(var(--income))' : getMerchantFg(transaction.merchant_name || transaction.description),
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        animate={{ scale: hovered ? 1.06 : 1 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      >
        {transaction.merchant_logo ? (
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
          {/* Clickable category badge — opens inline picker */}
          <button
            ref={badgeRef}
            onClick={() => onCategoryChange && setPickerOpen((v) => !v)}
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

        {/* Action buttons — always visible on touch, hover-reveal on desktop */}
        {hasActions && (
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
    </motion.div>
  );
});
