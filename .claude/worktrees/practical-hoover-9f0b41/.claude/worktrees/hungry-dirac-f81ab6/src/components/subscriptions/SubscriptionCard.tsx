import React from 'react';
import { Pencil, Trash2, Bell, BellOff } from 'lucide-react';
import type { Membership } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { toMonthlyEquivalent, getBillingCycleLabel, getRenewalHint } from '../../utils/subscriptionUtils';
import { Badge } from '../ui/Badge';

interface SubscriptionCardProps {
  membership: Membership;
  onEdit: (m: Membership) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

export function SubscriptionCard({
  membership,
  onEdit,
  onDelete,
  currency = 'AUD',
}: SubscriptionCardProps) {
  const monthly = toMonthlyEquivalent(membership.cost, membership.billing_cycle);
  const renewalHint = getRenewalHint(membership.next_billing_date);
  const isDueSoon = renewalHint === 'Today' || renewalHint === 'Tomorrow';

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-3 hover:border-gray-700 transition-colors">
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-lg select-none">
        {membership.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-200 truncate">{membership.name}</p>
          {membership.cancel_reminder && (
            <Bell className="h-3 w-3 text-yellow-400 shrink-0" aria-label="Cancel reminder set" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={isDueSoon ? 'warning' : 'outline'} className="text-[10px] py-0">
            {renewalHint}
          </Badge>
          <span className="text-[11px] text-gray-500">
            {getBillingCycleLabel(membership.billing_cycle)}
          </span>
        </div>
      </div>

      {/* Amounts */}
      <div className="text-right shrink-0">
        <p className="font-mono text-sm font-semibold text-gray-200">
          {formatCurrency(membership.cost, currency)}
        </p>
        {membership.billing_cycle !== 'monthly' && (
          <p className="text-[11px] text-gray-500 font-mono">
            {formatCurrency(monthly, currency)}/mo
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(membership)}
          className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
          aria-label="Edit subscription"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(membership.id)}
          className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
          aria-label="Delete subscription"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
