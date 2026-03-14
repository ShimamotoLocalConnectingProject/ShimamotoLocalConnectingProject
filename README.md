# 島本スタンプアプリ

地域のお店を応援するスタンプラリーアプリ + フードシェアリング機能

## 🎯 主な機能

### スタンプラリー
- **メール/パスワード認証** - シンプルな会員登録・ログイン
- **OAuth認証** - Google / GitHub でのログイン対応
- **QRコードスキャン** - 各店舗固有のQRコードで永続利用
- **スタンプ取得** - 来店時にQRスキャンでスタンプ獲得
- **ポイントシステム** - スタンプ数に応じてポイント付与
- **特典使用** - QRコード承認フローで店舗側が確認

### フードシェアリング（TABETE風）
- **余剰食品登録** - 管理者が商品を登録（価格、数量、期限）
- **在庫管理** - 楽観的ロックで在庫同期
- **予約システム** - ユーザーが商品を予約（30分有効QR）
- **受取確認** - 店舗がQRスキャンで受取完了

### Web Push通知（NEW!）
- **新規商品通知** - 商品登録時に全ユーザーへ即時通知
- **期限アラート** - 商品期限2時間前にアラート
- **予約リマインダー** - 予約期限10分前にリマインダー
- **通知設定** - ユーザーが個別にON/OFF可能

### セキュリティ
- **エンタープライズグレード監査ログ** - 全操作を記録（append-only）
- **GDPR準拠** - データ最小化・匿名化対応
- **トランザクション制御** - データ整合性保証

## 🚀 デプロイ情報

- **本番URL**: https://slcpv1.onrender.com/
- **GitHub**: https://github.com/ShimamotoLocalConnectingProject/ShimamotoLocalConnectingProject
- **プラットフォーム**: Cloudflare Pages (予定) / Render (現在)
- **データベース**: PostgreSQL (Render)
- **通知**: Web Push API (VAPID)

## 📐 技術スタック

**フロントエンド**:
- React 19.2.1
- TypeScript 5.9.3
- TailwindCSS v4
- shadcn/ui
- tRPC
- Wouter (ルーティング)
- date-fns (日付処理)

**バックエンド**:
- Express.js
- tRPC
- Passport.js (認証)
- Drizzle ORM
- PostgreSQL
- web-push (Push通知)
- JWT (トークン管理)

**インフラ**:
- Render (Web Service + PostgreSQL)
- GitHub Actions (CI/CD)

## 🔧 開発環境セットアップ

### 1. 依存関係インストール

```bash
npm install --legacy-peer-deps
```

### 2. 環境変数設定

`.env` ファイルを作成：

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=your-secret-key

# OAuth (オプション)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Web Push (必須)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@your-domain.com

# Server
PORT=3000
NODE_ENV=development
```

### 3. VAPIDキーの生成（Web Push通知用）

```bash
npx web-push generate-vapid-keys
```

出力例:
```
Public Key: BL...
Private Key: vN...
```

これらのキーを `.env` ファイルと Render の環境変数に設定してください。

### 4. データベースマイグレーション

```bash
# ローカル
npx drizzle-kit push

# Render (Shell で実行)
npx drizzle-kit push
```

### 5. 開発サーバー起動

```bash
npm run dev
```

または PM2 で：

```bash
npm run build
pm2 start ecosystem.config.cjs
```

## 📦 デプロイ手順

### 1. GitHubにプッシュ

```bash
git add .
git commit -m "Deploy"
git push origin main
```

### 2. Render で自動デプロイ

- Renderが自動的にビルド＆デプロイ（5〜10分）
- デプロイ完了後、Shellでマイグレーション実行

### 3. 環境変数設定（Render）

Render Dashboard → Environment で以下を設定：

- `DATABASE_URL`: 自動設定済み（PostgreSQL接続文字列）
- `JWT_SECRET`: ランダムな文字列
- `VAPID_PUBLIC_KEY`: 生成したVAPID公開鍵
- `VAPID_PRIVATE_KEY`: 生成したVAPID秘密鍵
- `VAPID_SUBJECT`: `mailto:your-email@example.com`
- OAuth認証用の環境変数（オプション）

### 4. VAPIDキー設定（重要）

**Render Shell で実行**:

```bash
# 1. VAPIDキー生成
npx web-push generate-vapid-keys

