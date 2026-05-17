import type { RecordType } from './common';

export interface ParsedRecord {
  key: string;
  created_at: number;
  type: RecordType;
  amount: number;
  category_id: string;
  category_name: string;
  note: string;
  source_category: string;
  original_data: string[];
}