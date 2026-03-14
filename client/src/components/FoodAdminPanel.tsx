import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useRef } from "react";
import { Plus, Edit, Trash2, QrCode, Package, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import QRScanner from "./QRScanner";
import QRCodeLib from "qrcode";

interface FoodAdminPanelProps {
  stores: any[];
}

export default function FoodAdminPanel({ stores }: FoodAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"items" | "reservations">("items");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [newItem, setNewItem] = useState({
    storeId: stores[0]?.id || 0,
    title: "",
    description: "",
    originalPrice: 0,
    discountedPrice: 0,
    quantity: 1,
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16), // 6時間後
  });

  // Queries
  const foodItemsQuery = trpc.food.list.useQuery({});
  const reservationsQuery = trpc.food.storeReservations.useQuery(
    { storeId: stores[0]?.id || 0 },
    { enabled: stores.length > 0 }
  );

  const foodItems = foodItemsQuery.data ?? [];
  const reservations = reservationsQuery.data ?? [];

  // Mutations
  const createMutation = trpc.food.create.useMutation({
    onSuccess: () => {
      toast.success("商品を登録しました");
      setShowNewItemForm(false);
      setNewItem({
        storeId: stores[0]?.id || 0,
        title: "",
        description: "",
        originalPrice: 0,
        discountedPrice: 0,
        quantity: 1,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
      foodItemsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = trpc.food.update.useMutation({
    onSuccess: () => {
      toast.success("商品を更新しました");
      setEditingItem(null);
      foodItemsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.food.delete.useMutation({
    onSuccess: () => {
      toast.success("商品を削除しました");
      foodItemsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const confirmPickupMutation = trpc.food.confirmPickup.useMutation({
    onSuccess: () => {
      toast.success("受取確認完了");
      reservationsQuery.refetch();
      foodItemsQuery.refetch();
      setScanning(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Handlers
  const handleCreateItem = () => {
    if (!newItem.title || !newItem.storeId) {
      toast.error("必須項目を入力してください");
      return;
    }

    createMutation.mutate({
      ...newItem,
      expiresAt: new Date(newItem.expiresAt),
    });
  };

  const handleUpdateItem = (item: any) => {
    if (!item.id) return;

    updateMutation.mutate({
      id: item.id,
      title: item.title,
      description: item.description,
      originalPrice: item.originalPrice,
      discountedPrice: item.discountedPrice,
      quantity: item.quantity,
      expiresAt: new Date(item.expiresAt),
      status: item.status,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("この商品を削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleQRScan = (raw: string) => {
    try {
      // Parse QR code: shimamoto://food-pickup?code=xxx&item=yyy
      const url = new URL(raw.replace("shimamoto://food-pickup", "https://dummy/food-pickup"));
      const code = url.searchParams.get("code");
      const storeId = stores[0]?.id;

      if (!code) {
        toast.error("無効なQRコードです");
        return;
      }

      confirmPickupMutation.mutate({ code, storeId });
    } catch (error) {
      toast.error("QRコードの読み取りに失敗しました");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="default" className="bg-green-500">販売中</Badge>;
      case "reserved":
        return <Badge variant="default" className="bg-blue-500">予約済</Badge>;
      case "sold_out":
        return <Badge variant="destructive">売切</Badge>;
      case "expired":
        return <Badge variant="secondary">期限切</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {scanning && <QRScanner onScan={handleQRScan} onClose={() => setScanning(false)} />}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              フードシェア管理
            </CardTitle>
            <Button onClick={() => setShowNewItemForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              新規登録
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="items">商品一覧</TabsTrigger>
              <TabsTrigger value="reservations">
                予約一覧
                {reservations.filter((r) => r.status === "pending").length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {reservations.filter((r) => r.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-3">
              {foodItems.length === 0 ? (
                <p className="text-center text-gray-500 py-8">商品がありません</p>
              ) : (
                foodItems.map((item) => {
                  const store = stores.find((s) => s.id === item.storeId);
                  return (
                    <Card key={item.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(item.status)}
                              {store && (
                                <span className="text-sm text-gray-600">
                                  {store.icon} {store.name}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg">{item.title}</h3>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                              <div>
                                <span className="text-gray-500">元値: </span>
                                <span className="line-through">¥{parseInt(item.originalPrice).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">特価: </span>
                                <span className="font-bold text-amber-600">¥{parseInt(item.discountedPrice).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">在庫: </span>
                                <span className="font-semibold">{item.remainingQuantity} / {item.quantity}個</span>
                              </div>
                              <div>
                                <span className="text-gray-500">期限: </span>
                                <span className="text-red-500 font-semibold">
                                  {format(new Date(item.expiresAt), "MM/dd HH:mm", { locale: ja })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingItem(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations" className="space-y-3">
              <Button
                onClick={() => setScanning(true)}
                className="w-full bg-amber-500 hover:bg-amber-600"
              >
                <QrCode className="w-4 h-4 mr-2" />
                QRコードで受取確認
              </Button>

              {reservations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">予約がありません</p>
              ) : (
                reservations.map((reservation) => {
                  const item = foodItems.find((f) => f.id === reservation.foodItemId);
                  const store = stores.find((s) => s.id === reservation.storeId);
                  return (
                    <Card key={reservation.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {reservation.status === "pending" && (
                                <Badge variant="default" className="bg-blue-500">予約中</Badge>
                              )}
                              {reservation.status === "picked_up" && (
                                <Badge variant="default" className="bg-green-500">受取済</Badge>
                              )}
                              {reservation.status === "cancelled" && (
                                <Badge variant="secondary">キャンセル</Badge>
                              )}
                              {reservation.status === "expired" && (
                                <Badge variant="secondary">期限切</Badge>
                              )}
                            </div>
                            <h3 className="font-semibold">{item?.title || "商品情報なし"}</h3>
                            <div className="text-sm text-gray-600 mt-2 space-y-1">
                              <p>数量: {reservation.quantity}個</p>
                              <p>予約ID: {reservation.reservationCode.slice(0, 8)}</p>
                              <p className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                期限: {format(new Date(reservation.expiresAt), "HH:mm", { locale: ja })}
                              </p>
                              {reservation.pickedUpAt && (
                                <p>受取: {format(new Date(reservation.pickedUpAt), "MM/dd HH:mm", { locale: ja })}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* New Item Dialog */}
      <Dialog open={showNewItemForm} onOpenChange={setShowNewItemForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新規商品登録</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>店舗</Label>
              <Select
                value={newItem.storeId.toString()}
                onValueChange={(v) => setNewItem({ ...newItem, storeId: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.icon} {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>商品名</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="例: 本日のお弁当セット"
              />
            </div>
            <div>
              <Label>説明（任意）</Label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="例: 唐揚げ・野菜炒め・ご飯"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>元値（円）</Label>
                <Input
                  type="number"
                  value={newItem.originalPrice}
                  onChange={(e) => setNewItem({ ...newItem, originalPrice: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>特価（円）</Label>
                <Input
                  type="number"
                  value={newItem.discountedPrice}
                  onChange={(e) => setNewItem({ ...newItem, discountedPrice: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>数量</Label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
              <div>
                <Label>受取期限</Label>
                <Input
                  type="datetime-local"
                  value={newItem.expiresAt}
                  onChange={(e) => setNewItem({ ...newItem, expiresAt: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewItemForm(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleCreateItem}
              disabled={createMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {createMutation.isPending ? "登録中..." : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>商品編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>商品名</Label>
                <Input
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                />
              </div>
              <div>
                <Label>説明</Label>
                <Textarea
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>元値（円）</Label>
                  <Input
                    type="number"
                    value={editingItem.originalPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, originalPrice: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>特価（円）</Label>
                  <Input
                    type="number"
                    value={editingItem.discountedPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, discountedPrice: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>数量</Label>
                  <Input
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                <div>
                  <Label>ステータス</Label>
                  <Select
                    value={editingItem.status}
                    onValueChange={(v) => setEditingItem({ ...editingItem, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">販売中</SelectItem>
                      <SelectItem value="reserved">予約済</SelectItem>
                      <SelectItem value="sold_out">売切</SelectItem>
                      <SelectItem value="expired">期限切</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>受取期限</Label>
                <Input
                  type="datetime-local"
                  value={new Date(editingItem.expiresAt).toISOString().slice(0, 16)}
                  onChange={(e) => setEditingItem({ ...editingItem, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                キャンセル
              </Button>
              <Button
                onClick={() => handleUpdateItem(editingItem)}
                disabled={updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {updateMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
