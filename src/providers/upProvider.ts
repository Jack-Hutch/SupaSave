import type { BankProviderInstance } from './bankProvider';
import type { BankConnection, FinanceAccount, Transaction } from '../types';
import { getUpToken, clearUpToken } from '../lib/upTokenSession';
import { format } from 'date-fns';

const UP_API_BASE = 'https://api.up.com.au/api/v1';

interface UpApiError {
  errors: Array<{ status: string; title: string; detail: string }>;
}

interface UpAccount {
  id: string;
  type: string;
  attributes: {
    displayName: string;
    accountType: string;
    ownershipType: string;
    balance: {
      currencyCode: string;
      value: string;
      valueInBaseUnits: number;
    };
  };
}

interface UpTransaction {
  id: string;
  type: string;
  attributes: {
    status: string;
    rawText: string | null;
    description: string;
    message: string | null;
    isCategorizable: boolean;
    amount: {
      currencyCode: string;
      value: string;
      valueInBaseUnits: number;
    };
    foreignAmount: null | {
      currencyCode: string;
      value: string;
      valueInBaseUnits: number;
    };
    cardPurchaseMethod: null | { method: string; cardNumberSuffix: string | null };
    settledAt: string | null;
    createdAt: string;
    transactionType: string | null;
    note: null | { text: string; updatedAt: string };
    performingCustomer: null | { displayName: string };
    isRoundUp: boolean;
    roundUp: null | { amount: { currencyCode: string; value: string; valueInBaseUnits: number }; boostPortion: null };
    cashback: null;
    category: null | {
      data: {
        type: string;
        id: string;
      } | null;
    };
    merchant?: {
      data?: {
        type: string;
        id: string;
      };
    };
  };
}

interface UpListResponse<T> {
  data: T[];
  links: {
    prev: string | null;
    next: string | null;
  };
}

