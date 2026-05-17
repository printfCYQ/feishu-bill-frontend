export type RecordType = 'income' | 'expense';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export type ImportSource = 'alipay' | 'shark';