# 2. Render Dashboard → Environment に追加
# VAPID_PUBLIC_KEY=BL...
# VAPID_PRIVATE_KEY=vN...
# VAPID_SUBJECT=mailto:admin@your-domain.com

# 3. サービス再起動
# Render Dashboard → Manual Deploy → Deploy latest commit
```

**設定しないと通知機能が動作しません！**

## 🧪 動作確認

### スタンプ機能
1. ログイン
2. 「QRコードをスキャン」ボタン
3. 店舗QRをスキャン → スタンプ取得
4. 特典が貯まったら「特典を使用する」→ QR表示
5. 管理画面で「特典承認」→ QRスキャン

### フードシェア機能
1. 管理画面 → 「フード」タブ → 「新規登録」
2. 商品情報入力（例: お弁当セット、¥800→¥400、3個、18:00まで）
3. ユーザー側で「フードシェア 🍱」ボタン
4. 商品一覧 → 予約 → QRコード表示
5. 管理画面 → 「予約一覧」→ QRスキャン → 受取確認

### Push通知機能
1. フードシェア画面初回アクセス
2. オンボーディング画面 → 「通知を許可して始める」
3. ブラウザの通知許可ダイアログ → 「許可」
4. 管理画面で商品登録 → 全ユーザーに通知送信
5. 管理画面 → 「通知設定」タブ → ON/OFF切り替え

## 📊 データベーススキーマ

### 主要テーブル

- **users** - ユーザー情報（email, パスワード, role）
- **oauth_accounts** - OAuth連携情報
- **stores** - 参加店舗情報
- **visits** - 来店記録（スタンプ）
- **point_balance** - ポイント残高
- **point_history** - ポイント履歴
- **reward_tokens** - 特典使用トークン（5分有効）
- **food_items** - フードシェア商品
- **food_reservations** - フードシェア予約
- **push_subscriptions** - Push通知登録
- **notification_preferences** - 通知設定
- **audit_logs** - 監査ログ（append-only）

## 🔐 セキュリティ対策

- **認証**: JWT + HttpOnly Cookie
- **パスワード**: bcrypt ハッシュ化
- **トークン**: UUID v4 + 有効期限
- **在庫管理**: トランザクション + 楽観的ロック
- **監査ログ**: 全操作記録（削除不可）
- **通知**: VAPID署名 + HTTPS必須

## 🎓 今後の改善案

- [x] Push通知システム（新規商品・期限アラート・予約リマインダー）
- [x] オンボーディング画面（通知許可フロー）
- [x] 通知設定画面
- [ ] Cloudflare R2画像アップロード（商品画像保存）
- [ ] ユーザー評価システム（店舗・商品レビュー）
- [ ] お気に入り機能（店舗・商品ブックマーク）
- [ ] 統計ダッシュボード（来店数・売上グラフ）
- [ ] クーポン機能（期間限定特別割引）
- [ ] PWA対応（オフライン動作・ホーム画面追加）
- [ ] 多言語対応（英語・中国語）

## 📝 開発ログ

- 2024-XX-XX: プロジェクト開始
- 2024-XX-XX: スタンプラリー機能完成
- 2024-XX-XX: フードシェアリング機能追加
- 2024-XX-XX: エンタープライズ監査ログ実装
- 2024-XX-XX: Web Push通知システム完成
- 2024-XX-XX: Render本番デプロイ完了

## 📄 ライセンス

MIT License

## 👥 開発者

- @inomoto (大学生・学習塾アルバイト)

---

**質問・バグ報告**: GitHub Issues
**連絡先**: admin@shimamoto-stamp.app
