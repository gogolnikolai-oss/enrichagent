import { kv } from '@/lib/kv';
import { d1, UserRecord } from '@/lib/d1';
import { CREDIT_COSTS, EnrichmentRequest } from '@/lib/types';

function getCreditKey(userId: string) {
  return `credits:${userId}`;
}

export async function initializeCredits(userId: string, balance: number): Promise<void> {
  const key = getCreditKey(userId);
  await kv.put(key, balance, { expirationTtl: 3600 });
}

export async function getCreditsBalance(userId: string): Promise<number> {
  const key = getCreditKey(userId);
  const cachedBalance = await kv.get<number>(key, 'json');

  if (cachedBalance !== null && typeof cachedBalance === 'number') {
    return cachedBalance;
  }

  // Fallback to Cloudflare D1
  const user = await d1
    .prepare('SELECT credits_balance FROM users WHERE id = ?')
    .bind(userId)
    .first<UserRecord>();

  const dbBalance = user?.credits_balance ?? 0;
  await initializeCredits(userId, dbBalance);
  return dbBalance;
}

export async function checkCredits(userId: string, cost: number): Promise<boolean> {
  const balance = await getCreditsBalance(userId);
  return balance >= cost;
}

/**
 * Atomically decrements credits in Cloudflare D1 with balance floor protection
 */
export async function deductCredits(
  userId: string,
  cost: number
): Promise<{ success: boolean; balance: number }> {
  // Atomic conditional SQLite update: only deducts if credits_balance >= cost
  const result = await d1
    .prepare(
      `UPDATE users
       SET credits_balance = credits_balance - ?, updated_at = datetime('now')
       WHERE id = ? AND credits_balance >= ?`
    )
    .bind(cost, userId, cost)
    .run();

  if (result.meta.changes === 0) {
    const currentBalance = await getCreditsBalance(userId);
    return { success: false, balance: currentBalance };
  }

  // Fetch updated balance and refresh KV cache
  const user = await d1
    .prepare('SELECT credits_balance FROM users WHERE id = ?')
    .bind(userId)
    .first<UserRecord>();

  const newBalance = user?.credits_balance ?? 0;
  await initializeCredits(userId, newBalance);

  return { success: true, balance: newBalance };
}

/**
 * Atomically refunds credits back to user
 */
export async function refundCredits(userId: string, cost: number): Promise<number> {
  await d1
    .prepare(
      `UPDATE users
       SET credits_balance = credits_balance + ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(cost, userId)
    .run();

  const user = await d1
    .prepare('SELECT credits_balance FROM users WHERE id = ?')
    .bind(userId)
    .first<UserRecord>();

  const newBalance = user?.credits_balance ?? 0;
  await initializeCredits(userId, newBalance);

  return newBalance;
}

export function calculateEnrichmentCost(request: EnrichmentRequest): number {
  let cost = CREDIT_COSTS.base;
  cost += CREDIT_COSTS.email;

  if (request.requireMobile) {
    cost += CREDIT_COSTS.mobile;
  }

  if (request.includeCompanyData) {
    cost += CREDIT_COSTS.companyData;
  }

  return cost;
}
