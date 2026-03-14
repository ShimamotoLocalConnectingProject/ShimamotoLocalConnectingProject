import { eq, and, gte, lte, sql, desc, count, sum, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users,
  stores, InsertStore, Store,
  visits, InsertVisit,
  pointBalance,
  pointHistory,
  rewardUsage,
  rewardTokens, InsertRewardToken,
  auditLogs, InsertAuditLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import crypto from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Initialize DB connection immediately if DATABASE_URL is available
if (process.env.DATABASE_URL) {
  try {
    _client = postgres(process.env.DATABASE_URL);
    _db = drizzle(_client);
  } catch (error) {
    console.warn("[Database] Failed to connect:", error);
  }
}

// Export db instance directly (for sync usage in auth)
export const db = _db!;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL);
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================
// User helpers
// ============================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// Store helpers
// ============================================================
export async function getAllStores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stores).orderBy(stores.createdAt);
}

export async function getStoreById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createStore(data: Omit<InsertStore, "qrSecret">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const qrSecret = crypto.randomUUID();
  const result = await db.insert(stores).values({ ...data, qrSecret });
  const insertId = result[0].insertId;
  return getStoreById(insertId);
}

export async function updateStore(id: number, data: Partial<Pick<Store, "name" | "category" | "icon" | "color" | "reward" | "rewardThreshold">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stores).set(data).where(eq(stores.id, id));
  return getStoreById(id);
}

export async function deleteStore(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related records first
  await db.delete(visits).where(eq(visits.storeId, id));
  await db.delete(rewardUsage).where(eq(rewardUsage.storeId, id));
  await db.delete(pointHistory).where(eq(pointHistory.storeId, id));
  await db.delete(stores).where(eq(stores.id, id));
}

// ============================================================
// QR Token helpers
// ============================================================
export function generateQrToken(storeId: number, qrSecret: string, date: string): string {
  const message = `${storeId}:${date}:${qrSecret}`;
  return crypto.createHash("sha256").update(message).digest("hex").slice(0, 32);
}

export function verifyQrToken(storeId: number, qrSecret: string, date: string, token: string): boolean {
  const expected = generateQrToken(storeId, qrSecret, date);
  return token === expected;
}

// ============================================================
// Visit / Stamp helpers
// ============================================================
export async function getUserVisitsForStore(userId: number, storeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visits)
    .where(and(eq(visits.userId, userId), eq(visits.storeId, storeId)))
    .orderBy(visits.visitedAt);
}

export async function getUserAllVisits(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visits)
    .where(eq(visits.userId, userId))
    .orderBy(visits.visitedAt);
}

export async function hasStampedToday(userId: number, storeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const result = await db.select({ cnt: count() }).from(visits)
    .where(and(
      eq(visits.userId, userId),
      eq(visits.storeId, storeId),
      gte(visits.visitedAt, todayStart),
      lte(visits.visitedAt, todayEnd),
    ));
  return (result[0]?.cnt ?? 0) > 0;
}

export async function getVisitCountForStore(userId: number, storeId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ cnt: count() }).from(visits)
    .where(and(eq(visits.userId, userId), eq(visits.storeId, storeId)));
  return result[0]?.cnt ?? 0;
}

export function calcStampValue(visitNumber: number): number {
  return visitNumber <= 2 ? 1.0 : 0.5;
}

export async function recordVisit(userId: number, storeId: number, visitNumber: number, stampValue: number, qrToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(visits).values({
    userId,
    storeId,
    stampValue: stampValue.toFixed(1),
    visitNumber,
    qrToken,
  });
}

export async function getTotalStampsForStore(userId: number, storeId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: sum(visits.stampValue) }).from(visits)
    .where(and(eq(visits.userId, userId), eq(visits.storeId, storeId)));
  return parseFloat(result[0]?.total ?? "0");
}

export async function deleteVisitsForStore(userId: number, storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(visits).where(and(eq(visits.userId, userId), eq(visits.storeId, storeId)));
}

// ============================================================
// Point helpers
// ============================================================
export async function getPointBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(pointBalance).where(eq(pointBalance.userId, userId)).limit(1);
  return parseFloat(result[0]?.balance ?? "0");
}

