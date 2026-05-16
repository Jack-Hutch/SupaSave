import type { BankConnection, FinanceAccount, Transaction } from '../types';

export interface BankProviderInstance {
  connect(options?: Record<string, unknown>): Promise<BankConnection>;
  disconnect(connectionId?: string): Promise<void>;
  getAccounts(connectionId: string): Promise<FinanceAccount[]>;
  getTransactions(
    connectionId: string,
    accountId: string,
    from: Date,
    to: Date
  ): Promise<Transaction[]>;
  getBalance(connectionId: string, accountId: string): Promise<number>;
}
