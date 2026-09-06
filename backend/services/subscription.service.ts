import type { PoolClient } from 'pg';
import pool from '../config/postgres.js';

export type PlanName = 'free' | 'pro' | 'max';

export const PLAN_LIMITS: Record<PlanName, { aiAnswersPerMonth: number; mediaFilesPerCard: number }> = {
  free: { aiAnswersPerMonth: 1, mediaFilesPerCard: 0 },
  pro: { aiAnswersPerMonth: 3, mediaFilesPerCard: 1 },
  max: { aiAnswersPerMonth: 5, mediaFilesPerCard: 3 },
};

const PLAN_PRICE_FALLBACKS: Record<Exclude<PlanName, 'free'>, number> = {
  pro: 9900,
  max: 19900,
};

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export const PLAN_PRICES_PAISE: Record<Exclude<PlanName, 'free'>, number> = {
  pro: parsePositiveInteger(process.env.PRO_PLAN_PRICE_PAISE, PLAN_PRICE_FALLBACKS.pro),
  max: parsePositiveInteger(process.env.MAX_PLAN_PRICE_PAISE, PLAN_PRICE_FALLBACKS.max),
};

export function normalisePlan(plan: unknown): PlanName {
  if (plan === 'pro' || plan === 'max') return plan;
  return 'free';
}

function isPlanExpired(plan: PlanName, planExpiresAt: Date | null): boolean {
  if (plan === 'free') return false;
  if (!planExpiresAt) return true;
  return planExpiresAt.getTime() <= Date.now();
}

export async function refreshExpiredPlanForUser(
  userId: string | number,
  client?: PoolClient
): Promise<{ plan: PlanName; plan_expires_at: Date | null }> {
  const db = client ?? pool;

  const userResult = await db.query<{ plan: string | null; plan_expires_at: Date | null }>(
    'SELECT plan, plan_expires_at FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );

  if (!userResult.rows[0]) {
    throw new Error('User not found');
  }

  const currentPlan = normalisePlan(userResult.rows[0].plan);
  const planExpiresAt = userResult.rows[0].plan_expires_at ? new Date(userResult.rows[0].plan_expires_at) : null;

  if (isPlanExpired(currentPlan, planExpiresAt)) {
    await db.query(
      'UPDATE users SET plan = $1, plan_expires_at = NULL, updated_at = NOW() WHERE id = $2',
      ['free', userId]
    );
    return { plan: 'free', plan_expires_at: null };
  }

  return { plan: currentPlan, plan_expires_at: planExpiresAt };
}

export async function countAiUsageThisMonth(
  userId: string | number,
  client?: PoolClient
): Promise<number> {
  const db = client ?? pool;
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*)
     FROM ai_usage
     WHERE user_id = $1
       AND DATE_TRUNC('month', used_at AT TIME ZONE 'Asia/Kolkata')
         = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')`,
    [userId]
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function consumeAiUsageOrThrow(
  userId: string | number
): Promise<{ plan: PlanName; aiUsedThisMonth: number; aiAnswersLimit: number }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query<{ plan: string | null; plan_expires_at: Date | null }>(
      'SELECT plan, plan_expires_at FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (!userResult.rows[0]) {
      throw new Error('User not found');
    }

    let currentPlan = normalisePlan(userResult.rows[0].plan);
    const currentExpiry = userResult.rows[0].plan_expires_at
      ? new Date(userResult.rows[0].plan_expires_at)
      : null;

    if (isPlanExpired(currentPlan, currentExpiry)) {
      await client.query(
        'UPDATE users SET plan = $1, plan_expires_at = NULL, updated_at = NOW() WHERE id = $2',
        ['free', userId]
      );
      currentPlan = 'free';
    }

    const aiAnswersLimit = PLAN_LIMITS[currentPlan].aiAnswersPerMonth;
    const aiUsedThisMonth = await countAiUsageThisMonth(userId, client);

    if (aiUsedThisMonth >= aiAnswersLimit) {
      throw new Error(
        `Monthly AI answer limit reached for ${currentPlan.toUpperCase()} plan (${aiAnswersLimit}/${aiAnswersLimit}).`
      );
    }

    await client.query('INSERT INTO ai_usage (user_id, used_at) VALUES ($1, NOW())', [userId]);

    await client.query('COMMIT');

    return {
      plan: currentPlan,
      aiUsedThisMonth: aiUsedThisMonth + 1,
      aiAnswersLimit,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function getPaidPlanAmount(plan: Exclude<PlanName, 'free'>): number {
  return PLAN_PRICES_PAISE[plan];
}

export function getNextCalendarResetDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1');
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+05:30`;
}

export async function getSubscriptionSnapshot(userId: string | number): Promise<{
  plan: PlanName;
  planExpiresAt: string | null;
  aiUsageThisMonth: number;
  aiAnswersLimit: number;
  mediaFilesLimit: number;
  nextResetAt: string;
}> {
  const { plan, plan_expires_at } = await refreshExpiredPlanForUser(userId);
  const aiUsageThisMonth = await countAiUsageThisMonth(userId);

  return {
    plan,
    planExpiresAt: plan_expires_at ? new Date(plan_expires_at).toISOString() : null,
    aiUsageThisMonth,
    aiAnswersLimit: PLAN_LIMITS[plan].aiAnswersPerMonth,
    mediaFilesLimit: PLAN_LIMITS[plan].mediaFilesPerCard,
    nextResetAt: getNextCalendarResetDate(),
  };
}

export async function assertMediaUploadAllowed(
  userId: string | number,
  incomingFilesCount: number,
  existingFilesCount: number = 0
): Promise<{ plan: PlanName; mediaFilesLimit: number }> {
  const { plan } = await refreshExpiredPlanForUser(userId);
  const mediaFilesLimit = PLAN_LIMITS[plan].mediaFilesPerCard;

  if (incomingFilesCount <= 0) {
    return { plan, mediaFilesLimit };
  }

  if (mediaFilesLimit === 0) {
    throw new Error('Media uploads are not available on FREE plan. Upgrade to PRO or MAX.');
  }

  if (existingFilesCount + incomingFilesCount > mediaFilesLimit) {
    throw new Error(
      `Your ${plan.toUpperCase()} plan allows maximum ${mediaFilesLimit} file(s) per card.`
    );
  }

  return { plan, mediaFilesLimit };
}

export async function activatePaidPlan(
  userId: string | number,
  plan: Exclude<PlanName, 'free'>,
  client?: PoolClient
): Promise<{ plan_expires_at: Date }> {
  const db = client ?? pool;
  const userResult = await db.query<{ plan: string | null; plan_expires_at: Date | null }>(
    'SELECT plan, plan_expires_at FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );

  if (!userResult.rows[0]) {
    throw new Error('User not found');
  }

  const existingPlan = normalisePlan(userResult.rows[0].plan);
  const existingExpiry = userResult.rows[0].plan_expires_at
    ? new Date(userResult.rows[0].plan_expires_at)
    : null;

  const shouldExtendFromExisting =
    existingPlan === plan && !!existingExpiry && existingExpiry.getTime() > Date.now();

  const startFrom = shouldExtendFromExisting ? existingExpiry : new Date();
  const newExpiry = new Date(startFrom);
  newExpiry.setMonth(newExpiry.getMonth() + 1);

  await db.query(
    'UPDATE users SET plan = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3',
    [plan, newExpiry, userId]
  );

  return { plan_expires_at: newExpiry };
}
