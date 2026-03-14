import { trpc } from "@/lib/trpc";

/**
 * Base64 URL-safe encoding
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Service Workerを登録
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Push] Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('[Push] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Push通知のサポート状況をチェック
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * 通知許可状態を取得
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * 通知許可をリクエスト
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[Push] Notification permission:', permission);
  return permission;
}

/**
 * Push通知をサブスクライブ
 */
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications not supported');
    return null;
  }

  // Service Worker登録
  const registration = await registerServiceWorker();
  if (!registration) {
    console.error('[Push] Service Worker registration failed');
    return null;
  }

  // 既存のサブスクリプションをチェック
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    console.log('[Push] Already subscribed:', subscription);
    return subscription;
  }

  // 新規サブスクリプション
  try {
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
    console.log('[Push] Subscribed:', subscription);
    return subscription;
  } catch (error) {
    console.error('[Push] Failed to subscribe:', error);
    return null;
  }
}

/**
 * Push通知をアンサブスクライブ
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return false;
    }

    const result = await subscription.unsubscribe();
    console.log('[Push] Unsubscribed:', result);
    return result;
  } catch (error) {
    console.error('[Push] Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * 完全な通知登録フロー
 */
export async function registerPushNotifications(
  trpcClient: ReturnType<typeof trpc.useUtils>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. サポート状況チェック
    if (!isPushSupported()) {
      return { success: false, error: 'お使いのブラウザは通知をサポートしていません' };
    }

    // 2. 通知許可リクエスト
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, error: '通知の許可が必要です' };
    }

    // 3. VAPID公開鍵取得
    const { publicKey } = await trpcClient.client.notification.vapidPublicKey.query();
    if (!publicKey) {
      return { success: false, error: 'サーバー設定エラー（VAPID鍵が未設定）' };
    }

    // 4. Push通知サブスクライブ
    const subscription = await subscribeToPush(publicKey);
    if (!subscription) {
      return { success: false, error: 'Push通知の登録に失敗しました' };
    }

    // 5. サーバーに登録
    const subscriptionJson = subscription.toJSON();
    await trpcClient.client.notification.subscribe.mutate({
      endpoint: subscriptionJson.endpoint!,
      keys: {
        p256dh: subscriptionJson.keys!.p256dh!,
        auth: subscriptionJson.keys!.auth!,
      },
    });

    console.log('[Push] Registration complete');
    return { success: true };
  } catch (error: any) {
    console.error('[Push] Registration failed:', error);
    return { success: false, error: error.message || '通知の登録に失敗しました' };
  }
}

/**
 * 通知登録状態をチェック
 */
export async function checkPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('[Push] Failed to check subscription:', error);
    return false;
  }
}
