/**
 * Up Bank Personal Access Token storage.
 *
 * Persisted to localStorage so it survives refreshes. Trade-off: any XSS
 * on the app could read it. Accepted for UX — users requested not having
 * to re-enter the token every refresh.
 *
 * Dev fallback: VITE_UP_API_TOKEN is used when no stored token is present.
 */

const STORAGE_KEY = 'supasave.up_pat';

export function validateUpToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.length < 10) return false;
  if (['your-up-token-here', 'VITE_UP_API_TOKEN', 'undefined', 'null'].includes(trimmed)) return false;
  return true;
}

function readFromStorage(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && validateUpToken(v) ? v : null;
  } catch {
    return null;
  }
}

function writeToStorage(token: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage may be disabled or full — silent fail is fine */
  }
}

let _upToken: string | null = readFromStorage();

export function setUpToken(token: string): void {
  if (!validateUpToken(token)) {
    throw new Error('Invalid Up Bank token. Please provide a valid Personal Access Token.');
  }
  _upToken = token.trim();
  writeToStorage(_upToken);
}

export function clearUpToken(): void {
  _upToken = null;
  writeToStorage(null);
}

export function getUpToken(): string {
  const t = getUpTokenIfConfigured();
  if (t) return t;
  throw new Error('Up Bank token is not configured. Please connect your Up Bank account first.');
}

export function getUpTokenIfConfigured(): string | null {
  if (_upToken) return _upToken;
  if (import.meta.env.DEV) {
    const envToken = import.meta.env.VITE_UP_API_TOKEN;
    if (envToken && validateUpToken(envToken)) return envToken;
  }
  return null;
}

export function isUpTokenConfigured(): boolean {
  return getUpTokenIfConfigured() !== null;
}
