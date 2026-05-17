export * from './auth';
export * from './batch';
export * from './category';
export * from './chart';
export * from './common';
export * from './import';
export * from './record';

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecordsListData {
  records: import('./record').ExpenseRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export type CategoriesResponse = import('./common').ApiResponse<import('./category').Category[]>;
export type CategoryResponse = import('./common').ApiResponse<import('./category').Category>;
export type RecordsResponse = import('./common').ApiResponse<import('./record').ExpenseRecord[]>;
export type RecordResponse = import('./common').ApiResponse<import('./record').ExpenseRecord>;
export type SummaryResponse = import('./common').ApiResponse<import('./chart').SummaryData>;
export type ChartsSummaryResponse = import('./common').ApiResponse<import('./chart').ChartsSummaryData>;
export type BatchCreateResponse = import('./common').ApiResponse<import('./batch').BatchCreateResult>;
export type MessageResponse = import('./common').ApiResponse<void>;
export type LoginResponse = import('./common').ApiResponse<import('./auth').LoginResult>;