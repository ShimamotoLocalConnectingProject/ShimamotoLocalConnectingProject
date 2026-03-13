# 🚀 ワンクリックデプロイ

## Railway でデプロイ（推奨）

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/shimamoto-stamp?referralCode=alphaflow)

👆 このボタンをクリックするだけで自動デプロイ！

---

## 手動デプロイ手順

### Railway（最も簡単）

1. **アカウント作成**: https://railway.app
2. **プロジェクト作成**: 「Deploy from GitHub repo」
3. **リポジトリ選択**: `ShimamotoLocalConnectingProject/ShimamotoLocalConnectingProject`
4. **ブランチ選択**: `genspark_ai_developer`
5. **MySQL追加**: プロジェクト内で「+ New」→「Database」→「MySQL」
6. **環境変数設定**:
   ```
   DATABASE_URL=${{MySQL.DATABASE_URL}}
   JWT_SECRET=（32文字以上のランダム文字列）
   NODE_ENV=production
   PORT=3000
   ```
7. **デプロイ**: 自動的に開始されます
8. **マイグレーション**: デプロイ後、ターミナルで `npm run db:push`

**詳細**: [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

---

### Render

1. **アカウント作成**: https://render.com
2. **Blueprint使用**: 「New」→「Blueprint」
3. **リポジトリ連携**: GitHubから選択
4. **自動デプロイ**: `render.yaml` が自動認識されます
5. **環境変数追加**: OAuth credentials（オプション）

---

### Vercel（フロントエンドのみ）

```bash
npm install -g vercel
vercel --prod
```

**注意**: Vercelはサーバーレス環境なので、追加設定が必要です。

---

### Docker Compose（ローカル/VPS）

```bash
# リポジトリクローン
git clone https://github.com/ShimamotoLocalConnectingProject/ShimamotoLocalConnectingProject.git
cd ShimamotoLocalConnectingProject
git checkout genspark_ai_developer

# 環境変数設定
cp .env.example .env
nano .env  # 編集

# 起動
docker-compose up -d

# マイグレーション
docker-compose exec app npm run db:push
```

---

## 🔐 必要な環境変数

### 必須
```bash
DATABASE_URL=mysql://user:pass@host:port/database
JWT_SECRET=minimum-32-characters-random-string
NODE_ENV=production
PORT=3000
```

### オプション（OAuth使用時）
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### JWT_SECRETの生成

```bash
# 方法1: OpenSSL
openssl rand -base64 32

# 方法2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 方法3: オンライン
https://generate-secret.vercel.app/32
```

---

## 📊 デプロイ後のステップ

1. ✅ URLにアクセスして動作確認
2. ✅ `/login` でアカウント作成
3. ✅ データベースで管理者権限付与:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
4. ✅ 管理者画面で店舗追加
5. ✅ QRコード生成とテスト

---

## 🆘 トラブルシューティング

### ビルドエラー
```bash
# railway.json の buildCommand を確認
npm install --legacy-peer-deps && npm run build
```

### データベース接続エラー
- DATABASE_URL が正しいか確認
- MySQLサービスが起動しているか確認

### OAuth エラー
- Callback URLが正しいか確認
- Client IDとSecretが正しいか確認

---

## 📚 ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [DEPLOY.md](./DEPLOY.md) - 詳細なデプロイガイド
- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) - Railway特化ガイド

---

## 🎉 デプロイ成功したら

TwitterやGitHubで共有してください！

```
島本スタンプアプリをデプロイしました！🎉
https://your-app-url.railway.app
#ShimamotoStampApp #Railway #React #Express
```

---

**サポートが必要？** GitHubのIssueを作成してください
https://github.com/ShimamotoLocalConnectingProject/ShimamotoLocalConnectingProject/issues
