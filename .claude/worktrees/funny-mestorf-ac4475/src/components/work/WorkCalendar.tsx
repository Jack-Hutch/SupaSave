import React, { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import 'react-day-picker/dist/style.css';
import type { WorkShift } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface WorkCalendarProps {
  shifts: WorkShift[];
  currency: string;
  onSelectDate: (isoDate: string) => void;
}

export function WorkCalendar({
  shifts,
  currency,
  onSelectDate,
}: WorkCalendarProps): React.ReactElement {
  const shiftDays = useMemo(() => {
    return shifts
      .map((s) => {
        try {
          const d = parseISO(s.date);
          return isNaN(d.getTime()) ? null : d;
        } catch {
          return null;
        }
      })
      .filter((d): d is Date => d !== null);
  }, [shifts]);

  const paidDays = useMemo(
    () => shiftDays.filter((_d, i) => shifts[i]?.is_paid),
    [shiftDays, shifts]
  );
  const unpaidDays = useMemo(
    () => shiftDays.filter((_d, i) => !shifts[i]?.is_paid),
    [shiftDays, shifts]
  );

  const monthTotal = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return shifts
      .filter((s) => s.date.startsWith(prefix))
      .reduce((sum, s) => sum + s.pay_owed, 0);
  }, [shifts]);

  return (
    <div className="rounded-2xl border border-border-base bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Calendar</h2>
        <span className="text-xs text-foreground-muted">
          This month: <span className="font-semibold text-foreground">{formatCurrency(monthTotal, currency)}</span>
        </span>
      </div>
      <DayPicker
        mode="single"
        showOutsideDays
        modifiers={{
          paidShift: paidDays,
          unpaidShift: unpaidDays,
        }}
        modifiersClassNames={{
          paidShift: 'rdp-paid',
          unpaidShift: 'rdp-unpaid',
        }}
        onSelect={(d) => {
          if (!d) return;
          onSelectDate(format(d, 'yyyy-MM-dd'));
        }}
        classNames={{
          root: 'text-foreground text-sm',
          months: 'flex justify-center',
          month_caption: 'flex justify-center py-1 mb-1 font-medium text-foreground',
          caption_label: 'text-sm text-foreground',
          nav: 'flex items-center gap-1 absolute right-2 top-1',
          button_previous:
            'h-7 w-7 rounded-md hover:bg-surface-hover text-foreground-muted',
          button_next:
            'h-7 w-7 rounded-md hover:bg-surface-hover text-foreground-muted',
          weekday:
            'text-[10px] font-medium uppercase text-foreground-subtle py-1 w-9',
          day: 'relative h-9 w-9 text-center align-middle text-sm',
          day_button:
            'h-9 w-9 rounded-md text-foreground hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors',
          today: 'font-semibold text-accent',
          outside: 'text-foreground-subtle/40',
        }}
      />
      <style>{`
        .rdp-paid > button::after,
        .rdp-unpaid > button::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 9999px;
        }
        .rdp-paid > button::after { background: rgb(52 211 153); }
        .rdp-unpaid > button::after { background: rgb(var(--accent)); }
      `}</style>
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-foreground-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Unpaid shift
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgb(52 211 153)' }} /> Paid shift
        </span>
      </div>
    </div>
  );
}
