import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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

        const today = new Date().toISOString().split("T")[0];
        const token = db.generateQrToken(store.id, store.qrSecret, today);
        const qrPayload = `shimamoto://stamp?store_id=${store.id}&token=${token}&date=${today}`;

        return { token, qrPayload, validUntil: today, storeName: store.name };
      }),

    scan: protectedProcedure
      .input(z.object({
        storeId: z.number(),
        token: z.string(),
        date: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const { storeId, token, date } = input;

        // Get store with secret
        const store = await db.getStoreById(storeId);
        if (!store) throw new Error("店舗が見つかりません");

        // Verify token
        if (!db.verifyQrToken(store.id, store.qrSecret, date, token)) {
          throw new Error("QRコードが無効または期限切れです");
        }

        // Check today's date matches
        const today = new Date().toISOString().split("T")[0];
        if (date !== today) {
          throw new Error("QRコードの有効期限が切れています");
        }

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

        // Record visit
        await db.recordVisit(userId, storeId, newVisitNumber, stampValue, token);

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
