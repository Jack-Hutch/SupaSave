import React from 'react';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-raised text-foreground-muted',
  success: 'bg-income/12 text-income border border-income/20',
  danger:  'bg-expense/12 text-expense border border-expense/20',
  warning: 'bg-warn/12 text-warn border border-warn/20',
  info:    'bg-accent/12 text-accent border border-accent/20',
  outline: 'border border-border-base text-foreground-muted bg-transparent',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
