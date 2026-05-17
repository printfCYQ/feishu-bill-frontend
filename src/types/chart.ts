export interface CategoryStats {
  income: number;
  expense: number;
}

export interface TopCategory {
  name: string;
  expense: number;
}

export interface MonthData {
  year?: number;
  month: number;
  total_income: number;
  total_expense: number;
  balance: number;
  category_stats: Record<string, CategoryStats>;
}

export interface CurrentMonthData {
  total_income: number;
  total_expense: number;
  balance: number;
  category_stats: Record<string, CategoryStats>;
  top_categories: TopCategory[];
}

export interface YearData {
  year: number;
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface CumulativeYearData {
  year: number;
  cumulative_income: number;
  cumulative_expense: number;
}

export interface ChartsData {
  year: number;
  month: number;
  current_month: CurrentMonthData;
  year_total?: {
    total_income: number;
    total_expense: number;
    balance: number;
    category_stats: Record<string, CategoryStats>;
    top_categories: TopCategory[];
  };
  year_months: MonthData[];
  top_categories?: TopCategory[];
  category_stats?: Record<string, CategoryStats>;
  total_income?: number;
  total_expense?: number;
  balance?: number;
  years?: YearData[];
  cumulative_years?: CumulativeYearData[];
}

export interface SummaryData {
  year: string;
  month: string;
  total_income: number;
  total_expense: number;
  balance: number;
  category_stats: Record<string, CategoryStats>;
}

export interface ChartsSummaryData {
  year: number;
  month: number;
  current_month: CurrentMonthData;
  year_months: MonthData[];
}

export interface StatsData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalRecords: number;
}