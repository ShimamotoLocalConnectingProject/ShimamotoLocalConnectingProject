import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StampCard from "@/components/StampCard";
import QRScanner from "@/components/QRScanner";
import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { Camera, LogOut, Settings, Gift, Coins, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [scanning, setScanning] = useState(false);
  const [activeCategory, setActiveCategory] = useState("すべて");
  const [shownReward, setShownReward] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  // Data queries
  const storesQuery = trpc.store.list.useQuery();
  const stampQuery = trpc.stamp.myData.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const stores = storesQuery.data ?? [];
  const stampMap = stampQuery.data?.stampMap ?? {};
  const balance = stampQuery.data?.balance ?? 0;

  // Mutations
  const scanMutation = trpc.qr.scan.useMutation({
    onSuccess: (data) => {
      setScanResult(data);
      stampQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const useRewardMutation = trpc.reward.use.useMutation({
    onSuccess: () => {
      stampQuery.refetch();
      setShownReward(null);
      toast.success("特典を使用しました！");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Derived data
  const totalStamps = useMemo(() => {
    return Object.values(stampMap).reduce((s: number, d: any) => s + d.total, 0);
  }, [stampMap]);

  const rewardStores = useMemo(() => {
    return stores.filter((s) => (stampMap[s.id]?.total || 0) >= s.rewardThreshold);
  }, [stores, stampMap]);

  const allCategories = useMemo(() => {
    const cats = new Set(stores.map((s) => s.category));
    return ["すべて", ...Array.from(cats)];
  }, [stores]);

  const filteredStores = useMemo(() => {
    if (activeCategory === "すべて") return stores;
    return stores.filter((s) => s.category === activeCategory);
  }, [stores, activeCategory]);

  const visitedCount = useMemo(() => {
    return Object.values(stampMap).filter((d: any) => d.total > 0).length;
  }, [stampMap]);

  // Handlers
  const handleQRScan = useCallback(
    (raw: string) => {
      setScanning(false);
      if (!isAuthenticated) {
        toast.error("先にログインしてください");
        return;
      }
      try {
        const url = new URL(raw.replace("shimamoto://stamp", "https://dummy/stamp"));
        const storeId = url.searchParams.get("store_id");
        if (!storeId) {
          toast.error("無効なQRコードです");
          return;
        }
        // 新しいシステム: storeIdのみで送信
        scanMutation.mutate({ storeId: parseInt(storeId) });
      } catch {
        toast.error("QRコードの読み取りに失敗しました");
      }
    },
    [isAuthenticated, scanMutation]
  );

  const handleUseReward = useCallback(
    (store: any) => {
      useRewardMutation.mutate({ storeId: store.id });
    },
    [useRewardMutation]
  );

  // Loading state
  if (authLoading || storesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-50 to-warm-100">
        <div className="bg-gradient-to-r from-warm-900 to-warm-800 p-5 pb-4">
          <Skeleton className="h-4 w-24 bg-warm-700/50 mb-2" />
          <Skeleton className="h-7 w-40 bg-warm-700/50" />
        </div>
        <div className="p-4 max-w-lg mx-auto space-y-3">
          <Skeleton className="h-36 rounded-2xl bg-warm-200/50" />
          <Skeleton className="h-14 rounded-2xl bg-warm-200/50" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl bg-warm-200/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50 to-warm-100">
      {/* QR Scanner overlay */}
      {scanning && (
        <QRScanner onScan={handleQRScan} onClose={() => setScanning(false)} />
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-warm-900 to-warm-800 px-5 pt-5 pb-4 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[4px] text-gold-500 uppercase mb-0.5">
              Shimamoto Town
            </div>
            <h1 className="text-xl font-bold text-warm-50 tracking-wide">
              島本スタンプ
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="bg-transparent border-gold-500/40 text-gold-500 hover:bg-warm-800 hover:text-gold-400 text-xs rounded-full"
              >
                <LogOut className="w-3 h-3 mr-1" />
                ログアウト
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  const loginUrl = getLoginUrl();
                  if (loginUrl) {
                    window.location.href = loginUrl;
                  } else {
                    window.location.href = "/login";
                  }
                }}
                className="bg-gradient-to-r from-gold-500 to-gold-600 text-warm-900 hover:from-gold-400 hover:to-gold-500 text-xs font-bold rounded-full border-0"
              >
                ログイン
              </Button>
            )}
            {user?.role === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="text-gold-500/50 hover:text-gold-500 hover:bg-warm-800 text-xs rounded-full"
              >
                <Settings className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto pb-24">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-white to-warm-100 rounded-2xl p-5 mb-3 border border-warm-200/60 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs text-warm-500 mb-0.5">
                {isAuthenticated ? `${user?.name || user?.email?.split("@")[0] || "ユーザー"}さん` : "ゲスト"}
              </div>
              <div className="text-3xl font-bold text-warm-900">
                {totalStamps.toFixed(1)}
                <span className="text-sm text-warm-500 ml-1 font-normal">スタンプ</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-warm-500 mb-0.5 flex items-center gap-1 justify-end">
                <Coins className="w-3 h-3" />
                共通ポイント
              </div>
              <div className="text-2xl font-bold text-gold-600">
                {balance}
                <span className="text-xs ml-0.5">P</span>
              </div>
            </div>
          </div>

          {/* Mini store dots */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            {stores.slice(0, 10).map((store) => {
              const sd = stampMap[store.id];
              const filled = sd && sd.total > 0;
              const hasReward = sd && sd.total >= store.rewardThreshold;
              return (
                <div
                  key={store.id}
                  title={store.name}
                  className={`aspect-square rounded-xl flex items-center justify-center text-sm border-2 transition-all ${
                    hasReward
                      ? "border-gold-500 bg-gold-500/10"
                      : filled
                      ? "border-current bg-current/10"
                      : "border-warm-200 bg-warm-100/50"
                  }`}
                  style={filled && !hasReward ? { borderColor: `${store.color}66`, backgroundColor: `${store.color}15` } : undefined}
                >
                  {filled ? store.icon : <span className="text-warm-300 text-xs">·</span>}
                </div>
              );
            })}
          </div>

          {/* Overall progress */}
          <div className="h-1.5 bg-warm-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-500 to-gold-600 rounded-full transition-all duration-500"
              style={{ width: `${stores.length ? (visitedCount / stores.length) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[10px] text-warm-500 mt-1.5 text-center">
            {visitedCount} / {stores.length} 店舗訪問済み
          </div>
        </div>

        {/* QR Scan Button */}
        {isAuthenticated && (
          <button
            onClick={() => setScanning(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-warm-900 to-warm-800 text-warm-50 text-base font-bold flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] mb-3"
          >
            <Camera className="w-5 h-5" />
            QRコードをスキャン
          </button>
        )}

        {/* Reward banners */}
        {rewardStores.map((store) => (
          <div
            key={store.id}
            onClick={() => setShownReward(store)}
            className="bg-gradient-to-r from-gold-500/15 to-gold-600/10 border-[1.5px] border-gold-500 rounded-xl p-3 mb-2 flex items-center gap-2.5 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <Gift className="w-5 h-5 text-gold-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-warm-900 truncate">
                {store.name}の特典が使えます！
              </div>
              <div className="text-xs text-warm-500">{store.reward}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gold-500 shrink-0" />
          </div>
        ))}

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2.5 scrollbar-none">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeCategory === cat
                  ? "bg-gold-500 text-warm-900 border-gold-500 font-bold"
                  : "bg-white/60 text-warm-500 border-warm-200 hover:border-warm-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Store list */}
        <div className="space-y-2 pb-8">
          {filteredStores.map((store) => (
            <StampCard
              key={store.id}
              store={store}
              stampData={stampMap[store.id]}
              onClick={
                stampMap[store.id]?.total >= store.rewardThreshold
                  ? () => setShownReward(store)
                  : undefined
              }
            />
          ))}
          {filteredStores.length === 0 && (
            <div className="text-center py-12 text-warm-400 text-sm">
              このカテゴリの店舗はまだありません
            </div>
          )}
        </div>
      </main>

      {/* Reward Modal */}
      <Dialog open={!!shownReward} onOpenChange={() => setShownReward(null)}>
        <DialogContent className="max-w-xs rounded-3xl bg-gradient-to-b from-white to-warm-50 border-gold-500/30">
          <DialogHeader className="text-center">
            <div className="text-5xl mb-2 mx-auto">🎁</div>
            <DialogTitle className="text-xl text-warm-900">おめでとうございます！</DialogTitle>
            <DialogDescription className="text-warm-500">
              {shownReward?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gold-500/10 border-2 border-dashed border-gold-500 rounded-xl p-4 text-center">
            <div className="text-base font-bold text-warm-900 leading-relaxed">
              {shownReward?.reward}
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => shownReward && handleUseReward(shownReward)}
              disabled={useRewardMutation.isPending}
              className="w-full bg-gradient-to-r from-warm-900 to-warm-800 text-warm-50 hover:from-warm-800 hover:to-warm-700 rounded-xl"
            >
              {useRewardMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              特典を使用する
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShownReward(null)}
              className="text-warm-500 text-xs"
            >
              あとで使う
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Result Modal */}
      <Dialog open={!!scanResult} onOpenChange={() => setScanResult(null)}>
        <DialogContent className="max-w-xs rounded-3xl bg-gradient-to-b from-white to-warm-50 border-gold-500/30">
          <DialogHeader className="text-center">
            <div className="text-5xl mb-2 mx-auto">
              {scanResult?.stampValue < 1 ? "½" : "🏮"}
            </div>
            <DialogTitle className="text-lg text-warm-900">
              {scanResult?.storeName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gold-500/10 rounded-xl p-3 text-center">
              <div className="text-[10px] text-warm-500">スタンプ</div>
              <div className="text-xl font-bold text-warm-900">
                +{scanResult?.stampValue}
              </div>
            </div>
            <div className="bg-gold-500/10 rounded-xl p-3 text-center">
              <div className="text-[10px] text-warm-500">ポイント</div>
              <div className="text-xl font-bold text-gold-600">
                +{scanResult?.pointsEarned}P
              </div>
            </div>
          </div>
          {scanResult?.visitNumber >= 3 && (
            <div className="text-xs text-warm-500 text-center">
              ※3回目以降の来店は0.5スタンプです
            </div>
          )}
          <Button
            onClick={() => setScanResult(null)}
            className="w-full bg-gradient-to-r from-warm-900 to-warm-800 text-warm-50 hover:from-warm-800 hover:to-warm-700 rounded-xl"
          >
            OK
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
