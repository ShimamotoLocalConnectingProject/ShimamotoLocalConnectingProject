import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import QRDisplay from "@/components/QRDisplay";
import { useState, useCallback } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, QrCode, Store, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const ICON_OPTIONS = ["🏪", "🍶", "🥬", "🍞", "📚", "☕", "💊", "🍱", "💐", "🍰", "🎵", "🏥", "✂️", "🛒", "🍜", "🍣"];
const COLOR_OPTIONS = ["#8B4513", "#2D6A2D", "#C17D3C", "#4A4080", "#8B6358", "#2A7A5A", "#B85C38", "#C06080", "#5C6BC0", "#00897B"];

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [editingStore, setEditingStore] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [newStore, setNewStore] = useState({
    name: "",
    category: "",
    icon: "🏪",
    color: "#8B4513",
    reward: "",
    rewardThreshold: 5,
  });
  const [qrData, setQrData] = useState<{ payload: string; storeName: string } | null>(null);

  // Queries
  const storesQuery = trpc.store.list.useQuery();
  const statsQuery = trpc.admin.stats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const stores = storesQuery.data ?? [];
  const stats = statsQuery.data;

  // Mutations
  const createStoreMutation = trpc.store.create.useMutation({
    onSuccess: () => {
      storesQuery.refetch();
      setNewStore({ name: "", category: "", icon: "🏪", color: "#8B4513", reward: "", rewardThreshold: 5 });
      toast.success("店舗を追加しました！");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStoreMutation = trpc.store.update.useMutation({
    onSuccess: () => {
      storesQuery.refetch();
      setEditingStore(null);
      toast.success("更新しました");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteStoreMutation = trpc.store.delete.useMutation({
    onSuccess: () => {
      storesQuery.refetch();
      toast.success("削除しました");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateQrMutation = trpc.qr.generate.useMutation({
    onSuccess: (data) => {
      setQrData({ payload: data.qrPayload, storeName: data.storeName });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddStore = useCallback(() => {
    if (!newStore.name || !newStore.category) {
      toast.error("店舗名とカテゴリーを入力してください");
      return;
    }
    if (!newStore.reward) {
      toast.error("特典内容を入力してください");
      return;
    }
    createStoreMutation.mutate(newStore);
  }, [newStore, createStoreMutation]);

  const handleSaveStore = useCallback(() => {
    if (!editingStore) return;
    updateStoreMutation.mutate({
      id: editingStore.id,
      ...editForm,
    });
  }, [editingStore, editForm, updateStoreMutation]);

  const handleDeleteStore = useCallback(
    (id: number) => {
      if (!window.confirm("この店舗を削除しますか？関連するスタンプデータもすべて削除されます。")) return;
      deleteStoreMutation.mutate({ id });
    },
    [deleteStoreMutation]
  );

  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-50 to-warm-100">
        <div className="bg-gradient-to-r from-warm-900 to-warm-800 p-5">
          <Skeleton className="h-6 w-48 bg-warm-700/50" />
        </div>
        <div className="p-4 max-w-xl mx-auto space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-warm-50 to-warm-100 flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="text-center py-8">
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-lg font-bold text-warm-900 mb-2">アクセス権限がありません</h2>
            <p className="text-sm text-warm-500 mb-4">管理者権限が必要です</p>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-50 to-warm-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-warm-900 to-warm-800 px-5 pt-5 pb-4 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[3px] text-gold-500 uppercase mb-0.5">
              Admin
            </div>
            <h1 className="text-lg font-bold text-warm-50">管理者ダッシュボード</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="bg-transparent border-gold-500/40 text-gold-500 hover:bg-warm-800 hover:text-gold-400 text-xs rounded-full"
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            退出
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto pb-12">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "参加店舗", value: stores.length, icon: <Store className="w-5 h-5" /> },
            { label: "総来店数", value: stats?.stampCount ?? "—", icon: <BarChart3 className="w-5 h-5" /> },
            { label: "特典使用数", value: stats?.rewardCount ?? "—", icon: <span className="text-lg">🎁</span> },
          ].map((s) => (
            <Card key={s.label} className="bg-gradient-to-br from-white to-warm-50 border-warm-200/60">
              <CardContent className="p-3 text-center">
                <div className="text-gold-600 mb-1 flex justify-center">{s.icon}</div>
                <div className="text-2xl font-bold text-warm-900">{s.value}</div>
                <div className="text-[10px] text-warm-500">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="stores" className="w-full">
          <TabsList className="w-full bg-warm-200/40 rounded-xl mb-3">
            <TabsTrigger value="stores" className="flex-1 rounded-lg data-[state=active]:bg-gold-500 data-[state=active]:text-warm-900">
              店舗一覧
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1 rounded-lg data-[state=active]:bg-gold-500 data-[state=active]:text-warm-900">
              店舗追加
            </TabsTrigger>
          </TabsList>

          {/* Store List Tab */}
          <TabsContent value="stores" className="space-y-3">
            {stores.map((store) => (
              <Card key={store.id} className="bg-gradient-to-br from-white to-warm-50 border-warm-200/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{store.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-warm-900">{store.name}</div>
                      <div className="text-xs text-warm-500">{store.category}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateQrMutation.mutate({ storeId: store.id })}
                      disabled={generateQrMutation.isPending}
                      className="border-gold-500/50 text-warm-600 hover:bg-gold-500/10 text-xs rounded-lg"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1" />
                      QR表示
                    </Button>
                  </div>

                  {editingStore?.id === store.id ? (
                    <div className="bg-warm-100/50 rounded-xl p-3 border border-warm-200/60 space-y-3">
                      <div>
                        <Label className="text-xs text-warm-600">店舗名</Label>
                        <Input
                          value={editForm.name || ""}
                          onChange={(e) => setEditForm((p: any) => ({ ...p, name: e.target.value }))}
                          className="mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-warm-600">カテゴリー</Label>
                        <Input
                          value={editForm.category || ""}
                          onChange={(e) => setEditForm((p: any) => ({ ...p, category: e.target.value }))}
                          className="mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-warm-600">アイコン</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {ICON_OPTIONS.map((icon) => (
                            <button
                              key={icon}
                              onClick={() => setEditForm((p: any) => ({ ...p, icon }))}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border-2 transition-all ${
                                editForm.icon === icon
                                  ? "border-gold-500 bg-gold-500/10"
                                  : "border-warm-200 hover:border-warm-300"
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-warm-600">特典内容</Label>
                        <Input
                          value={editForm.reward || ""}
                          onChange={(e) => setEditForm((p: any) => ({ ...p, reward: e.target.value }))}
                          className="mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-warm-600">
                          必要スタンプ数: {editForm.rewardThreshold}
                        </Label>
                        <Slider
                          value={[editForm.rewardThreshold || 5]}
                          onValueChange={([v]) => setEditForm((p: any) => ({ ...p, rewardThreshold: v }))}
                          min={1}
                          max={20}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={handleSaveStore}
                          disabled={updateStoreMutation.isPending}
                          className="flex-1 bg-gradient-to-r from-warm-900 to-warm-800 text-warm-50 rounded-lg"
                        >
                          {updateStoreMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingStore(null)}
                          className="flex-1 rounded-lg"
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gold-500/8 rounded-lg p-2.5 mb-3 border border-gold-500/20">
                        <div className="text-xs text-warm-500 mb-0.5">
                          🎁 特典（{store.rewardThreshold}スタンプで獲得）
                        </div>
                        <div className="text-sm text-warm-900">{store.reward}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStore(store);
                            setEditForm({ ...store });
                          }}
                          className="flex-1 border-gold-500/50 text-warm-600 hover:bg-gold-500/10 rounded-lg text-xs"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          編集
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStore(store.id)}
                          disabled={deleteStoreMutation.isPending}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg text-xs px-3"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
            {stores.length === 0 && (
              <div className="text-center py-12 text-warm-400 text-sm">
                まだ店舗が登録されていません
              </div>
            )}
          </TabsContent>

          {/* Add Store Tab */}
          <TabsContent value="add">
            <Card className="bg-gradient-to-br from-white to-warm-50 border-warm-200/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  新規店舗を追加
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-warm-600">店舗名 *</Label>
                  <Input
                    placeholder="例: 島本うどん"
                    value={newStore.name}
                    onChange={(e) => setNewStore((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-xs text-warm-600">カテゴリー *</Label>
                  <Input
                    placeholder="例: 飲食"
                    value={newStore.category}
                    onChange={(e) => setNewStore((p) => ({ ...p, category: e.target.value }))}
                    className="mt-1 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-xs text-warm-600">アイコン</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setNewStore((p) => ({ ...p, icon }))}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border-2 transition-all ${
                          newStore.icon === icon
                            ? "border-gold-500 bg-gold-500/10"
                            : "border-warm-200 hover:border-warm-300"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-warm-600">カラー</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewStore((p) => ({ ...p, color }))}
                        className={`w-9 h-9 rounded-lg border-2 transition-all ${
                          newStore.color === color ? "border-warm-900 scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-warm-600">特典内容 *</Label>
                  <Input
                    placeholder="例: 次回10%オフ"
                    value={newStore.reward}
                    onChange={(e) => setNewStore((p) => ({ ...p, reward: e.target.value }))}
                    className="mt-1 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-xs text-warm-600">
                    必要スタンプ数: {newStore.rewardThreshold}
                  </Label>
                  <Slider
                    value={[newStore.rewardThreshold]}
                    onValueChange={([v]) => setNewStore((p) => ({ ...p, rewardThreshold: v }))}
                    min={1}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={handleAddStore}
                  disabled={createStoreMutation.isPending}
                  className="w-full bg-gradient-to-r from-warm-900 to-warm-800 text-warm-50 hover:from-warm-800 hover:to-warm-700 rounded-xl"
                >
                  {createStoreMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  <Plus className="w-4 h-4 mr-1" />
                  店舗を追加する
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* QR Display Modal */}
      <Dialog open={!!qrData} onOpenChange={() => setQrData(null)}>
        <DialogContent className="max-w-xs rounded-3xl bg-gradient-to-b from-white to-warm-50 border-gold-500/30">
          <DialogHeader className="text-center">
            <DialogTitle className="text-base text-warm-900">店舗QRコード</DialogTitle>
          </DialogHeader>
          {qrData && (
            <QRDisplay payload={qrData.payload} storeName={qrData.storeName} />
          )}
          <DialogFooter>
            <Button
              onClick={() => setQrData(null)}
              className="w-full bg-gradient-to-r from-warm-900 to-warm-800 text-warm-50 rounded-xl"
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
