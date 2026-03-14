import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Bell, Sparkles, Clock, Gift, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { checkPushSubscription } from "@/lib/push";

export default function NotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const prefsQuery = trpc.notification.preferences.useQuery();
  const updatePrefsMutation = trpc.notification.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("設定を更新しました");
      prefsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    checkPushSubscription().then(setIsSubscribed);
  }, []);

  const handleToggle = (
    key: "newProductsEnabled" | "expiringItemsEnabled" | "reservationRemindersEnabled"
  ) => {
    if (!prefsQuery.data) return;

    updatePrefsMutation.mutate({
      [key]: !prefsQuery.data[key],
    });
  };

  if (!isSubscribed) {
    return (
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            通知設定
          </CardTitle>
          <CardDescription>
            通知機能が有効になっていません
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              フードシェア画面から通知を有効にしてください
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (prefsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const prefs = prefsQuery.data;

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          通知設定
        </CardTitle>
        <CardDescription>
          受け取りたい通知の種類を選択してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Products */}
        <div className="flex items-start justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3 flex-1">
            <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <Label className="text-base font-semibold text-amber-900 cursor-pointer">
                新着商品通知
              </Label>
              <p className="text-sm text-amber-700 mt-1">
                お店が新しい商品を登録したらお知らせ
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("newProductsEnabled")}
            disabled={updatePrefsMutation.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              prefs?.newProductsEnabled ? "bg-amber-500" : "bg-gray-300"
            }`}
            role="switch"
            aria-checked={prefs?.newProductsEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs?.newProductsEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Expiring Items */}
        <div className="flex items-start justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3 flex-1">
            <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <Label className="text-base font-semibold text-orange-900 cursor-pointer">
                期限切れアラート
              </Label>
              <p className="text-sm text-orange-700 mt-1">
                商品の期限が近づいたらお知らせ（2時間前）
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("expiringItemsEnabled")}
            disabled={updatePrefsMutation.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              prefs?.expiringItemsEnabled ? "bg-orange-500" : "bg-gray-300"
            }`}
            role="switch"
            aria-checked={prefs?.expiringItemsEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs?.expiringItemsEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Reservation Reminders */}
        <div className="flex items-start justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3 flex-1">
            <Gift className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <Label className="text-base font-semibold text-green-900 cursor-pointer">
                予約リマインダー
              </Label>
              <p className="text-sm text-green-700 mt-1">
                予約の受取期限が近づいたらお知らせ（10分前）
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("reservationRemindersEnabled")}
            disabled={updatePrefsMutation.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              prefs?.reservationRemindersEnabled ? "bg-green-500" : "bg-gray-300"
            }`}
            role="switch"
            aria-checked={prefs?.reservationRemindersEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                prefs?.reservationRemindersEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Warning */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 すべての通知をOFFにすると、フードシェア機能の利便性が低下します。
            お得な情報を見逃さないために、少なくとも「新着商品通知」はONにすることをおすすめします。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
