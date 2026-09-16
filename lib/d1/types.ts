export interface D1Meta {
  duration: number;
  changes: number;
  last_row_id: number;
  changed_db?: boolean;
  size_after?: number;
  rows_read?: number;
  rows_written?: number;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}

export interface D1ApiResponse<T = Record<string, unknown>> {
  result: Array<{
    results: T[];
    success: boolean;
    meta: D1Meta;
  }>;
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
}

export interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result<never>>;
}

export interface D1DatabaseClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<D1Result<never>>;
  batch<T = Record<string, unknown>>(statements: Array<{ sql: string; params?: unknown[] }>): Promise<D1Result<T>[]>;
  exec(sql: string): Promise<void>;
  prepare(sql: string): D1PreparedStatement;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string | null;
  api_key: string;
  credits_balance: number;
  tier: 'free' | 'pro' | 'enterprise';
  webhook_url: string | null;
  stripe_customer_id: string | null;
  paypal_subscription_id: string | null;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}
