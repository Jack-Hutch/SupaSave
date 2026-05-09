/**
 * localStorage fallback for work_shifts when the Supabase table is missing
 * or the user hasn't run the migrations. Keyed per-user so multi-account on
 * the same device stays isolated.
 */
import type { WorkShift } from '../types';

const PREFIX = 'supasave.work_shifts.';

function key(userId: string): string {
  return PREFIX + userId;
}

export function readLocalShifts(userId: string): WorkShift[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as WorkShift[] : [];
  } catch {
    return [];
  }
}

export function writeLocalShifts(userId: string, shifts: WorkShift[]): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key(userId), JSON.stringify(shifts));
  } catch {
    /* quota or storage disabled — silent */
  }
}

export function clearLocalShifts(userId: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key(userId));
  } catch {
    /* silent */
  }
}
