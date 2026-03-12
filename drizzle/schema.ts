import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Stores table - 参加店舗
 */
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 20 }).default("🏪").notNull(),
  color: varchar("color", { length: 20 }).default("#8B4513").notNull(),
  reward: varchar("reward", { length: 500 }).notNull(),
  rewardThreshold: int("rewardThreshold").default(5).notNull(),
  qrSecret: varchar("qrSecret", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

/**
 * Visits table - 来店記録（スタンプ）
 */
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  storeId: int("storeId").notNull(),
  stampValue: decimal("stampValue", { precision: 3, scale: 1 }).default("1.0").notNull(),
  visitNumber: int("visitNumber").default(1).notNull(),
  qrToken: varchar("qrToken", { length: 64 }).notNull(),
  visitedAt: timestamp("visitedAt").defaultNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * Point balance table - ポイント残高
 */
export const pointBalance = mysqlTable("point_balance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 1 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PointBalance = typeof pointBalance.$inferSelect;

/**
 * Point history table - ポイント履歴
 */
export const pointHistory = mysqlTable("point_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  storeId: int("storeId"),
  delta: decimal("delta", { precision: 10, scale: 1 }).notNull(),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PointHistoryEntry = typeof pointHistory.$inferSelect;

/**
 * Reward usage table - 特典使用履歴
 */
export const rewardUsage = mysqlTable("reward_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  storeId: int("storeId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type RewardUsageEntry = typeof rewardUsage.$inferSelect;
