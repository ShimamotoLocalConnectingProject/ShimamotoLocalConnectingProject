# デプロイガイド

## 🚀 デプロイオプション

### オプション1: Railway (推奨)

#### 1. Railwayアカウント作成
https://railway.app/ でアカウント作成

#### 2. 新しいプロジェクト作成
```bash
# Railway CLIをインストール（オプション）
npm install -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init
```

#### 3. MySQLデータベース追加
- Railwayダッシュボードで「New」→「Database」→「MySQL」を選択
- 接続情報をコピー

#### 4. 環境変数設定
Railwayダッシュボードで以下を設定：

```
DATABASE_URL=mysql://user:pass@host:port/database
JWT_SECRET=your-random-secret-key-min-32-characters
GOOGLE_CLIENT_ID=（オプション）
GOOGLE_CLIENT_SECRET=（オプション）
GITHUB_CLIENT_ID=（オプション）
GITHUB_CLIENT_SECRET=（オプション）
PORT=3000
NODE_ENV=production
```

#### 5. GitHubリポジトリ連携
- RailwayダッシュボードでGitHub連携
- リポジトリとブランチを選択
- 自動デプロイが開始されます

#### 6. マイグレーション実行
デプロイ後、Railwayのターミナルで：
```bash
npm run db:push
```

---

### オプション2: Render

#### 1. Renderアカウント作成
https://render.com/ でアカウント作成

#### 2. Blueprint からデプロイ
- 「New」→「Blueprint」を選択
- GitHubリポジトリを連携
- `render.yaml` が自動検出されます

#### 3. 環境変数設定（自動生成される項目以外）
```
GOOGLE_CLIENT_ID=（オプション）
GOOGLE_CLIENT_SECRET=（オプション）
GITHUB_CLIENT_ID=（オプション）
GITHUB_CLIENT_SECRET=（オプション）
```

#### 4. デプロイ実行
- 「Apply」をクリック
- データベースとWebサービスが自動作成されます

---

### オプション3: Docker (ローカル/VPS)

#### 1. Docker Compose でローカル実行
```bash
# 環境変数設定
cp .env.example .env
# .envを編集

# Docker Compose起動
docker-compose up -d

# ログ確認
docker-compose logs -f app

# マイグレーション実行
docker-compose exec app npm run db:push
```

アクセス: http://localhost:3000

#### 2. VPSへのデプロイ
```bash
# サーバーにDocker/Docker Composeをインストール

# リポジトリをクローン
git clone <repository-url>
cd shimamoto-stamp-app

# 環境変数設定
cp .env.example .env
nano .env  # 編集

# 起動
docker-compose up -d

# マイグレーション
docker-compose exec app npm run db:push
```

---

### オプション4: 手動デプロイ（VPS）

#### 1. サーバー準備
```bash
# Node.js 20+ インストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL インストール
sudo apt-get install mysql-server

# MySQL設定
sudo mysql_secure_installation
```

#### 2. データベース作成
```bash
sudo mysql -u root -p

CREATE DATABASE shimamoto_stamp;
CREATE USER 'shimamoto'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON shimamoto_stamp.* TO 'shimamoto'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 3. アプリケーションデプロイ
```bash
# リポジトリクローン
git clone <repository-url>
cd shimamoto-stamp-app

# 依存関係インストール
npm install --legacy-peer-deps

# 環境変数設定
cp .env.example .env
nano .env

# ビルド
npm run build

# マイグレーション
npm run db:push

# PM2でプロセス管理（推奨）
npm install -g pm2
pm2 start npm --name "shimamoto-app" -- start
pm2 save
pm2 startup
```

#### 4. Nginx リバースプロキシ設定（オプション）
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔐 OAuth設定（本番環境）

### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com/)
2. OAuth 2.0 クライアント ID作成
3. 承認済みリダイレクト URI: `https://your-domain.com/api/auth/google/callback`

### GitHub OAuth
1. [GitHub Settings](https://github.com/settings/developers)
2. OAuth Appを作成
3. Authorization callback URL: `https://your-domain.com/api/auth/github/callback`

---

## ✅ デプロイ後のチェックリスト

- [ ] アプリケーションが起動している
- [ ] データベース接続が成功している
- [ ] `/api/auth/register` で登録可能
- [ ] `/api/auth/login` でログイン可能
- [ ] 管理者ユーザーを作成（初回のみ）
- [ ] OAuth認証が動作している（設定した場合）
- [ ] QRコード生成が動作している
- [ ] スタンプ付与が動作している
- [ ] HTTPS設定済み（本番環境）

---

## 🐛 トラブルシューティング

### データベース接続エラー
- DATABASE_URLが正しいか確認
- データベースサーバーが起動しているか確認
- ファイアウォール設定を確認

### ビルドエラー
```bash
# キャッシュクリア
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### マイグレーションエラー
```bash
# スキーマ再生成
npm run db:push
```

---

## 📊 モニタリング

### ログ確認
```bash
# Railway
railway logs

# Render
# ダッシュボードのLogsタブ

# Docker
docker-compose logs -f app

# PM2
pm2 logs shimamoto-app
```

### パフォーマンス監視
- RailwayやRenderのダッシュボードで確認
- PM2: `pm2 monit`
