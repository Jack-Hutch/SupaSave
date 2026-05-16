import type { BankProviderInstance } from './bankProvider';
import type { BankConnection, FinanceAccount, Transaction } from '../types';
import { format, subDays } from 'date-fns';

const MOCK_USER_ID = 'mock-user';

const MOCK_ACCOUNTS: FinanceAccount[] = [
  {
    id: 'acc-1',
    user_id: MOCK_USER_ID,
    external_id: 'ext-acc-1',
    display_name: 'Everyday Account',
    balance: 2845.50,
    currency: 'AUD',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-2',
    user_id: MOCK_USER_ID,
    external_id: 'ext-acc-2',
    display_name: 'Savings Sapling 🌱',
    balance: 12500.00,
    currency: 'AUD',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-3',
    user_id: MOCK_USER_ID,
    external_id: 'ext-acc-3',
    display_name: 'Holiday Fund ✈️',
    balance: 3200.00,
    currency: 'AUD',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-4',
    user_id: MOCK_USER_ID,
    external_id: 'ext-acc-4',
    display_name: 'Emergency Fund',
    balance: 8000.00,
    currency: 'AUD',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-5',
    user_id: MOCK_USER_ID,
    external_id: 'ext-acc-5',
    display_name: 'Tech Budget',
    balance: 450.00,
    currency: 'AUD',
    updated_at: new Date().toISOString(),
  },
];

