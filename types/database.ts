export type AccountType = 'CASH' | 'DEBIT' | 'CREDIT' | 'SAVINGS';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Profile {
  id: string;
  full_name?: string | null;
  currency?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  user_id?: string | null;
  name: string;
  type: AccountType;
  currency: string;
  current_balance: number;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  type: TransactionType;
  icon?: string | null;
  color?: string | null;
  created_at?: string;
}

export interface SavingsGoal {
  id: string;
  user_id?: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  icon?: string | null;
  is_completed: boolean;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id?: string | null;
  account_id: string;
  category_id?: string | null;
  destination_account_id?: string | null;
  savings_goal_id?: string | null;
  amount: number;
  type: TransactionType;
  description?: string | null;
  receipt_url?: string | null;
  transaction_date: string;
  created_at?: string;
}

export interface Budget {
  id: string;
  user_id?: string | null;
  category_id: string;
  monthly_limit: number;
  month: number;
  year: number;
  created_at?: string;
}
