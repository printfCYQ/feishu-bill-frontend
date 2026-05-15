// Category 相关类型
export interface Category {
  record_id?: string;
  id: string;
  user_id?: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
}

export interface CategoryFormData {
  name: string;
  type: 'income' | 'expense';
  icon: string;
}

// Record 相关类型
export interface ExpenseRecord {
  record_id?: string;
  id?: string;
  user_id?: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  category_name: string;
  note: string;
  created_at: number;
}

export interface RecordFormData {
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  category_name: string;
  note: string;
  created_at: number;
}

// 统计相关类型
export interface CategoryStats {
  income: number;
  expense: number;
}

export interface MonthData {
  month: number;
  total_income: number;
  total_expense: number;
  balance: number;
  category_stats: Record<string, CategoryStats>;
}

export interface TopCategory {
  name: string;
  expense: number;
}

export interface CurrentMonthData {
  total_income: number;
  total_expense: number;
  balance: number;
  category_stats: Record<string, CategoryStats>;
  top_categories: TopCategory[];
}

export interface ChartsSummaryData {
  year: number;
  month: number;
  current_month: CurrentMonthData;
  year_months: MonthData[];
}

export interface SummaryData {
  year: string;
  month: string;
  total_income: number;
  total_expense: number;
  balance: number;
  category_stats: Record<string, CategoryStats>;
}

// 批量操作相关类型
export interface BatchCreateResult {
  success_count: number;
  error_count: number;
  results: ExpenseRecord[];
  errors: string[];
}

// 登录相关类型
export interface FeishuUser {
  open_id: string;
  union_id?: string;
  name: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
}

export interface SupabaseUser {
  id: string;
  email?: string;
  aud?: string;
  role?: string;
  iss?: string;
  sub?: string;
  [key: string]: unknown;
}

export interface LoginResult {
  user: SupabaseUser;
  access_token: string;
  expires_at?: number;
  refresh_token?: string;
  token_type?: string;
  feishu_user: FeishuUser;
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// 各种 API 响应类型（使用 type 别名避免 ESLint 空接口警告）
export type CategoriesResponse = ApiResponse<Category[]>;
export type CategoryResponse = ApiResponse<Category>;
export type RecordsResponse = ApiResponse<ExpenseRecord[]>;
export type RecordResponse = ApiResponse<ExpenseRecord>;
export type SummaryResponse = ApiResponse<SummaryData>;
export type ChartsSummaryResponse = ApiResponse<ChartsSummaryData>;
export type BatchCreateResponse = ApiResponse<BatchCreateResult>;
export type MessageResponse = ApiResponse<void>;
export type LoginResponse = ApiResponse<LoginResult>;

// 查询参数类型
export interface GetRecordsParams {
  user_id?: string;
  type?: 'income' | 'expense';
  year?: number;
  month?: number;
  start_date?: string;
  end_date?: string;
  note?: string;
  amount_min?: number;
  amount_max?: number;
  category_id?: string;
}

export interface GetCategoriesParams {
  type?: 'income' | 'expense';
  user_id?: string;
}
