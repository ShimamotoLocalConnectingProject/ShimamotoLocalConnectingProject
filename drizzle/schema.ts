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
