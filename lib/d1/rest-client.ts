import { D1DatabaseClient, D1PreparedStatement, D1Result, D1ApiResponse } from './types';

export interface CloudflareD1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

export class CloudflareD1RestClient implements D1DatabaseClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: CloudflareD1Config) {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
    this.headers = {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<D1Result<T>> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sql, params }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cloudflare D1 HTTP Error [${res.status}]: ${errorText}`);
    }

    const data: D1ApiResponse<T> = await res.json();
    if (!data.success || !data.result?.[0]) {
      const err = data.errors?.[0]?.message || 'Unknown D1 query error';
      throw new Error(`Cloudflare D1 Query Failure: ${err}`);
    }

    return data.result[0];
  }

  async first<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const { results } = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async run(sql: string, params: unknown[] = []): Promise<D1Result<never>> {
    return this.query<never>(sql, params);
  }

  async batch<T = Record<string, unknown>>(
    statements: Array<{ sql: string; params?: unknown[] }>
  ): Promise<D1Result<T>[]> {
    const sql = statements.map((s) => s.sql.trim().replace(/;+$/, '')).join('; ');
    const params = statements.flatMap((s) => s.params || []);

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sql, params }),
    });

    const data: D1ApiResponse<T> = await res.json();
    if (!data.success) {
      throw new Error(`Cloudflare D1 Batch Failure: ${data.errors?.[0]?.message || 'Unknown error'}`);
    }

    return data.result;
  }

  async exec(sql: string): Promise<void> {
    await this.query(sql);
  }

  prepare(sql: string): D1PreparedStatement {
    let boundParams: unknown[] = [];
    const client = this;

    const stmt: D1PreparedStatement = {
      bind(...params: unknown[]) {
        boundParams = params;
        return stmt;
      },
      async all<T = Record<string, unknown>>() {
        return client.query<T>(sql, boundParams);
      },
      async first<T = Record<string, unknown>>() {
        return client.first<T>(sql, boundParams);
      },
      async run() {
        return client.run(sql, boundParams);
      },
    };

    return stmt;
  }
}
