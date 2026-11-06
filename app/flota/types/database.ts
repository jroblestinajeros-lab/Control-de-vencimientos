export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type AccountType = 'CASH' | 'DEBIT' | 'CREDIT' | 'SAVINGS';

export interface Profile {
  id: string;
  full_name?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  current_balance: number;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  icon?: string;
  is_completed: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  month: number;
  year: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  destination_account_id?: string;
  savings_goal_id?: string;
  amount: number;
  type: TransactionType;
  description?: string;
  receipt_url?: string;
  transaction_date: string;
  created_at: string;
}
