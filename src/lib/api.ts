import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse, Category, ExpenseRecord, SummaryData } from '../types';

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
  getFeishuAuthUrl(): string {
    const appId = 'cli_a975802a39799be6';
    const frontendUrl = window.location.origin;
    const redirectUri = encodeURIComponent(`${frontendUrl}/login`);
    return `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${appId}&redirect_uri=${redirectUri}`;
  },

  async login(code: string): Promise<ApiResponse<{
    access_token: string;
    feishu_user: {
      open_id: string;
      name: string;
      avatar_url?: string;
    };
  }>> {
    const response = await apiClient.get(`/functions/v1/feishu_login?code=${code}`);
    return response.data;
  },

  async getCategories(): Promise<ApiResponse<Category[]>> {
    const response = await apiClient.get('/functions/v1/api_categories');
    return response.data;
  },

  async createCategory(category: Omit<Category, 'id' | 'record_id' | 'user_id'>): Promise<ApiResponse<Category>> {
    const response = await apiClient.post('/functions/v1/api_categories', category);
    return response.data;
  },

  async updateCategory(record_id: string, category: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await apiClient.put('/functions/v1/api_categories', { record_id, ...category });
    return response.data;
  },

  async deleteCategory(record_id: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await apiClient.delete('/functions/v1/api_categories', {
      params: { record_id },
    });
    return response.data;
  },

  async getRecords(params?: {
    year?: number;
    month?: number;
    type?: string;
    category_id?: string;
    note?: string;
    amount_min?: number;
    amount_max?: number;
  }): Promise<ApiResponse<ExpenseRecord[]>> {
    const response = await apiClient.get('/functions/v1/api_records', { params });
    return response.data;
  },

  async getRecord(record_id: string): Promise<ApiResponse<ExpenseRecord>> {
    const response = await apiClient.get('/functions/v1/api_records', {
      params: { record_id },
    });
    return response.data;
  },

  async createRecord(record: Omit<ExpenseRecord, 'id' | 'record_id' | 'user_id'>): Promise<ApiResponse<ExpenseRecord>> {
    const response = await apiClient.post('/functions/v1/api_records', record);
    return response.data;
  },

  async batchCreateRecords(records: Omit<ExpenseRecord, 'id' | 'record_id' | 'user_id'>[]): Promise<ApiResponse<{
    success_count: number;
    error_count: number;
    results: ExpenseRecord[];
    errors: string[];
  }>> {
    const response = await apiClient.post('/functions/v1/api_records', 
      { records }, 
      { params: { action: 'batch' } }
    );
    return response.data;
  },

  async updateRecord(record_id: string, record: Partial<ExpenseRecord>): Promise<ApiResponse<ExpenseRecord>> {
    const response = await apiClient.put('/functions/v1/api_records', { record_id, ...record });
    return response.data;
  },

  async deleteRecord(record_id: string): Promise<ApiResponse<{ success: boolean }>> {
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
};
