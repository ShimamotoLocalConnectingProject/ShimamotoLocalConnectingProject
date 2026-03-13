# Railway Deployment Guide - Quick Start

## 🚀 1分でデプロイ（最も簡単）

### ステップ1: Railwayアカウント作成
1. https://railway.app にアクセス
2. 「Start a New Project」をクリック
3. GitHubアカウントでサインイン

### ステップ2: GitHubリポジトリからデプロイ
1. 「Deploy from GitHub repo」を選択
2. リポジトリを検索: `ShimamotoLocalConnectingProject`
3. ブランチを選択: `genspark_ai_developer`
4. 「Deploy Now」をクリック

### ステップ3: MySQLデータベース追加
1. プロジェクトダッシュボードで「+ New」をクリック
2. 「Database」→「Add MySQL」
3. 自動的に接続されます

### ステップ4: 環境変数設定
Webサービスの「Variables」タブで以下を追加：

```bash
# データベース（MySQLから自動取得）
DATABASE_URL=${{MySQL.DATABASE_URL}}

# 必須: JWT Secret（32文字以上のランダム文字列）
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this

# システム設定
NODE_ENV=production
PORT=3000
```

**JWT_SECRETの生成方法**:
```bash
# ランダムな文字列を生成
openssl rand -base64 32
# または
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ステップ5: OAuth設定（オプション）

Google OAuthを使う場合:
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

GitHub OAuthを使う場合:
```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### ステップ6: デプロイ完了を待つ
- 自動的にビルドとデプロイが開始
- 5-10分で完了
- デプロイログで進捗確認

### ステップ7: データベースマイグレーション
デプロイ完了後、サービスの設定で:
1. 「Settings」→「Deploy」タブ
2. 「Custom Build Command」を編集:
   ```bash
   npm install --legacy-peer-deps && npm run build && npm run db:push
   ```
3. または、Railwayのターミナルで手動実行:
   ```bash
   npm run db:push
   ```

### ステップ8: URLにアクセス
- Railway が生成したURL（例: `shimamoto-stamp-app-production.up.railway.app`）
- 「Settings」→「Networking」でカスタムドメイン設定可能

---

## 🔐 OAuth設定（本番環境用）

### Google OAuth設定
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト作成 → 「APIs & Services」→「Credentials」
3. 「CREATE CREDENTIALS」→「OAuth 2.0 Client ID」
4. Application type: Web application
5. Authorized redirect URIs に追加:
   ```
   https://your-railway-url.up.railway.app/api/auth/google/callback
   ```
6. Client IDとClient SecretをRailwayの環境変数に設定

### GitHub OAuth設定
1. [GitHub Settings](https://github.com/settings/developers) にアクセス
2. 「OAuth Apps」→「New OAuth App」
3. Application name: Shimamoto Stamp App
4. Homepage URL: `https://your-railway-url.up.railway.app`
5. Authorization callback URL:
   ```
   https://your-railway-url.up.railway.app/api/auth/github/callback
   ```
6. Client IDとClient SecretをRailwayの環境変数に設定

---

## ✅ デプロイ後のチェックリスト

- [ ] アプリケーションが起動している（ログ確認）
- [ ] URLにアクセスできる
- [ ] `/login` ページが表示される
- [ ] メール/パスワードで登録できる
- [ ] ログインできる
- [ ] データベース接続が成功している
- [ ] （OAuth設定した場合）Google/GitHubログインが動作
- [ ] 管理者アカウントを作成
- [ ] QRコード生成が動作
- [ ] スタンプ機能が動作

---

## 👤 管理者アカウントの作成

### 方法1: 直接データベースで編集
Railwayのデータベースコンソールで:
```sql
-- まず通常のアカウントを作成（Webから登録）
-- その後、roleをadminに変更
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 方法2: 環境変数で初期管理者を設定（将来の機能）
```bash
ADMIN_EMAIL=admin@example.com
```

---

## 🐛 トラブルシューティング

### ビルドエラー
- ログで `npm install --legacy-peer-deps` が実行されているか確認
- Node.js バージョンが20以上か確認

### データベース接続エラー
- `DATABASE_URL` が正しく設定されているか確認
- MySQLサービスが起動しているか確認

### 環境変数が反映されない
- Railwayダッシュボードで変更後、再デプロイが必要
- 「Deployments」タブから「Redeploy」をクリック

---

## 📊 モニタリング

### ログ確認
- Railwayダッシュボード→サービス→「Logs」タブ
- リアルタイムでアプリケーションログを確認

### リソース使用状況
- 「Metrics」タブでCPU・メモリ使用量を確認

### 自動デプロイ
- GitHubにプッシュすると自動的に再デプロイ
- mainまたはgenspark_ai_developerブランチへのプッシュで発動

---

## 💰 料金について

### 無料枠
- 月500時間の実行時間
- 個人プロジェクトには十分

### 有料プラン
- より多くのリソースが必要な場合
- カスタムドメイン、より多くのサービス

---

## 🎉 これで完了！

アプリケーションが稼働したら:
1. ログインして動作確認
2. 管理者権限を付与
3. 店舗を追加
4. QRコードを生成
5. スタンプ機能をテスト

質問があれば、GitHubのIssueで！
