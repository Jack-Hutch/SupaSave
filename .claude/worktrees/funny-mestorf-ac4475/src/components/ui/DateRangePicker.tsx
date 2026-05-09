import React, { useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import * as Popover from '@radix-ui/react-popover';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { cn } from '../../lib/utils';

export interface DateRangePickerProps {
  /** ISO yyyy-MM-dd */
  from?: string;
  to?: string;
  onChange: (range: { from: string; to: string }) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

function toDate(s?: string): Date | undefined {
  if (!s) return undefined;
  try {
    const d = parseISO(s);
    if (isNaN(d.getTime())) return undefined;
    return d;
  } catch {
    return undefined;
  }
}

function toIso(d?: Date): string {
  return d ? format(d, 'yyyy-MM-dd') : '';
}

export function DateRangePicker({
  from,
  to,
  onChange,
  label,
  placeholder = 'Pick a date range',
  className,
}: DateRangePickerProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  const range: DateRange | undefined = (() => {
    const f = toDate(from);
    const t = toDate(to);
    if (!f && !t) return undefined;
    return { from: f, to: t };
  })();

  const display = (() => {
    if (!from && !to) return placeholder;
    if (from && !to) return `From ${format(toDate(from)!, 'd MMM yyyy')}`;
    if (!from && to) return `Until ${format(toDate(to)!, 'd MMM yyyy')}`;
    return `${format(toDate(from)!, 'd MMM')} – ${format(toDate(to)!, 'd MMM yyyy')}`;
  })();

  const hasValue = !!from || !!to;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-medium text-foreground-muted">{label}</label>
      )}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border border-border-base bg-surface px-3 py-2 text-sm text-left',
              'hover:bg-surface-hover transition-colors',
              !hasValue && 'text-foreground-subtle',
              hasValue && 'text-foreground'
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-foreground-muted" />
            <span className="flex-1 truncate">{display}</span>
            {hasValue && (
              <span
                role="button"
                aria-label="Clear date range"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ from: '', to: '' });
                }}
                className="rounded p-0.5 text-foreground-subtle hover:text-foreground hover:bg-surface-raised"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 rounded-xl border border-border-base bg-surface p-3 shadow-float"
          >
            <DayPicker
              mode="range"
              numberOfMonths={1}
              selected={range}
              onSelect={(r) => {
                onChange({ from: toIso(r?.from), to: toIso(r?.to) });
                if (r?.from && r?.to) setOpen(false);
              }}
              classNames={{
                root: 'text-foreground text-sm',
                month_caption: 'flex justify-center py-1 mb-1 font-medium',
                caption_label: 'text-sm text-foreground',
                nav: 'flex items-center gap-1',
                button_previous:
                  'h-7 w-7 rounded-md hover:bg-surface-hover text-foreground-muted',
                button_next:
                  'h-7 w-7 rounded-md hover:bg-surface-hover text-foreground-muted',
                weekday: 'text-[10px] font-medium uppercase text-foreground-subtle py-1 w-8',
                day: 'h-8 w-8 text-center align-middle text-sm',
                day_button:
                  'h-8 w-8 rounded-md text-foreground hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors',
                today: 'font-semibold text-accent',
                selected: '!bg-accent/20 !text-accent',
                range_start: '!bg-accent !text-accent-fg rounded-l-md',
                range_end: '!bg-accent !text-accent-fg rounded-r-md',
                range_middle: '!bg-accent/15 !text-accent !rounded-none',
                outside: 'text-foreground-subtle/40',
                disabled: 'text-foreground-subtle/40 line-through',
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
