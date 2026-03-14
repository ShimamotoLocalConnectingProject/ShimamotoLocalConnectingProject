import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bell, Gift, Clock, Sparkles, AlertCircle } from "lucide-react";
import { registerPushNotifications, isPushSupported } from "@/lib/push";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface NotificationOnboardingProps {
  open: boolean;
  onSuccess: () => void;
  onSkip?: () => void;
}

export default function NotificationOnboarding({
  open,
  onSuccess,
  onSkip,
}: NotificationOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trpcUtils = trpc.useUtils();

  const handleEnableNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await registerPushNotifications(trpcUtils);

      if (result.success) {
        toast.success("通知が有効になりました！");
        onSuccess();
      } else {
        setError(result.error || "通知の登録に失敗しました");
      }
    } catch (err: any) {
      setError(err.message || "予期しないエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (!isPushSupported()) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              通知機能が利用できません
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              お使いのブラウザは通知機能をサポートしていません。
              最新のブラウザ（Chrome、Edge、Firefox、Safari）をご使用いただくと、新商品のお知らせを受け取れます。
            </p>
            {onSkip && (
              <Button onClick={onSkip} variant="outline" className="w-full">
                通知なしで利用する
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
            <Bell className="w-6 h-6 text-amber-500" />
            お得情報を見逃さない！
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            フードシェア機能を最大限に活用するため、通知を有効にしてください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Sparkles className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">新着商品の即時通知</h3>
                <p className="text-sm text-amber-700">
                  お店が新しい商品を登録したらすぐにお知らせ
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">期限切れ前のリマインダー</h3>
                <p className="text-sm text-orange-700">
                  お得な商品の期限が近づいたらアラート
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <Gift className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">予約の受取リマインダー</h3>
                <p className="text-sm text-green-700">
                  予約した商品の受取期限をお知らせ
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
              <div className="text-xs text-red-700 mt-3 space-y-2">
                <p className="font-medium">✅ 解除方法（Edge / Chrome）：</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>アドレスバー左の <strong>🔒マーク</strong> をクリック</li>
                  <li><strong>「通知」</strong> を <strong>「許可」</strong> に変更</li>
                  <li>ページをリロード（F5）</li>
                </ol>
                <p className="mt-2 text-red-600">
                  または設定 → プライバシー → サイトの設定 → 通知 で
                  <strong> slcpv1.onrender.com </strong>をブロックから削除
                </p>
              </div>
            </div>
          )}

          {/* Important notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">
              📱 通知について
            </p>
            <p className="text-xs text-blue-700">
              新商品や期限切れ前のお得情報をリアルタイムで受け取れます。
              通知は後から設定画面でいつでもON/OFFできます。通知なしでも商品の閲覧・予約は可能です。
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleEnableNotifications}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-6"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                設定中...
              </>
            ) : (
              <>
                <Bell className="w-5 h-5 mr-2" />
                通知を許可して始める
              </>
            )}
          </Button>

          {onSkip && (
            <Button
              onClick={onSkip}
              variant="ghost"
              className="text-gray-500 text-sm hover:text-gray-700"
              disabled={loading}
            >
              後で設定する（スキップ）
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-gray-500">
          通知を許可すると、ブラウザの通知設定ダイアログが表示されます
        </p>
      </DialogContent>
    </Dialog>
  );
}
