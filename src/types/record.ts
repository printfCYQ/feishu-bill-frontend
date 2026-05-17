import type { Dayjs } from 'dayjs';
import type { RecordType } from './common';

export interface ExpenseRecord {
  record_id?: string;
  id?: string;
  user_id?: string;
  amount: number;
  type: RecordType;
  category_id: string;
  category_name: string;
  note: string;
  created_at: number;
}

export interface RecordFormData {
  type: RecordType;
  amount: number;
  category_id: string;
  category_name: string;
  note: string;
  created_at: number;
}

export interface GetRecordsParams {
  user_id?: string;
  year?: number;
  month?: number;
  category_id?: string;
  type?: RecordType;
  start_date?: number | string;
  end_date?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  include_stats?: boolean;
}

export interface RecordFormValues {
  type: RecordType;
  amount: number;
  category_id: string;
  note: string;
  created_at: Dayjs;
}

export interface TableRecord extends ExpenseRecord {
  key: string;
}