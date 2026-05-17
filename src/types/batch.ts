import type { ExpenseRecord } from './record';

export interface BatchCreateResult {
  success_count: number;
  error_count: number;
  duplicate_count?: number;
  results: ExpenseRecord[];
  errors: string[];
}