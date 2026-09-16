import { D1DatabaseClient, D1PreparedStatement, D1Result } from './types';

export class LocalNodeSqliteClient implements D1DatabaseClient {
  private db: any = null;
  private memoryTables: Map<string, any[]> = new Map();

  constructor(private dbPath: string = ':memory:') {
    this.init();
  }

  private init() {
    try {
      // Attempt to load Node 22 built-in node:sqlite
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(this.dbPath);
      this.bootstrapTables();
    } catch {
      // Pure in-memory fallback for environments without node:sqlite
      this.db = null;
      this.initMemoryStore();
    }
  }

  private bootstrapTables() {
    if (!this.db) return;
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          api_key TEXT UNIQUE NOT NULL,
          credits_balance INTEGER NOT NULL DEFAULT 25,
          tier TEXT NOT NULL DEFAULT 'free',
          webhook_url TEXT,
          stripe_customer_id TEXT,
          paypal_subscription_id TEXT,
          google_id TEXT UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS companies (
          domain TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          industry TEXT,
          employee_count INTEGER,
          valuation_usd INTEGER,
          address TEXT,
          linkedin_url TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          company_domain TEXT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          full_name TEXT NOT NULL,
          title TEXT,
          email TEXT UNIQUE,
          mobile_phone TEXT,
          direct_dial TEXT,
          linkedin_url TEXT,
          source TEXT DEFAULT 'waterfall',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS user_saved_leads (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          contact_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, contact_id)
        );
      `);
    } catch (e) {
      console.error('[Local D1] Bootstrap error:', e);
    }
  }

  private initMemoryStore() {
    this.memoryTables.set('users', []);
    this.memoryTables.set('companies', []);
    this.memoryTables.set('contacts', []);
    this.memoryTables.set('user_saved_leads', []);
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<D1Result<T>> {
    const startTime = performance.now();

    if (this.db) {
      try {
        const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(sql);
        const stmt = this.db.prepare(sql);

        if (isSelect) {
          const rows = stmt.all(...params) as T[];
          return {
            results: rows,
            success: true,
            meta: {
              duration: performance.now() - startTime,
              changes: 0,
              last_row_id: 0,
            },
          };
        } else {
          const info = stmt.run(...params);
          return {
            results: [],
            success: true,
            meta: {
              duration: performance.now() - startTime,
              changes: Number(info?.changes ?? 0),
              last_row_id: Number(info?.lastInsertRowid ?? 0),
            },
          };
        }
      } catch (err: any) {
        console.error('[Local D1 SQLite Error]:', err.message, 'SQL:', sql);
        throw err;
      }
    }

    // Pure in-memory mock fallback
    return {
      results: [],
      success: true,
      meta: { duration: 0, changes: 0, last_row_id: 0 },
    };
  }

  async first<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const res = await this.query<T>(sql, params);
    return res.results[0] ?? null;
  }

  async run(sql: string, params: unknown[] = []): Promise<D1Result<never>> {
    return this.query<never>(sql, params);
  }

  async batch<T = Record<string, unknown>>(
    statements: Array<{ sql: string; params?: unknown[] }>
  ): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      results.push(await this.query<T>(stmt.sql, stmt.params || []));
    }
    return results;
  }

  async exec(sql: string): Promise<void> {
    if (this.db) {
      this.db.exec(sql);
    }
  }

  prepare(sql: string): D1PreparedStatement {
    let boundParams: unknown[] = [];
    const self = this;

    const stmt: D1PreparedStatement = {
      bind(...params: unknown[]) {
        boundParams = params;
        return stmt;
      },
      async all<T = Record<string, unknown>>() {
        return self.query<T>(sql, boundParams);
      },
      async first<T = Record<string, unknown>>() {
        return self.first<T>(sql, boundParams);
      },
      async run() {
        return self.run(sql, boundParams);
      },
    };

    return stmt;
  }
}
