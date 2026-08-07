# cameraman-facility-app

ローカル PC の Docker で動かす Web ツールの基本セット。

- **フロントエンド**: React 19 + TailwindCSS v4 + Vite（nginx で静的配信）
- **バックエンド**: NestJS 11（`/api` プレフィックス、Items CRUD サンプル）
- **データ**: PostgreSQL（Docker Compose に `db` サービスを同梱。テーブルは backend 起動時に自動作成）
- **ローカル実行**: Docker Compose（`docker/`）
- **AWS 移行**: 最小の CloudFormation 雛形を同梱（`cloudformation/`、任意）

---

## アーキテクチャ（ローカル）

```
              ┌────────── nginx (localhost:8080) ──────────┐
 ブラウザ ──▶ │  /        → フロント静的ファイル (SPA)       │
              │  /api/*   → backend コンテナ (NestJS :3000)  │
              └─────────────────────────────────────────────┘
```

- フロントは常に相対パス `/api/*` で API を呼ぶ。Docker では nginx が、
  `npm run dev` では Vite の proxy が backend へ中継する。

---

## ディレクトリ構成

```text
cameraman-facility-app/
├── frontend/            React 19 + Vite + Tailwind v4
├── backend/             NestJS 11（Items CRUD サンプル）
├── docker/              Docker Compose + Dockerfile ×2 + nginx.conf
└── cloudformation/      AWS へ移行するときの最小雛形（任意）
```

---

## クイックスタート（Docker）

```powershell
cd docker
docker compose up -d --build
# フロント: http://localhost:8080
# API     : http://localhost:8080/api/health （直接は http://localhost:3000/api/health）
```

停止は `docker compose down`。

---

## ローカル開発（Docker を使わない場合）

### バックエンド

PostgreSQL を単体起動しておく（未起動なら backend が接続エラーになる）:

```powershell
docker run -d -p 5432:5432 -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app postgres:16-alpine
```

```powershell
cd backend
npm install
npm run start:dev        # http://localhost:3000/api （既定で postgres://app:app@localhost:5432/app に接続）
```

### フロントエンド

```powershell
cd frontend
npm install
npm run dev              # http://localhost:5173 ( /api は :3000 へプロキシ )
```

---

## リソースの追加方法

- **API を増やす**: `backend/src/items/` をコピーして新モジュールを作り、
  `app.module.ts` に import する。global prefix `api` 配下に自動で並ぶ。
- **画面を増やす**: `frontend/src/App.tsx` のパネル構成と `api.ts` の
  リクエストラッパを踏襲する。
- **データストア**: 既に PostgreSQL 実装（`backend/src/items/items.service.ts`）を
  使用中。接続先は環境変数 `DATABASE_URL`（既定 `postgres://app:app@localhost:5432/app`、
  Docker Compose 内では `db` ホスト）。DynamoDB Local に変更したい場合は
  web-startup-template スキルの `assets/options/dynamodb-local/` を参照。

---

## AWS へ公開したくなったら

`cloudformation/README.md` を参照。S3 + CloudFront（フロント）と
Lambda + API Gateway（バック）の最小構成でデプロイできる。
認証・IP 制限・データストアが必要な場合は `aws-startup-template` スキルを検討する。
