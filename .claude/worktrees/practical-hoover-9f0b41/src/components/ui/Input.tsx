import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground-muted"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foreground-subtle">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={[
            'w-full rounded-lg border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder-foreground-subtle transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-expense focus:ring-expense'
              : 'border-border-base hover:border-foreground-subtle',
            leftIcon ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-3 flex items-center text-foreground-subtle">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-expense">{error}</p>}
      {hint && !error && <p className="text-xs text-foreground-subtle">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = '', id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground-muted">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={[
          'w-full rounded-lg border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder-foreground-subtle transition-colors resize-none',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          error ? 'border-expense' : 'border-border-base hover:border-foreground-subtle',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-expense">{error}</p>}
      {hint && !error && <p className="text-xs text-foreground-subtle">{hint}</p>}
    </div>
  );
}