async function upFetch<T>(endpoint: string, token: string): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${UP_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMsg = `Up API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = (await response.json()) as UpApiError;
      if (errorData.errors?.[0]?.detail) {
        errorMsg = errorData.errors[0].detail;
      }
    } catch {
      // ignore JSON parse error
    }
    if (response.status === 401) {
      clearUpToken();
      throw new Error('Up Bank token is invalid or expired. Please reconnect.');
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

function mapUpTransaction(tx: UpTransaction, userId: string): Transaction {
  const amountInCents = tx.attributes.amount.valueInBaseUnits;
  const isIncome = amountInCents > 0;
  const amount = Math.abs(amountInCents) / 100;
  const createdAt = tx.attributes.createdAt;
  const date = createdAt.split('T')[0];

  // Map Up category to our category
  const categoryId = tx.attributes.category?.data?.id || '';
  const category = mapUpCategory(categoryId);

  return {
    id: tx.id,
    user_id: userId,
    amount,
    description: tx.attributes.description,
    category,
    date,
    created_at_tx: createdAt,
    time_str: createdAt.split('T')[1]?.split('+')[0] || undefined,
    notes: tx.attributes.note?.text || undefined,
    is_income: isIncome,
    direction: isIncome ? 'CREDIT' : 'DEBIT',
    merchant_name: undefined,
    merchant_logo: undefined,
    is_round_up: tx.attributes.isRoundUp,
    raw_text: tx.attributes.rawText || undefined,
    bank_ref: tx.id,
    tags: [],
    source: 'up',
    updated_at: new Date().toISOString(),
  };
}

function mapUpCategory(categoryId: string): string {
  const mapping: Record<string, string> = {
    'groceries': 'Groceries',
    'restaurants-and-cafes': 'Dining',
    'booze': 'Shopping',
    'coffee': 'Dining',
    'fast-food': 'Dining',
    'food-delivery': 'Dining',
    'fuel': 'Transport',
    'public-transport': 'Transport',
    'taxis-and-share-cars': 'Transport',
    'parking': 'Transport',
    'cycling': 'Transport',
    'tv-and-music': 'Entertainment',
    'gaming': 'Entertainment',
    'apps-and-software': 'Technology',
    'internet': 'Utilities',
    'mobile-phone': 'Utilities',
    'utilities': 'Utilities',
    'rent-and-mortgage': 'Housing',
    'home-insurance': 'Housing',
    'health-and-medical': 'Health & Fitness',
    'fitness-and-wellbeing': 'Health & Fitness',
    'clothing-and-accessories': 'Shopping',
    'electronics-and-software': 'Technology',
    'gifts-and-charity': 'Shopping',
    'hobbies': 'Entertainment',
    'holidays-and-travel': 'Travel',
    'flights': 'Travel',
    'hotels-and-accommodation': 'Travel',
    'salary-and-income': 'Income',
    'investments': 'Income',
    'personal-finance': 'Finance',
    'education': 'Education',
  };
  return mapping[categoryId] || 'Uncategorized';
}

export class UpProvider implements BankProviderInstance {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async connect(options?: Record<string, unknown>): Promise<BankConnection> {
    // Token should already be set via setUpToken() before calling connect
    // But if passed directly (for initial connection flow), we accept it here
    if (options?.upPersonalAccessToken && typeof options.upPersonalAccessToken === 'string') {
      const { setUpToken } = await import('../lib/upTokenSession');
      setUpToken(options.upPersonalAccessToken);
    }

    const token = getUpToken();

    // Verify the token works by fetching ping endpoint
    await upFetch<{ meta: { id: string; statusEmoji: string } }>('/util/ping', token);

    // Fetch accounts to get account IDs
    const accountsResponse = await upFetch<UpListResponse<UpAccount>>('/accounts', token);
    const accountIds = accountsResponse.data.map((a) => a.id);

    return {
      user_id: this.userId,
      provider: 'up',
      connection_id: `up-${Date.now()}`,
      account_ids: accountIds,
      last_sync_at: new Date().toISOString(),
      status: 'connected',
      updated_at: new Date().toISOString(),
      // Store token in payload so it can be restored after page refresh.
      // This is intentional: each user stores their own token against their
      // own row in bank_connections (protected by Supabase RLS).
      payload: { upToken: token },
    };
  }

  async disconnect(_connectionId?: string): Promise<void> {
    clearUpToken();
  }

  async getAccounts(_connectionId: string): Promise<FinanceAccount[]> {
    const token = getUpToken();
    const response = await upFetch<UpListResponse<UpAccount>>('/accounts', token);

    return response.data.map((acc) => ({
      id: acc.id,
      user_id: this.userId,
      external_id: acc.id,
      display_name: acc.attributes.displayName,
      balance: acc.attributes.balance.valueInBaseUnits / 100,
      currency: acc.attributes.balance.currencyCode,
      updated_at: new Date().toISOString(),
    }));
  }

  async getTransactions(
    _connectionId: string,
    accountId: string,
    from: Date,
    to: Date
  ): Promise<Transaction[]> {
    const token = getUpToken();
    const fromStr = format(from, "yyyy-MM-dd'T'HH:mm:ssxxx");
    const toStr = format(to, "yyyy-MM-dd'T'HH:mm:ssxxx");

    const transactions: Transaction[] = [];
    let nextUrl: string | null =
      `/accounts/${accountId}/transactions?filter[since]=${encodeURIComponent(fromStr)}&filter[until]=${encodeURIComponent(toStr)}&page[size]=100`;

    while (nextUrl) {
      const response: UpListResponse<UpTransaction> = await upFetch<UpListResponse<UpTransaction>>(nextUrl, token);
      for (const tx of response.data) {
        transactions.push(mapUpTransaction(tx, this.userId));
      }
      nextUrl = response.links.next;
    }

    return transactions;
  }

  async getBalance(_connectionId: string, accountId: string): Promise<number> {
    const token = getUpToken();
    const response = await upFetch<{ data: UpAccount }>(`/accounts/${accountId}`, token);
    return response.data.attributes.balance.valueInBaseUnits / 100;
  }
}