export async function addPoints(userId: number, storeId: number | null, delta: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Upsert balance
  const existing = await db.select().from(pointBalance).where(eq(pointBalance.userId, userId)).limit(1);
  const currentBalance = parseFloat(existing[0]?.balance ?? "0");
  const newBalance = currentBalance + delta;

  if (existing.length === 0) {
    await db.insert(pointBalance).values({ userId, balance: newBalance.toFixed(1) });
  } else {
    await db.update(pointBalance).set({ balance: newBalance.toFixed(1) }).where(eq(pointBalance.userId, userId));
  }

  // Record history
  await db.insert(pointHistory).values({
    userId,
    storeId,
    delta: delta.toFixed(1),
    reason,
  });

  return newBalance;
}

export async function getPointHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pointHistory)
    .where(eq(pointHistory.userId, userId))
    .orderBy(desc(pointHistory.createdAt))
    .limit(20);
}

// ============================================================
// Reward helpers
// ============================================================
export async function recordRewardUsage(userId: number, storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(rewardUsage).values({ userId, storeId });
}

// ============================================================
// Stats helpers (admin)
// ============================================================
export async function getStats() {
  const db = await getDb();
  if (!db) return { storeCount: 0, stampCount: 0, rewardCount: 0 };

  const [storeResult, stampResult, rewardResult] = await Promise.all([
    db.select({ cnt: count() }).from(stores),
    db.select({ cnt: count() }).from(visits),
    db.select({ cnt: count() }).from(rewardUsage),
  ]);

  return {
    storeCount: storeResult[0]?.cnt ?? 0,
    stampCount: stampResult[0]?.cnt ?? 0,
    rewardCount: rewardResult[0]?.cnt ?? 0,
  };
}

// ============================================================
// Reward Token helpers (QR code redemption)
// ============================================================

/**
 * Generate a unique reward token for QR code redemption
 */
export async function generateRewardToken(userId: number, storeId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Invalidate any existing unused tokens for this user+store
  await db.update(rewardTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(rewardTokens.userId, userId),
        eq(rewardTokens.storeId, storeId),
        isNull(rewardTokens.usedAt)
      )
    );

  // Generate new token (UUID v4)
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.insert(rewardTokens).values({
    userId,
    storeId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Verify and use a reward token
 * Returns token data if valid, throws error otherwise
 */
export async function verifyAndUseRewardToken(token: string, storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find token
  const result = await db.select()
    .from(rewardTokens)
    .where(eq(rewardTokens.token, token))
    .limit(1);

  const rewardToken = result[0];
  if (!rewardToken) {
    throw new Error("無効なトークンです");
  }

  // Check if already used
  if (rewardToken.usedAt) {
    throw new Error("このトークンは既に使用済みです");
  }

  // Check expiration
  if (new Date() > rewardToken.expiresAt) {
    throw new Error("トークンの有効期限が切れています");
  }

  // Check store match
  if (rewardToken.storeId !== storeId) {
    throw new Error("このトークンは他の店舗用です");
  }

  // Mark as used
  await db.update(rewardTokens)
    .set({ usedAt: new Date() })
    .where(eq(rewardTokens.id, rewardToken.id));

  return rewardToken;
}

// ============================================================
// Audit Log helpers (Enterprise-grade logging)
// ============================================================

interface AuditLogParams {
  action: InsertAuditLog['action'];
  userId?: number;
  userEmail?: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

/**
 * 監査ログを非同期で記録（append-only）
 * すべての重要なアクションを記録し、削除不可
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  const db = await getDb();
  if (!db) {
    // データベース接続失敗時もコンソールに記録
    console.warn("[Audit] Failed to write audit log (DB unavailable):", params);
    return;
  }

  try {
    await db.insert(auditLogs).values({
      timestamp: new Date(),
      userId: params.userId ?? null,
      userEmail: params.userEmail ?? null,
      action: params.action,
      resource: params.resource ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      success: params.success === false ? 0 : 1,
      errorMessage: params.errorMessage ?? null,
    });
  } catch (error) {
    // 監査ログ書き込み失敗もコンソールに記録
    console.error("[Audit] Failed to write audit log:", error, params);
  }
}

/**
 * 監査ログを取得（管理者専用）
 * ページネーション対応
 */
export async function getAuditLogs(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit)
    .offset(offset);
}

/**
 * 特定ユーザーの監査ログを取得
 */
export async function getAuditLogsByUser(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}
