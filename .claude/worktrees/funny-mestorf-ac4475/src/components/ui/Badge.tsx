import React from 'react';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-700 text-gray-300',
  success: 'bg-green-500/15 text-green-400 border border-green-500/20',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
  warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  info: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20',
  outline: 'border border-gray-700 text-gray-400 bg-transparent',
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
