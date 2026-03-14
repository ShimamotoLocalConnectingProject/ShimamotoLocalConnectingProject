import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { logAudit } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      // JWT logout is handled client-side by removing token
      return { success: true } as const;
    }),
  }),

  // ============================================================
  // Store routes
  // ============================================================
  store: router({
    list: publicProcedure.query(async () => {
      const allStores = await db.getAllStores();
      // Don't expose qrSecret to clients
      return allStores.map(({ qrSecret, ...rest }) => rest);
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        icon: z.string().default("🏪"),
        color: z.string().default("#8B4513"),
        reward: z.string().min(1),
        rewardThreshold: z.number().int().min(1).max(20).default(5),
      }))
      .mutation(async ({ input }) => {
        const store = await db.createStore(input);
        if (!store) throw new Error("Failed to create store");
        const { qrSecret, ...rest } = store;
        return rest;
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        reward: z.string().optional(),
        rewardThreshold: z.number().int().min(1).max(20).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const store = await db.updateStore(id, data);
        if (!store) throw new Error("Store not found");
        const { qrSecret, ...rest } = store;
        return rest;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteStore(input.id);
        return { success: true };
      }),
  }),

  // ============================================================
  // QR code routes
  // ============================================================
  qr: router({
    generate: adminProcedure
      .input(z.object({ storeId: z.number() }))
      .mutation(async ({ input }) => {
        const store = await db.getStoreById(input.storeId);
        if (!store) throw new Error("Store not found");

        // Simple QR code: just store ID (永続的、印刷1回のみ)
        const qrPayload = `shimamoto://stamp?store_id=${store.id}`;

        return { qrPayload, storeName: store.name, storeId: store.id };
      }),

    scan: protectedProcedure
      .input(z.object({
        storeId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const { storeId } = input;

        // Get store
        const store = await db.getStoreById(storeId);
        if (!store) throw new Error("店舗が見つかりません");

        // Check if already stamped today
        const alreadyStamped = await db.hasStampedToday(userId, storeId);
        if (alreadyStamped) {
          throw new Error("本日はすでに来店済みです");
        }

        // Get visit count and calculate stamp value
        const currentCount = await db.getVisitCountForStore(userId, storeId);
        const newVisitNumber = currentCount + 1;
        const stampValue = db.calcStampValue(newVisitNumber);
        const pointsDelta = stampValue * 10;

        // Record visit (token is now just storeId for tracking)
        const visitToken = `store-${storeId}-${new Date().toISOString()}`;
        await db.recordVisit(userId, storeId, newVisitNumber, stampValue, visitToken);

        // Add points
        const newBalance = await db.addPoints(userId, storeId, pointsDelta, `${store.name}来店（${newVisitNumber}回目）`);

        // Get total stamps for reward check
        const totalStamps = await db.getTotalStampsForStore(userId, storeId);
        const hasReward = totalStamps >= store.rewardThreshold;

        return {
          success: true,
          stampValue,
          visitNumber: newVisitNumber,
          pointsEarned: pointsDelta,
          newBalance,
          totalStamps,
          hasReward,
          storeName: store.name,
        };
      }),
  }),

  // ============================================================
  // Stamp / Visit data routes
  // ============================================================
  stamp: router({
    myData: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const allVisits = await db.getUserAllVisits(userId);
      const today = new Date();
      const todayStr = today.toDateString();

      // Build stamp map: { storeId: { visits, total, stampedToday } }
      const stampMap: Record<number, { visits: number; total: number; stampedToday: boolean }> = {};
      for (const v of allVisits) {
        if (!stampMap[v.storeId]) {
          stampMap[v.storeId] = { visits: 0, total: 0, stampedToday: false };
        }
        stampMap[v.storeId].visits += 1;
        stampMap[v.storeId].total += parseFloat(v.stampValue);
        if (new Date(v.visitedAt).toDateString() === todayStr) {
          stampMap[v.storeId].stampedToday = true;
        }
      }

      const balance = await db.getPointBalance(userId);

      return { stampMap, balance };
    }),

    pointHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getPointHistory(ctx.user.id);
    }),
  }),

  // ============================================================
  // Reward routes
  // ============================================================
  reward: router({
    // Generate QR code token for reward redemption (user side)
    generateToken: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const { storeId } = input;

        // Get store
        const store = await db.getStoreById(storeId);
        if (!store) throw new Error("店舗が見つかりません");

        // Check if user has enough stamps
        const totalStamps = await db.getTotalStampsForStore(userId, storeId);
        if (totalStamps < store.rewardThreshold) {
          throw new Error(`特典を使用するには${store.rewardThreshold}スタンプ必要です（現在: ${totalStamps}）`);
        }

        // Generate token
        const token = await db.generateRewardToken(userId, storeId);
        
        // Create QR payload
        const qrPayload = `shimamoto://reward?token=${token}`;

        return {
          token,
          qrPayload,
          storeName: store.name,
          expiresIn: 300, // 5 minutes in seconds
        };
      }),

    // Verify and use reward token (store side)
    verifyToken: adminProcedure
      .input(z.object({ token: z.string(), storeId: z.number() }))
      .mutation(async ({ input }) => {
        const { token, storeId } = input;

        // Verify token
        const rewardToken = await db.verifyAndUseRewardToken(token, storeId);
        const userId = rewardToken.userId;

        // Get store
        const store = await db.getStoreById(storeId);
        if (!store) throw new Error("店舗が見つかりません");

        // Record reward usage
        await db.recordRewardUsage(userId, storeId);

        // Reset stamps for this store
        await db.deleteVisitsForStore(userId, storeId);

        return {
          success: true,
          storeName: store.name,
          userId,
        };
      }),

    // Legacy: Direct use without token (deprecated, kept for backward compatibility)
    use: protectedProcedure
      .input(z.object({ storeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const { storeId } = input;

        // Record reward usage
        await db.recordRewardUsage(userId, storeId);

        // Reset stamps for this store
        await db.deleteVisitsForStore(userId, storeId);

        return { success: true };
      }),
  }),

  // ============================================================
  // Admin stats
  // ============================================================
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
