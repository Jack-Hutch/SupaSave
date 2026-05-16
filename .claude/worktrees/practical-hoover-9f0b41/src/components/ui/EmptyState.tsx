import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="mb-4 rounded-full bg-surface-raised p-4 text-foreground-subtle">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-foreground-subtle max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          <Button onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
