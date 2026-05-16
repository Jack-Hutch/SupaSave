import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  subMonths,
  subWeeks,
  subYears,
  isValid,
  differenceInDays,
  isSameMonth,
  isSameYear,
} from 'date-fns';

export function safeParseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

export function formatDisplayDate(dateStr: string): string {
  const date = safeParseDate(dateStr);
  if (!date) return 'Invalid date';
  return format(date, 'dd MMM yyyy');
}

export function formatShortDate(dateStr: string): string {
  const date = safeParseDate(dateStr);
  if (!date) return 'Invalid date';
  return format(date, 'dd MMM');
}

export function formatMonthYear(dateStr: string): string {
  const date = safeParseDate(dateStr);
  if (!date) return 'Invalid date';
  return format(date, 'MMM yyyy');
}

export function formatISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getDateRangeForPeriod(period: 'week' | 'month' | 'year', offset = 0): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  switch (period) {
    case 'week': {
      const base = offset === 0 ? now : subWeeks(now, Math.abs(offset));
      return { from: startOfWeek(base, { weekStartsOn: 1 }), to: endOfWeek(base, { weekStartsOn: 1 }) };
    }
    case 'month': {
      const base = offset === 0 ? now : subMonths(now, Math.abs(offset));
      return { from: startOfMonth(base), to: endOfMonth(base) };
    }
    case 'year': {
      const base = offset === 0 ? now : subYears(now, Math.abs(offset));
      return { from: startOfYear(base), to: endOfYear(base) };
    }
  }
}

export function getDaysUntil(dateStr: string): number {
  const date = safeParseDate(dateStr);
  if (!date) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(date, today);
}

export function isSameMonthYear(dateStr1: string, dateStr2: string): boolean {
  const d1 = safeParseDate(dateStr1);
  const d2 = safeParseDate(dateStr2);
  if (!d1 || !d2) return false;
  return isSameMonth(d1, d2) && isSameYear(d1, d2);
}

export function getMonthKey(dateStr: string): string {
  const date = safeParseDate(dateStr);
  if (!date) return 'unknown';
  return format(date, 'yyyy-MM');
}

export function getMonthLabel(monthKey: string): string {
  try {
    const date = parseISO(monthKey + '-01');
    return format(date, 'MMM yyyy');
  } catch {
    return monthKey;
  }
}

export function getLast12Months(): string[] {
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), 'yyyy-MM'));
  }
  return months;
}