function makeTransaction(
  overrides: Partial<Transaction> & {
    id: string;
    description: string;
    amount: number;
    daysAgo: number;
    category: string;
    is_income: boolean;
  }
): Transaction {
  const date = format(subDays(new Date(), overrides.daysAgo), 'yyyy-MM-dd');
  return {
    user_id: MOCK_USER_ID,
    direction: overrides.is_income ? 'CREDIT' : 'DEBIT',
    date,
    source: 'mock',
    updated_at: new Date().toISOString(),
    tags: [],
    ...overrides,
  };
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  makeTransaction({ id: 'tx-1', description: 'Salary - Acme Corp', amount: 5200, daysAgo: 2, category: 'Income', is_income: true, merchant_name: 'Acme Corp' }),
  makeTransaction({ id: 'tx-2', description: 'Woolworths', amount: 87.50, daysAgo: 1, category: 'Groceries', is_income: false, merchant_name: 'Woolworths' }),
  makeTransaction({ id: 'tx-3', description: 'Netflix', amount: 22.99, daysAgo: 3, category: 'Entertainment', is_income: false, merchant_name: 'Netflix' }),
  makeTransaction({ id: 'tx-4', description: 'Spotify', amount: 12.99, daysAgo: 5, category: 'Entertainment', is_income: false, merchant_name: 'Spotify' }),
  makeTransaction({ id: 'tx-5', description: 'Uber Eats - McDonalds', amount: 34.80, daysAgo: 2, category: 'Dining', is_income: false, merchant_name: "McDonald's" }),
  makeTransaction({ id: 'tx-6', description: 'Coles Supermarket', amount: 125.40, daysAgo: 4, category: 'Groceries', is_income: false, merchant_name: 'Coles' }),
  makeTransaction({ id: 'tx-7', description: 'Shell Fuel', amount: 89.50, daysAgo: 6, category: 'Transport', is_income: false, merchant_name: 'Shell' }),
  makeTransaction({ id: 'tx-8', description: 'Sydney Trains', amount: 4.20, daysAgo: 1, category: 'Transport', is_income: false, merchant_name: 'Transport NSW' }),
  makeTransaction({ id: 'tx-9', description: 'Google One', amount: 2.99, daysAgo: 10, category: 'Technology', is_income: false, merchant_name: 'Google' }),
  makeTransaction({ id: 'tx-10', description: 'Gym Membership', amount: 59.00, daysAgo: 8, category: 'Health & Fitness', is_income: false, merchant_name: 'Anytime Fitness' }),
  makeTransaction({ id: 'tx-11', description: 'Coffee - The Grounds', amount: 6.50, daysAgo: 1, category: 'Dining', is_income: false, merchant_name: 'The Grounds' }),
  makeTransaction({ id: 'tx-12', description: 'Coffee - Campos', amount: 5.50, daysAgo: 3, category: 'Dining', is_income: false, merchant_name: 'Campos Coffee' }),
  makeTransaction({ id: 'tx-13', description: 'Amazon AU', amount: 45.00, daysAgo: 12, category: 'Shopping', is_income: false, merchant_name: 'Amazon' }),
  makeTransaction({ id: 'tx-14', description: 'Rent Payment', amount: 2100.00, daysAgo: 7, category: 'Housing', is_income: false, merchant_name: 'Property Manager' }),
  makeTransaction({ id: 'tx-15', description: 'Electricity Bill', amount: 185.40, daysAgo: 14, category: 'Utilities', is_income: false, merchant_name: 'Origin Energy' }),
  makeTransaction({ id: 'tx-16', description: 'Phone Bill', amount: 65.00, daysAgo: 20, category: 'Utilities', is_income: false, merchant_name: 'Telstra' }),
  makeTransaction({ id: 'tx-17', description: 'Freelance Payment', amount: 800.00, daysAgo: 15, category: 'Income', is_income: true, merchant_name: 'Client XYZ' }),
  makeTransaction({ id: 'tx-18', description: 'Chemist Warehouse', amount: 38.90, daysAgo: 9, category: 'Health & Fitness', is_income: false, merchant_name: 'Chemist Warehouse' }),
  makeTransaction({ id: 'tx-19', description: 'JB Hi-Fi', amount: 199.00, daysAgo: 18, category: 'Technology', is_income: false, merchant_name: 'JB Hi-Fi' }),
  makeTransaction({ id: 'tx-20', description: 'Dinner - Aria Restaurant', amount: 145.00, daysAgo: 11, category: 'Dining', is_income: false, merchant_name: 'Aria Restaurant' }),
  makeTransaction({ id: 'tx-21', description: 'Interest Earned', amount: 42.50, daysAgo: 30, category: 'Income', is_income: true }),
  makeTransaction({ id: 'tx-22', description: 'Dan Murphy\'s', amount: 67.00, daysAgo: 16, category: 'Shopping', is_income: false, merchant_name: "Dan Murphy's" }),
  makeTransaction({ id: 'tx-23', description: 'Airbnb', amount: 320.00, daysAgo: 25, category: 'Travel', is_income: false, merchant_name: 'Airbnb' }),
  makeTransaction({ id: 'tx-24', description: 'Qantas', amount: 450.00, daysAgo: 22, category: 'Travel', is_income: false, merchant_name: 'Qantas' }),
  makeTransaction({ id: 'tx-25', description: 'Bunnings', amount: 89.00, daysAgo: 28, category: 'Home & Garden', is_income: false, merchant_name: 'Bunnings' }),
];

export class MockProvider implements BankProviderInstance {
  async connect(_options?: Record<string, unknown>): Promise<BankConnection> {
    await this.delay(500);
    return {
      user_id: MOCK_USER_ID,
      provider: 'mock',
      connection_id: 'mock-connection-001',
      account_ids: MOCK_ACCOUNTS.map((a) => a.id),
      last_sync_at: new Date().toISOString(),
      status: 'connected',
      updated_at: new Date().toISOString(),
    };
  }

  async disconnect(_connectionId?: string): Promise<void> {
    await this.delay(300);
  }

  async getAccounts(_connectionId: string): Promise<FinanceAccount[]> {
    await this.delay(400);
    return MOCK_ACCOUNTS;
  }

  async getTransactions(
    _connectionId: string,
    _accountId: string,
    from: Date,
    to: Date
  ): Promise<Transaction[]> {
    await this.delay(600);
    return MOCK_TRANSACTIONS.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= from && txDate <= to;
    });
  }

  async getBalance(_connectionId: string, accountId: string): Promise<number> {
    await this.delay(200);
    const account = MOCK_ACCOUNTS.find((a) => a.id === accountId);
    return account?.balance || 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
