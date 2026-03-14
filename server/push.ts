import webpush from "web-push";
import * as db from "./db";
import { logAudit } from "./db";

// VAPID keys (環境変数から取得、なければ生成)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@shimamoto-stamp.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn("[Push] VAPID keys not configured. Push notifications will not work.");
  console.warn("[Push] Generate keys with: npx web-push generate-vapid-keys");
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * 単一ユーザーにPush通知を送信
 */
export async function sendPushNotificationToUser(
  userId: number,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  const subscriptions = await db.getUserPushSubscriptions(userId);
  
  if (subscriptions.length === 0) {
    console.log(`[Push] No subscriptions found for user ${userId}`);
    return { success: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
        
        // Log audit
        await logAudit({
          action: "notification.sent",
          userId,
          resource: `push:${sub.id}`,
          metadata: { title: payload.title },
          success: true,
        });

        return { success: true };
      } catch (error: any) {
        // 410 Gone = サブスクリプション期限切れ → 削除
        if (error.statusCode === 410) {
          console.log(`[Push] Subscription expired, removing: ${sub.endpoint}`);
          await db.deletePushSubscription(sub.endpoint);
        }
        
        // Log audit
        await logAudit({
          action: "notification.sent",
          userId,
          resource: `push:${sub.id}`,
          success: false,
          errorMessage: error.message,
        });

        return { success: false, error };
      }
    })
  );

  const success = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
  const failed = results.length - success;

  return { success, failed };
}

/**
 * 全ユーザーにPush通知を送信（新規商品通知など）
 */
export async function sendPushNotificationToAll(
  payload: PushNotificationPayload,
  filterByPreference?: keyof db.NotificationPreference
): Promise<{ success: number; failed: number }> {
  const subscriptions = await db.getAllPushSubscriptions();
  
  if (subscriptions.length === 0) {
    console.log("[Push] No subscriptions found");
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const sub of subscriptions) {
    // 通知設定チェック
    if (filterByPreference) {
      const prefs = await db.getNotificationPreferences(sub.userId);
      const enabled = prefs[filterByPreference];
      if (!enabled) {
        console.log(`[Push] User ${sub.userId} has disabled ${filterByPreference}`);
        continue;
      }
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      
      successCount++;

      // Log audit
      await logAudit({
        action: "notification.sent",
        userId: sub.userId,
        resource: `push:${sub.id}`,
        metadata: { title: payload.title },
        success: true,
      });
    } catch (error: any) {
      failedCount++;
      
      // 410 Gone = サブスクリプション期限切れ → 削除
      if (error.statusCode === 410) {
        console.log(`[Push] Subscription expired, removing: ${sub.endpoint}`);
        await db.deletePushSubscription(sub.endpoint);
      }

      // Log audit
      await logAudit({
        action: "notification.sent",
        userId: sub.userId,
        resource: `push:${sub.id}`,
        success: false,
        errorMessage: error.message,
      });
    }
  }

  return { success: successCount, failed: failedCount };
}

/**
 * 新規商品登録時の通知
 */
export async function notifyNewFoodItem(item: db.FoodItem, store: db.Store): Promise<void> {
  const discount = Math.round(
    ((parseFloat(item.originalPrice) - parseFloat(item.discountedPrice)) /
      parseFloat(item.originalPrice)) *
      100
  );

  await sendPushNotificationToAll(
    {
      title: "🍱 新着フードシェア",
      body: `${store.icon} ${store.name}：${item.title} ¥${parseInt(item.discountedPrice).toLocaleString()} (${discount}% OFF)`,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      data: {
        url: "/food-share",
        foodItemId: item.id,
      },
      tag: `new-food-${item.id}`,
    },
    "newProductsEnabled"
  );
}

/**
 * 期限近商品アラート
 */
export async function notifyExpiringFoodItem(item: db.FoodItem, store: db.Store): Promise<void> {
  await sendPushNotificationToAll(
    {
      title: "⏰ まもなく期限切れ",
      body: `${store.icon} ${item.title} があと2時間で期限切れです`,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      data: {
        url: "/food-share",
        foodItemId: item.id,
      },
      tag: `expiring-${item.id}`,
      requireInteraction: true,
    },
    "expiringItemsEnabled"
  );
}

/**
 * 予約期限リマインダー
 */
export async function notifyReservationReminder(
  reservation: db.FoodReservation,
  item: db.FoodItem
): Promise<void> {
  await sendPushNotificationToUser(reservation.userId, {
    title: "🏃 受取期限が近づいています",
    body: `予約番号 ${reservation.reservationCode.slice(0, 8)} の受取期限まであと10分です`,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: {
      url: "/food-share",
      reservationId: reservation.id,
    },
    tag: `reminder-${reservation.id}`,
    requireInteraction: true,
  });
}
