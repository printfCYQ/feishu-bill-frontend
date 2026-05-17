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