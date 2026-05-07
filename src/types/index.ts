export type BillingCycle = 'weekly' | 'monthly' | 'yearly';
export type TransactionSource = 'manual' | 'up' | 'plaid' | 'truelayer' | 'mock';
export type BankProvider = 'up' | 'plaid' | 'truelayer' | 'mock';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

export type ColorKey =
  | 'green' | 'blue' | 'orange' | 'cyan' | 'purple' | 'violet'
  | 'slate' | 'amber' | 'emerald' | 'pink' | 'sky' | 'lime'
  | 'indigo' | 'rose' | 'teal' | 'yellow' | 'gray';

export interface CategoryDef {
  id:             string;
  name:           string;
  icon:           string;
  color:          ColorKey;
  subcategories:  string[];
  isBuiltIn?:     boolean;
  /** When true, the category is hidden from pickers/lists (used to "delete" built-ins) */
  hidden?:        boolean;
}

export interface Profile {
  id: string;
  settings: UserSettings;
  budget_by_category: Record<string, number>;
  ui_state: UIState;
  updated_at: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  themeVariant: 'default' | 'earth' | 'noir' | 'extended';
  primaryColor?: string; // hex override for accent, e.g. "#8b5cf6"
  currency: string;
  notifications: boolean;
  customCategories?: CategoryDef[];
  incomeSources?: IncomeSource[];
}

export type IncomeSourceType = 'main' | 'freelance' | 'sidejob' | 'other';
export type PayType = 'hourly' | 'flat';

export interface IncomeSource {
  id: string;
  name: string;
  type: IncomeSourceType;
  default_pay_type: PayType;
  default_rate?: number;
  color?: string; // hex
}

export interface UIState {
  activeTab?: string;
}

export interface FinanceAccount {
  id: string;
  user_id: string;
  external_id: string;
  display_name: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at_tx?: string;
  time_str?: string;
  notes?: string;
  is_income: boolean;
  direction: string;
  merchant_name?: string;
  merchant_logo?: string;
  is_round_up?: boolean;
  raw_text?: string;
  bank_ref?: string;
  tags?: string[];
  source: TransactionSource;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  cost: number;
  billing_cycle: BillingCycle;
  start_date: string;
  next_billing_date: string;
  cancel_reminder: boolean;
  notes?: string;
  category: string;
  updated_at: string;
}

export interface BankConnection {
  user_id: string;
  provider: BankProvider;
  connection_id: string;
  account_ids: string[];
  last_sync_at?: string;
  status: ConnectionStatus;
  error_message?: string;
  payload?: Record<string, unknown>;
  updated_at: string;
}

export interface MerchantStats {
  name: string;
  logo?: string;
  totalSpend: number;
  count: number;
  category: string;
}

export interface TransactionFilters {
  search: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  source: string;
}

export interface MonthlyComparison {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryTrend {
  category: string;
  months: { month: string; amount: number }[];
}

export interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
}

export interface WorkShift {
  id: string;
  user_id: string;
  date: string;          // YYYY-MM-DD
  start_time: string;    // HH:MM (zero-length when pay_type='flat')
  end_time: string;      // HH:MM
  hourly_rate: number;   // 0 when pay_type='flat'
  hours_worked: number;  // 0 when pay_type='flat'
  pay_owed: number;
  notes?: string;
  is_paid: boolean;
  paid_transaction_id?: string;
  paid_at?: string;
  // Income source (optional for backwards compat — pre-source rows are treated as main/cafe)
  source_id?: string;
  source_label?: string;
  source_type?: IncomeSourceType;
  pay_type?: PayType;    // defaults to 'hourly'
  flat_amount?: number;  // pay amount when pay_type='flat'
  /**
   * Lifecycle status. Stored explicitly only when 'scheduled' (future shift,
   * not yet worked). Past/completed shifts have it absent or 'completed'.
   * 'paid' is derived from is_paid=true regardless.
   */
  status?: 'scheduled' | 'completed' | 'paid';
  created_at: string;
  updated_at: string;
}
