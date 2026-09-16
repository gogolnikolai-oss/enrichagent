import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// A simple in-memory mock for local development without Upstash credentials
class MockRedis {
  private store = new Map<string, string | number>();

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string | number) {
    this.store.set(key, value);
    return 'OK';
  }

  async incr(key: string) {
    const val = Number(this.store.get(key) || 0) + 1;
    this.store.set(key, val);
    return val;
  }
  
  async eval(script: string, keys: string[], args: (string | number)[]) {
    // Basic mock for the deduct script
    if (script.includes('DECRBY')) {
      const current = Number(this.store.get(keys[0]) || 0);
      const cost = Number(args[0]);
      if (current >= cost) {
        const newVal = current - cost;
        this.store.set(keys[0], newVal);
        return newVal;
      }
      return -1;
    }
    return null;
  }
  
  // Minimal stubs for ratelimit compatibility
  sadd() { return 1; }
  srem() { return 1; }
  zadd() { return 1; }
  zremrangebyscore() { return 1; }
  zcard() { return 1; }
  expire() { return 1; }
  pexpire() { return 1; }
  pttl() { return 1; }
  pipeline() {
    return {
      exec: async () => [],
      set: () => this,
      pexpire: () => this,
      zadd: () => this,
      zremrangebyscore: () => this,
      zcard: () => this,
      expire: () => this,
    };
  }
}

const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client
export const redis = hasUpstash 
  ? Redis.fromEnv() 
  : new MockRedis() as unknown as Redis;

// Rate limiters
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit/api',
});

export const enrichRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit/enrich',
});
