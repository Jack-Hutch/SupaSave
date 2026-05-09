import { getUpToken, clearUpToken } from '../lib/upTokenSession';

const UP_API_BASE = 'https://api.up.com.au/api/v1';

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function clearCache(): void {
  cache.clear();
}

async function fetchWithCache<T>(endpoint: string, bustCache = false): Promise<T> {
  const token = getUpToken();
  const url = endpoint.startsWith('http') ? endpoint : `${UP_API_BASE}${endpoint}`;

  if (!bustCache && cache.has(url)) {
    const cached = cache.get(url)!;
    if (Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
    cache.delete(url);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearUpToken();
      throw new Error('Up Bank token is invalid or expired. Please reconnect.');
    }
    throw new Error(`Up API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as T;
  cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

export interface UpPingResponse {
  meta: {
    id: string;
    statusEmoji: string;
  };
}

export async function ping(): Promise<UpPingResponse> {
  return fetchWithCache<UpPingResponse>('/util/ping', true);
}

export interface UpAccountsResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      displayName: string;
      accountType: string;
      balance: {
        currencyCode: string;
        value: string;
        valueInBaseUnits: number;
      };
    };
  }>;
  links: { prev: string | null; next: string | null };
}

export async function getAccounts(): Promise<UpAccountsResponse> {
  return fetchWithCache<UpAccountsResponse>('/accounts');
}

export interface UpTransactionsResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      status: string;
      rawText: string | null;
      description: string;
      message: string | null;
      amount: {
        currencyCode: string;
        value: string;
        valueInBaseUnits: number;
      };
      settledAt: string | null;
      createdAt: string;
      isRoundUp: boolean;
      note: null | { text: string; updatedAt: string };
      category: null | { data: { type: string; id: string } | null };
    };
  }>;
  links: { prev: string | null; next: string | null };
}

export async function getTransactions(
  accountId: string,
  since?: string,
  until?: string,
  pageSize = 100
): Promise<UpTransactionsResponse> {
  const params = new URLSearchParams({ 'page[size]': String(pageSize) });
  if (since) params.set('filter[since]', since);
  if (until) params.set('filter[until]', until);
  return fetchWithCache<UpTransactionsResponse>(
    `/accounts/${accountId}/transactions?${params.toString()}`
  );
}
