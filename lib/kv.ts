/**
 * Cloudflare KV Client & Edge Rate Limiting
 * EnrichAgent SaaS
 */

export interface KVClient {
  get<T = string>(key: string, type?: 'text' | 'json'): Promise<T | null>;
  put(key: string, value: unknown, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

class CloudflareKVRestClient implements KVClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(accountId: string, namespaceId: string, apiToken: string) {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values`;
    this.headers = { Authorization: `Bearer ${apiToken}` };
  }

  async get<T = string>(key: string, type: 'text' | 'json' = 'text'): Promise<T | null> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`KV GET failed: ${res.statusText}`);

    return type === 'json' ? ((await res.json()) as T) : ((await res.text()) as unknown as T);
  }

  async put(key: string, value: unknown, options?: { expirationTtl?: number }): Promise<void> {
    const url = new URL(`${this.baseUrl}/${encodeURIComponent(key)}`);
    if (options?.expirationTtl) {
      url.searchParams.set('expiration_ttl', String(options.expirationTtl));
    }

    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    const contentType = typeof value === 'string' ? 'text/plain' : 'application/json';

    const res = await fetch(url.toString(), {
      method: 'PUT',
      headers: { ...this.headers, 'Content-Type': contentType },
      body: payload,
    });
    if (!res.ok) throw new Error(`KV PUT failed: ${res.statusText}`);
  }

  async delete(key: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok && res.status !== 404) throw new Error(`KV DELETE failed: ${res.statusText}`);
  }
}

class MockKVClient implements KVClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get<T = string>(key: string, type: 'text' | 'json' = 'text'): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return type === 'json' ? JSON.parse(item.value) : (item.value as unknown as T);
  }

  async put(key: string, value: unknown, options?: { expirationTtl?: number }): Promise<void> {
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined;
    this.store.set(key, { value: strVal, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

export const kv: KVClient =
  accountId && namespaceId && apiToken
    ? new CloudflareKVRestClient(accountId, namespaceId, apiToken)
    : new MockKVClient();

/**
 * Sliding Window Edge Rate Limiter
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 10
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${identifier}:${Math.floor(now / windowSeconds)}`;

  const currentCount = (await kv.get<number>(windowKey, 'json')) || 0;
  const reset = (Math.floor(now / windowSeconds) + 1) * windowSeconds;

  if (currentCount >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset,
    };
  }

  await kv.put(windowKey, currentCount + 1, { expirationTtl: windowSeconds * 2 });

  return {
    success: true,
    limit,
    remaining: limit - (currentCount + 1),
    reset,
  };
}

export const apiRateLimiter = {
  limit: (id: string) => checkRateLimit(`api:${id}`, 20, 10),
};

export const enrichRateLimiter = {
  limit: (id: string) => checkRateLimit(`enrich:${id}`, 10, 10),
};
