import type { RecordType } from './common';

export interface Category {
  record_id?: string;
  id: string;
  user_id?: string;
  name: string;
  type: RecordType;
  icon: string;
}

export interface CategoryFormData {
  name: string;
  type: RecordType;
  icon: string;
}

export interface GetCategoriesParams {
  user_id?: string;
  type?: RecordType;
}