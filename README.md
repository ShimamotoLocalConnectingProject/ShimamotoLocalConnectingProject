# 島本スタンプアプリ

地域のお店を応援するスタンプラリーアプリ

## 🎯 主な機能

- **メール/パスワード認証** - シンプルな会員登録・ログイン
- **OAuth認証** - Google / GitHub でのログイン対応
- **QRコードスキャン** - 店舗訪問時にスタンプ獲得
- **スタンプカード** - 来店回数に応じてスタンプ付与（1・2回目→1.0、3回目以降→0.5）
- **ポイントシステム** - スタンプ獲得でコミュニティポイント付与
- **特典管理** - 一定数のスタンプで特典使用可能
- **管理者機能** - 店舗管理、QRコード生成、統計表示

## 🛠️ 技術スタック

### フロントエンド
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui コンポーネント
- tRPC (型安全なAPI通信)
- Wouter (ルーティング)

### バックエンド
- Express.js
- tRPC
- Passport.js (認証)
- JWT (セッション管理)
- Drizzle ORM
- MySQL

### 認証システム
- **メール/パスワード認証** - bcryptによるハッシュ化
- **OAuth 2.0** - Google / GitHub 対応
- **JWT** - ステートレスな認証トークン

## 📦 セットアップ

### 1. 依存関係のインストール

```bash
npm install --legacy-peer-deps
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```env
# データベース接続
DATABASE_URL=mysql://user:password@localhost:3306/shimamoto_stamp

# JWT シークレット（必須・本番環境では必ず変更）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OAuth設定（オプション）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 3. データベースのセットアップ

```bash
# マイグレーション実行
npm run db:push
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

アプリは `http://localhost:3000` で起動します。

## 🔐 認証システム

### メール/パスワード認証

1. `/login` ページで新規登録またはログイン
2. JWT トークンが発行され、ローカルストレージに保存
3. 以降のAPIリクエストは `Authorization: Bearer <token>` ヘッダーで認証

### OAuth認証

Google または GitHub でログイン可能：

1. `/api/auth/google` または `/api/auth/github` にアクセス
2. OAuth プロバイダーで認証
3. コールバック後、JWT トークンが発行される

### OAuth プロバイダーの設定

#### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. OAuth 2.0 クライアント ID を作成
3. 承認済みリダイレクト URI に `http://localhost:3000/api/auth/google/callback` を追加
4. Client ID と Client Secret を `.env` に設定

#### GitHub OAuth

1. [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers) で新規アプリ作成
2. Authorization callback URL に `http://localhost:3000/api/auth/github/callback` を設定
3. Client ID と Client Secret を `.env` に設定

## 📁 プロジェクト構造

```
shimamoto-stamp-app/
├── client/                 # フロントエンド
│   ├── src/
│   │   ├── pages/          # ページコンポーネント
│   │   │   ├── Login.tsx   # ログイン/登録ページ
│   │   │   ├── Home.tsx    # ユーザーホーム
│   │   │   └── Admin.tsx   # 管理者画面
│   │   ├── components/     # 再利用可能なコンポーネント
│   │   └── _core/hooks/    # カスタムフック
│   └── index.html
├── server/                 # バックエンド
│   ├── auth/               # 認証システム
│   │   ├── authService.ts  # JWT生成・検証
│   │   ├── authDb.ts       # 認証関連DB操作
│   │   ├── authRoutes.ts   # 認証エンドポイント
│   │   ├── authMiddleware.ts # JWT認証ミドルウェア
│   │   └── passport.ts     # Passport.js設定
│   ├── _core/              # コアサーバー機能
│   ├── db.ts               # データベース操作
│   └── routers.ts          # tRPC ルーター
├── drizzle/                # データベーススキーマ
│   └── schema.ts
└── package.json
```

## 🗄️ データベーススキーマ

### users テーブル
- id, email, passwordHash, name, role, createdAt, updatedAt

### oauth_accounts テーブル  
- id, userId, provider, providerId, accessToken, refreshToken

### stores テーブル
- 店舗情報（名前、カテゴリ、特典など）

### visits テーブル
- 来店記録（スタンプ）

### point_balance, point_history テーブル
- ポイント残高と履歴

### reward_usage テーブル
- 特典使用履歴

## 🚀 本番環境デプロイ

### 環境変数の設定

本番環境では以下を必ず設定：

- `JWT_SECRET`: 強力なランダムな文字列に変更
- `DATABASE_URL`: 本番データベースのURL
- `NODE_ENV=production`

### ビルドとデプロイ

```bash
# ビルド
npm run build

# 本番サーバー起動
npm start
```

## 📝 API エンドポイント

### 認証 (`/api/auth`)

- `POST /api/auth/register` - 新規登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報取得
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/google` - Google OAuth開始
- `GET /api/auth/github` - GitHub OAuth開始

### tRPC (`/api/trpc`)

- `auth.me` - ユーザー情報取得
- `store.*` - 店舗操作
- `qr.*` - QRコード生成・スキャン
- `stamp.*` - スタンプ情報
- `reward.*` - 特典使用
- `admin.*` - 管理者機能

## 🧪 テスト

```bash
npm test
```

## 📜 ライセンス

MIT

## 🙏 貢献

プルリクエストを歓迎します！

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
