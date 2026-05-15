import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type {
  Category,
  ExpenseRecord,
  ApiResponse,
  SummaryData,
  ChartsSummaryData,
  CategoryFormData,
  BatchCreateResult,
  LoginResult,
  GetRecordsParams,
  GetCategoriesParams,
} from '../types';

const SUPABASE_URL = 'https://aoivqgfavozkbutsckrr.supabase.co';
const LOCAL_API_URL = 'http://127.0.0.1:54321';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = isLocal ? LOCAL_API_URL : SUPABASE_URL;

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

function getAccessToken(): string | null {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const data = JSON.parse(stored);
      return data.state?.accessToken || null;
    }
  } catch (e) {
    console.error('Failed to read access token:', e);
  }
  return null;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore.getState();
      authStore.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  client: apiClient,
  
  getFeishuAuthUrl(): string {
    const appId = 'cli_a975802a39799be6';
    const frontendUrl = window.location.origin;
    const redirectUri = encodeURIComponent(`${frontendUrl}/login`);
    return `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${appId}&redirect_uri=${redirectUri}`;
  },

  async login(code: string): Promise<ApiResponse<LoginResult>> {
    const response = await apiClient.get(`/functions/v1/feishu_login?code=${code}`);
    return response.data;
  },

  async getCategories(params?: GetCategoriesParams): Promise<ApiResponse<Category[]>> {
    const response = await apiClient.get('/functions/v1/api_categories', { params });
    return response.data;
  },

  async createCategory(category: CategoryFormData): Promise<ApiResponse<Category>> {
    const response = await apiClient.post('/functions/v1/api_categories', category);
    return response.data;
  },

  async updateCategory(
    record_id: string,
    category: Partial<CategoryFormData>
  ): Promise<ApiResponse<void>> {
    const response = await apiClient.put('/functions/v1/api_categories', {
      record_id,
      ...category,
    });
    return response.data;
  },

  async deleteCategory(record_id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete('/functions/v1/api_categories', {
      params: { record_id },
    });
    return response.data;
  },

  async getRecords(params?: GetRecordsParams): Promise<ApiResponse<ExpenseRecord[]>> {
    const response = await apiClient.get('/functions/v1/api_records', { params });
    return response.data;
  },

  async getRecord(record_id: string): Promise<ApiResponse<ExpenseRecord>> {
    const response = await apiClient.get('/functions/v1/api_records', {
      params: { record_id },
    });
    return response.data;
  },

  async createRecord(
    record: Omit<ExpenseRecord, 'record_id'>
  ): Promise<ApiResponse<ExpenseRecord>> {
    const response = await apiClient.post('/functions/v1/api_records', record);
    return response.data;
  },

  async batchCreateRecords(
    records: Omit<ExpenseRecord, 'record_id'>[]
  ): Promise<ApiResponse<BatchCreateResult>> {
    const response = await apiClient.post(
      '/functions/v1/api_records',
      { records },
      { params: { action: 'batch' } }
    );
    return response.data;
  },

  async updateRecord(
    record_id: string,
    record: Partial<Omit<ExpenseRecord, 'record_id'>>
  ): Promise<ApiResponse<void>> {
    const response = await apiClient.put('/functions/v1/api_records', {
      record_id,
      ...record,
    });
    return response.data;
  },

  async deleteRecord(record_id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete('/functions/v1/api_records', {
      params: { record_id },
    });
    return response.data;
  },

  async getSummary(year: number, month: number): Promise<ApiResponse<SummaryData>> {
    const response = await apiClient.get('/functions/v1/api_records', {
      params: { action: 'summary', year, month },
    });
    return response.data;
  },

  async getChartsSummary(
    year: number,
    month?: number
  ): Promise<ApiResponse<ChartsSummaryData>> {
    const params: Record<string, unknown> = { action: 'charts_summary', year };
    if (month) {
      params.month = month;
    }
    const response = await apiClient.get('/functions/v1/api_records', { params });
    return response.data;
  },
};
