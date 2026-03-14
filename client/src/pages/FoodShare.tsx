import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { ShoppingBag, Clock, Tag, MapPin, QrCode, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";

interface FoodReservationQRProps {
  reservation: any;
  onClose: () => void;
}

function FoodReservationQR({ reservation, onClose }: FoodReservationQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!reservation) return;

    // Generate QR code
    if (canvasRef.current && reservation.qrPayload) {
      QRCode.toCanvas(
        canvasRef.current,
        reservation.qrPayload,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#2C2018",
            light: "#FFF8F0",
          },
        },
        (error) => {
          if (error) console.error("QR生成エラー:", error);
        }
      );
    }

    // Update countdown
    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(reservation.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        toast.error("予約の有効期限が切れました");
        onClose();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [reservation, onClose]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center p-6 bg-amber-50 rounded-lg border-2 border-amber-200">
        <canvas ref={canvasRef} className="mb-4" />
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">予約コード</p>
          <p className="text-2xl font-mono font-bold text-amber-900">
            {reservation.reservationCode.slice(0, 8)}
          </p>
          <div className="flex items-center justify-center gap-2 text-amber-700 mt-4">
            <Clock className="w-5 h-5" />
            <span className="text-xl font-bold">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            有効期限: {format(new Date(reservation.expiresAt), "HH:mm", { locale: ja })}
          </p>
        </div>
      </div>
      <p className="text-sm text-center text-gray-600">
        店舗でこのQRコードを提示してください
      </p>
    </div>
  );
}

export default function FoodShare() {
  const { user, isAuthenticated } = useAuth();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showReservationQR, setShowReservationQR] = useState<any>(null);
  const [selectedStore, setSelectedStore] = useState<number | undefined>(undefined);

  // Queries
  const foodItemsQuery = trpc.food.list.useQuery({ storeId: selectedStore });
  const myReservationsQuery = trpc.food.myReservations.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const storesQuery = trpc.store.list.useQuery();

  const foodItems = foodItemsQuery.data ?? [];
  const myReservations = myReservationsQuery.data ?? [];
  const stores = storesQuery.data ?? [];

  // Mutations
  const reserveMutation = trpc.food.reserve.useMutation({
    onSuccess: (data) => {
      toast.success("予約が完了しました！");
      setShowReservationQR(data);
      setSelectedItem(null);
      foodItemsQuery.refetch();
      myReservationsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const cancelMutation = trpc.food.cancelReservation.useMutation({
    onSuccess: () => {
      toast.success("予約をキャンセルしました");
      myReservationsQuery.refetch();
      foodItemsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleReserve = (item: any, quantity: number = 1) => {
    if (!isAuthenticated) {
      toast.error("ログインが必要です");
      return;
    }
    reserveMutation.mutate({ foodItemId: item.id, quantity });
  };

  const handleCancel = (reservationId: number) => {
    if (confirm("予約をキャンセルしますか？")) {
      cancelMutation.mutate({ reservationId });
    }
  };

  const calculateDiscount = (original: number, discounted: number) => {
    return Math.round(((original - discounted) / original) * 100);
  };

  if (foodItemsQuery.isLoading || storesQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingBag className="w-8 h-8 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">フードシェア</h1>
            <p className="text-sm text-gray-600">余剰食品をお得にゲット</p>
          </div>
        </div>

        {/* Store filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedStore === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStore(undefined)}
          >
            すべて
          </Button>
          {stores.map((store) => (
            <Button
              key={store.id}
              variant={selectedStore === store.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStore(store.id)}
            >
              {store.icon} {store.name}
            </Button>
          ))}
        </div>
      </div>

      {/* My Reservations */}
      {isAuthenticated && myReservations.length > 0 && (
        <div className="max-w-4xl mx-auto mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            予約中
          </h2>
          <div className="space-y-3">
            {myReservations
              .filter((r) => r.status === "pending")
              .map((reservation) => {
                const item = foodItems.find((f) => f.id === reservation.foodItemId);
                const store = stores.find((s) => s.id === reservation.storeId);
                return (
                  <Card key={reservation.id} className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="default" className="bg-amber-500">
                              予約中
                            </Badge>
                            {store && (
                              <span className="text-sm text-gray-600">
                                {store.icon} {store.name}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold">{item?.title || "商品情報取得中..."}</p>
                          <p className="text-sm text-gray-600">数量: {reservation.quantity}個</p>
                          <p className="text-xs text-gray-500 mt-1">
                            期限: {format(new Date(reservation.expiresAt), "HH:mm", { locale: ja })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setShowReservationQR(reservation)}
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(reservation.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Food Items Grid */}
      <div className="max-w-4xl mx-auto">
        {foodItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>現在、利用可能な商品はありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {foodItems.map((item) => {
              const store = stores.find((s) => s.id === item.storeId);
              const discount = calculateDiscount(
                parseFloat(item.originalPrice),
                parseFloat(item.discountedPrice)
              );
              const isExpiringSoon =
                new Date(item.expiresAt).getTime() - Date.now() < 2 * 60 * 60 * 1000;

              return (
                <Card
                  key={item.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          {store && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                              <MapPin className="w-3 h-3" />
                              {store.icon} {store.name}
                            </div>
                          )}
                        </div>
                        <Badge variant="destructive" className="bg-red-500">
                          {discount}% OFF
                        </Badge>
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      )}

                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-600">
                          ¥{parseInt(item.discountedPrice).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          ¥{parseInt(item.originalPrice).toLocaleString()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">
                            残り: <span className="font-semibold">{item.remainingQuantity}</span>個
                          </span>
                          <div
                            className={`flex items-center gap-1 ${
                              isExpiringSoon ? "text-red-500" : "text-gray-600"
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            {format(new Date(item.expiresAt), "HH:mm", { locale: ja })}まで
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.description && (
                <p className="text-gray-600">{selectedItem.description}</p>
              )}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">通常価格</span>
                  <span className="line-through text-gray-400">
                    ¥{parseInt(selectedItem.originalPrice).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>特別価格</span>
                  <span className="text-amber-600">
                    ¥{parseInt(selectedItem.discountedPrice).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">残り在庫</span>
                  <span className="font-semibold">{selectedItem.remainingQuantity}個</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">受取期限</span>
                  <span className="text-red-500 font-semibold">
                    {format(new Date(selectedItem.expiresAt), "MM/dd HH:mm", { locale: ja })}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              キャンセル
            </Button>
            <Button
              onClick={() => handleReserve(selectedItem, 1)}
              disabled={reserveMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {reserveMutation.isPending ? "予約中..." : "予約する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reservation QR Dialog */}
      <Dialog open={!!showReservationQR} onOpenChange={() => setShowReservationQR(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>予約完了</DialogTitle>
          </DialogHeader>
          {showReservationQR && (
            <FoodReservationQR
              reservation={showReservationQR}
              onClose={() => setShowReservationQR(null)}
            />
          )}
          <DialogFooter>
            <Button onClick={() => setShowReservationQR(null)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
