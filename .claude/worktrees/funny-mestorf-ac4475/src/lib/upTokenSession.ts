/**
 * In-memory Up Bank Personal Access Token storage.
 *
 * Security: The token is NEVER written to localStorage, sessionStorage,
 * cookies, or any database. It lives only in this module's closure and
 * is cleared on page refresh.
 *
 * Dev-only fallback: If import.meta.env.DEV is true and VITE_UP_API_TOKEN
 * is set, it is used as a fallback. This is intentionally NOT available in
 * production builds.
 */

let _upToken: string | null = null;

/**
 * Validate a token string. Rejects empty strings and placeholder values.
 */
export function validateUpToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.length === 0) return false;
  // Reject obvious placeholder values
  if (trimmed === 'your-up-token-here') return false;
  if (trimmed === 'VITE_UP_API_TOKEN') return false;
  if (trimmed === 'undefined') return false;
  if (trimmed === 'null') return false;
  // Up Bank PATs start with "up:yeah:" prefix
  // Accept any non-empty string that doesn't look like a placeholder
  return trimmed.length >= 10;
}

/**
 * Store an Up Bank PAT in memory after validation.
 * Throws if the token is invalid.
 */
export function setUpToken(token: string): void {
  if (!validateUpToken(token)) {
    throw new Error(
      'Invalid Up Bank token. Please provide a valid Personal Access Token.'
    );
  }
  _upToken = token.trim();
}

/**
 * Clear the stored token and any associated caches.
 */
export function clearUpToken(): void {
  _upToken = null;
}

/**
 * Get the stored Up Bank PAT.
 * Throws if no token is configured.
 */
export function getUpToken(): string {
  if (_upToken) return _upToken;

  // Dev-only fallback to environment variable
  if (import.meta.env.DEV) {
    const envToken = import.meta.env.VITE_UP_API_TOKEN;
    if (envToken && validateUpToken(envToken)) {
      return envToken;
    }
  }

  throw new Error(
    'Up Bank token is not configured. Please connect your Up Bank account first.'
  );
}

/**
 * Get the stored Up Bank PAT, or null if not configured.
 * Does not throw.
 */
export function getUpTokenIfConfigured(): string | null {
  if (_upToken) return _upToken;

  // Dev-only fallback
  if (import.meta.env.DEV) {
    const envToken = import.meta.env.VITE_UP_API_TOKEN;
    if (envToken && validateUpToken(envToken)) {
      return envToken;
    }
  }

  return null;
}

/**
 * Check if a token is currently configured (either in-memory or dev env).
 */
export function isUpTokenConfigured(): boolean {
  return getUpTokenIfConfigured() !== null;
}
