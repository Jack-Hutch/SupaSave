import React from 'react';
import type { Membership } from '../../types';
import { SubscriptionCard } from './SubscriptionCard';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/utils';
import {
  groupByCategory,
  categoryMonthlyTotal,
  totalMonthlyEquivalent,
} from '../../utils/subscriptionUtils';
import { CreditCard, Plus } from 'lucide-react';

interface SubscriptionListProps {
  memberships: Membership[];
  onAdd: () => void;
  onEdit: (m: Membership) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

export function SubscriptionList({
  memberships,
  onAdd,
  onEdit,
  onDelete,
  currency = 'AUD',
}: SubscriptionListProps) {
  if (memberships.length === 0) {
    return (
      <EmptyState
        icon={<CreditCard className="h-6 w-6" />}
        title="No subscriptions yet"
        description="Track your recurring payments and memberships to see where your money goes."
        action={{ label: 'Add Subscription', onClick: onAdd }}
      />
    );
  }

  const grouped = groupByCategory(memberships);
  const grandTotal = totalMonthlyEquivalent(memberships);

  return (
    <div className="space-y-5">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {memberships.length} active subscription{memberships.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={onAdd} variant="outline">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Grouped by category */}
      {Object.entries(grouped).map(([category, items]) => {
        const categoryTotal = categoryMonthlyTotal(items);
        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {category}
              </h3>
              <span className="text-xs font-mono text-gray-500">
                {formatCurrency(categoryTotal, currency)}/mo
              </span>
            </div>
            <div className="space-y-2">
              {items.map((m) => (
                <SubscriptionCard
                  key={m.id}
                  membership={m}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  currency={currency}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Grand total */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">Total Monthly</p>
          <p className="text-lg font-mono font-bold text-indigo-400">
            {formatCurrency(grandTotal, currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Yearly equivalent</p>
          <p className="text-sm font-mono text-gray-300">
            {formatCurrency(grandTotal * 12, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
