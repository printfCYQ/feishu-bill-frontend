export interface Category {
  record_id?: string;
  id: string;
  user_id?: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
}

export interface ExpenseRecord {
  record_id?: string;
  id: string;
  user_id?: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  category_name: string;
  note: string;
  created_at: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface SummaryData {
  total_income: number;
  total_expense: number;
  balance: number;
  category_stats: { [key: string]: { income: number; expense: number } };
}

export interface RecordFormData {
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  category_name: string;
  note: string;
  created_at: number;
}

export interface CategoryFormData {
  name: string;
  type: 'income' | 'expense';
  icon: string;
}
