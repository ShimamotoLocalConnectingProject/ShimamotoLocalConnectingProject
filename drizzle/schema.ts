import { integer, pgEnum, pgTable, text, timestamp, varchar, numeric, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Supports both email/password and OAuth authentication
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // null for OAuth-only users
  name: varchar("name", { length: 255 }),
  role: roleEnum("role").default("user").notNull(),
  emailVerified: timestamp("emailVerified"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * OAuth accounts table - links users to OAuth providers
 */
export const oauthAccounts = pgTable("oauth_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'google', 'github', 'line', etc.
  providerId: varchar("providerId", { length: 255 }).notNull(), // OAuth provider's user ID
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  providerIdx: uniqueIndex("provider_providerId_idx").on(table.provider, table.providerId),
}));

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type InsertOAuthAccount = typeof oauthAccounts.$inferInsert;

/**
 * Stores table - 参加店舗
 */
export const stores = pgTable("stores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 20 }).default("🏪").notNull(),
  color: varchar("color", { length: 20 }).default("#8B4513").notNull(),
  reward: varchar("reward", { length: 500 }).notNull(),
  rewardThreshold: integer("rewardThreshold").default(5).notNull(),
  qrSecret: varchar("qrSecret", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

/**
 * Visits table - 来店記録（スタンプ）
 */
export const visits = pgTable("visits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  storeId: integer("storeId").notNull(),
  stampValue: numeric("stampValue", { precision: 3, scale: 1 }).default("1.0").notNull(),
  visitNumber: integer("visitNumber").default(1).notNull(),
  qrToken: varchar("qrToken", { length: 64 }).notNull(),
  visitedAt: timestamp("visitedAt").defaultNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * Point balance table - ポイント残高
 */
export const pointBalance = pgTable("point_balance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull().unique(),
  balance: numeric("balance", { precision: 10, scale: 1 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PointBalance = typeof pointBalance.$inferSelect;

/**
 * Point history table - ポイント履歴
 */
export const pointHistory = pgTable("point_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  storeId: integer("storeId"),
  delta: numeric("delta", { precision: 10, scale: 1 }).notNull(),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PointHistoryEntry = typeof pointHistory.$inferSelect;

/**
 * Reward usage table - 特典使用履歴
 */
export const rewardUsage = pgTable("reward_usage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  storeId: integer("storeId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type RewardUsageEntry = typeof rewardUsage.$inferSelect;

/**
 * Reward tokens table - 特典使用トークン（QRコード方式）
 */
export const rewardTokens = pgTable("reward_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  storeId: integer("storeId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RewardToken = typeof rewardTokens.$inferSelect;
export type InsertRewardToken = typeof rewardTokens.$inferInsert;

/**
 * Audit logs table - 監査ログ（エンタープライズグレード）
 * すべての重要なアクションを記録（append-only、削除不可）
 */
export const auditActionEnum = pgEnum("audit_action", [
  // 認証系
  "auth.register",
  "auth.login",
  "auth.logout",
  "auth.login_failed",
  // 店舗管理
  "store.create",
  "store.update",
  "store.delete",
  "store.qr_generated",
  // スタンプ・特典
  "stamp.scan",
  "reward.generate_token",
  "reward.verify",
  // フードシェアリング
  "food.create",
  "food.update",
  "food.delete",
  "food.reserve",
  "food.pickup",
  "food.cancel",
  // 管理者
  "admin.access",
  "admin.stats_view",
  "admin.audit_log_view",
]);

export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: integer("userId"), // NULL = 未認証アクション
  userEmail: varchar("userEmail", { length: 320 }), // 非正規化、検索用
  action: auditActionEnum("action").notNull(),
  resource: varchar("resource", { length: 255 }), // 例: "store:123"
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv6対応
  userAgent: varchar("userAgent", { length: 500 }),
  metadata: varchar("metadata", { length: 2000 }), // JSON文字列
  success: integer("success").notNull().default(1), // 1=成功, 0=失敗
  errorMessage: varchar("errorMessage", { length: 500 }),
}, (table) => ({
  timestampIdx: uniqueIndex("audit_logs_timestamp_idx").on(table.timestamp),
  userIdIdx: uniqueIndex("audit_logs_userId_idx").on(table.userId),
  actionIdx: uniqueIndex("audit_logs_action_idx").on(table.action),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Food items table - フードシェアリング商品
 */
export const foodStatusEnum = pgEnum("food_status", ["available", "reserved", "sold_out", "expired"]);

export const foodItems = pgTable("food_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storeId: integer("storeId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  originalPrice: numeric("originalPrice", { precision: 10, scale: 0 }).notNull(),
  discountedPrice: numeric("discountedPrice", { precision: 10, scale: 0 }).notNull(),
  quantity: integer("quantity").notNull(),
  remainingQuantity: integer("remainingQuantity").notNull(),
  expiresAt: timestamp("expiresAt").notNull(), // 受取期限
  imageUrl: varchar("imageUrl", { length: 500 }),
  status: foodStatusEnum("status").default("available").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  storeIdx: uniqueIndex("food_items_storeId_idx").on(table.storeId),
  statusIdx: uniqueIndex("food_items_status_idx").on(table.status),
  expiresIdx: uniqueIndex("food_items_expiresAt_idx").on(table.expiresAt),
}));

export type FoodItem = typeof foodItems.$inferSelect;
export type InsertFoodItem = typeof foodItems.$inferInsert;

/**
 * Food reservations table - フードシェアリング予約
 */
export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "confirmed", 
  "picked_up",
  "cancelled",
  "expired"
]);

export const foodReservations = pgTable("food_reservations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  foodItemId: integer("foodItemId").notNull(),
  userId: integer("userId").notNull(),
  storeId: integer("storeId").notNull(),
  quantity: integer("quantity").notNull(),
  reservationCode: varchar("reservationCode", { length: 64 }).notNull().unique(),
  qrPayload: varchar("qrPayload", { length: 500 }).notNull(),
  status: reservationStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(), // 予約有効期限（30分）
  pickedUpAt: timestamp("pickedUpAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex("food_reservations_userId_idx").on(table.userId),
  foodItemIdx: uniqueIndex("food_reservations_foodItemId_idx").on(table.foodItemId),
  statusIdx: uniqueIndex("food_reservations_status_idx").on(table.status),
  codeIdx: uniqueIndex("food_reservations_code_idx").on(table.reservationCode),
}));

export type FoodReservation = typeof foodReservations.$inferSelect;
export type InsertFoodReservation = typeof foodReservations.$inferInsert;
