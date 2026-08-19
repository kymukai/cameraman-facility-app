# cameraman-facility-app

ローカル PC の Docker で動かす Web ツールの基本セット。

- **フロントエンド**: React 19 + TailwindCSS v4 + Vite（nginx で静的配信）
- **バックエンド**: NestJS 11（`/api` プレフィックス、施設(Facility)マスタの新規登録・検索・修正）
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
├── backend/             NestJS 11（施設マスタの新規登録・検索・修正、外部連携API、Excel移行スクリプト）
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

## データモデル（facilities）

| カラム | 型 | 必須 | 備考 |
|---|---|---|---|
| 施設ID (facilityId) | integer | ○ | 一意（UNIQUE制約）。登録後は不変、修正API(`PATCH`)では変更不可 |
| 施設名 (facilityName) | text | ○ | |
| 販売開始日デフォルト (salesStartDefault) | boolean | ○ | |
| 販売開始日 (salesStartDate) | text | - | `salesStartDefault=false` の時のみ設定可。`true` の時に値を指定するとエラー |
| 販売価格 (salesPrice) | text | - | |

内部の主キー(`id`)は業務キーの施設IDとは別にUUIDを発行している
（`backend/src/facilities/facilities.service.ts`）。

### エンドポイント

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/api/facilities` | 新規登録 |
| GET | `/api/facilities?facilityId=&facilityName=` | 検索（施設IDは完全一致、施設名は部分一致、併用可） |
| GET | `/api/facilities/:id` | 1件取得（編集フォーム表示用） |
| PATCH | `/api/facilities/:id` | 検索結果からの設定項目修正 |
| GET | `/api/external/facilities?facilityId=` | 社内の他システム連携用（下記参照） |

---

## Excel からのデータ移行

元々Excelで管理していた施設データをDBへ取り込むための移行スクリプト
`backend/scripts/migrate-excel.mjs` を用意している。

```powershell
cd backend
npm install
$env:DATABASE_URL = "postgres://app:app@localhost:5432/app"
npm run migrate:excel -- .\facilities.xlsx
```

**現時点では実物のExcelファイルを入手していないため、スクリプト先頭の `COLUMN_MAP`
（Excelのヘッダー名 ⇔ facilitiesのカラム名の対応）は仮の値になっている。**
実ファイルを受け取ったら、実際のヘッダー表記に合わせて `COLUMN_MAP` を調整すること。
`facility_id` を競合キーに upsert するため、同じスクリプトを再実行しても重複登録されない。

---

## 外部連携API（社内システム向け）

`GET /api/external/facilities?facilityId=<施設ID>` で、施設IDを完全一致指定して
1件分のデータ（内部の主キー`id`は含まない）を取得できる
（`backend/src/facilities/external-facilities.controller.ts`）。

**認証は未実装（TODO）。** 社内の他システムから接続する前に、APIキーやトークンなどの
認証機構を追加する必要がある。社内UI向けの `/api/facilities` とはコントローラーを
分けているため、この外部連携APIだけに Guard を追加するのは容易。

---

## Windows での開発

このテンプレートは Docker Compose + npm のみで構成されており、Mac 専用の仕組みは
使っていないため、Windows でも同様に開発できる。

- **Docker Compose で動かす場合**: Docker Desktop は無償版のライセンスが「従業員250人未満
  かつ年間売上1000万ドル未満」の組織に限定されるため、大企業での商用利用には有償契約が
  必要になる。これを避けるには、WSL2 内に Docker Desktop を使わず Docker Engine（CE）を
  直接インストールする（Docker Engine 自体は Apache-2.0 の完全無償OSSでライセンス制約なし）。

  ```bash
  # WSL2 の Ubuntu 内で実行
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  ```

  systemd を有効化（`/etc/wsl.conf` に `[boot]` → `systemd=true` を追記して `wsl --shutdown`）
  しておけば `dockerd` はWSL起動時に自動起動する。VSCode の「WSL」拡張機能で WSL 側から
  プロジェクトを開き、あとは「クイックスタート（Docker）」節のコマンドをそのまま実行する
  （`docker-compose.yml` は Docker Desktop 独自機能を使っていないため変更不要）。

- **Docker を使わない場合**: Node.js 22 + npm をインストールし、「ローカル開発」節の
  手順をそのまま実行する（PowerShell のコマンド例をそのまま使える）。

---

## リソースの追加方法

- **API を増やす**: `backend/src/facilities/` をコピーして新モジュールを作り、
  `app.module.ts` に import する。global prefix `api` 配下に自動で並ぶ。
- **画面を増やす**: `frontend/src/App.tsx` のパネル構成と `api.ts` の
  リクエストラッパを踏襲する。
- **データストア**: PostgreSQL 実装（`backend/src/facilities/facilities.service.ts`）を
  使用中。接続先は環境変数 `DATABASE_URL`（既定 `postgres://app:app@localhost:5432/app`、
  Docker Compose 内では `db` ホスト）。

---

## AWS へ公開したくなったら

`cloudformation/README.md` を参照。S3 + CloudFront（フロント）と
Lambda + API Gateway（バック）の最小構成でデプロイできる。
認証・IP 制限・データストアが必要な場合は `aws-startup-template` スキルを検討する。
