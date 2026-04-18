# チャイ研究アプリ 詳細設計書 (v1)

**作成日:** 2026-04-18

この詳細設計書は、要件定義書で定義された機能と非機能要件を実装するための具体的な設計をまとめたものです。システム全体の構成、データベーススキーマ、API仕様、画面設計、オフライン対応、認証・権限管理、テスト・運用方針などを記載します。設計内容は2026年4月時点の技術とサービス提供条件に基づいており、Cloudflare Pages と Supabase の無料プラン特性を考慮していることに留意してください。

## 1. システムアーキテクチャ

### 1.1 全体構成

```
ユーザー端末
└─ブラウザ (Next.js PWA)
    ├─ UI層 (Reactコンポーネント)
    ├─ ステート管理層 (React Context + SWR)
    ├─ Service Worker / Workbox (キャッシュ管理, オフライン同期)
    └─ APIクライアント層 (Supabase Client SDK)

クラウド側
└─ Cloudflare Pages (静的ファイル配信, Functions)
    ├─ 静的アセット (JS, CSS, manifest, SW)
    └─ Functions (GraphQL/REST エンドポイント, edge middleware)

└─ Supabase (BaaS)
    ├─ Postgres DB (RLS設定)
    ├─ Auth (Magic Link, JWT)
    ├─ Storage (画像保存)
    ├─ Realtime (将来拡張) 
    └─ Edge Functions (API, 認証リダイレクト等)

└─ Cloudflare R2 (将来の画像・データ拡張ストレージ)
```

- **フロントエンド:** Next.js 16 以降。App Routerで各画面をコンポーネント化し、クライアントコンポーネントでユーザー操作を処理する。
- **バックエンド:** Supabase をメインデータストアとして使用。アプリ固有のロジックは Next.js API route や Supabase Edge Function に実装。Cloudflare Pages Functions には最低限の処理 (リダイレクトやヘッダー制御) を配置。
- **デプロイ:** GitHub Actions でビルドとデプロイを自動化。Cloudflare Pages の 500ビルド/月を超えないよう、マージ時のみデプロイするフローとする。

### 1.2 コンポーネント構成

| レイヤ | 主な役割 | 実装候補 |
|---|---|---|
| **UI層** | 画面表示、ユーザー入力、フォームコンポーネント、モーダル、日付ピッカーなど | Next.js + React + UIライブラリ (Chakra UI, MUI など) |
| **ステート管理** | ユーザーセッション、編集中の試行、ロード状態、フォーム設定 | React Context + Zustand または Redux Toolkit |
| **APIクライアント** | Supabase JavaScript Client (Auth, DB, Storage 呼び出し) |
| **オフラインキャッシュ** | Service Worker + Workbox：App shellは Cache First、API は Network First、画像は Stale-While-Revalidate |
| **サーバーサイド/Functions** | Supabase Edge Functions: 記録作成時の追加検証や変換処理。将来的なAI提案APIのラッパー。 |
| **DB層** | PostgreSQL (Supabase)。RLSによるアクセス制御。 |
| **ストレージ** | Supabase Storage (初期)、R2 (将来) |

### 1.3 キャッシュ戦略とオフライン対応

- App shell (ナビゲーションバー、フッター、スタイルシート、共通JS) は **Cache First** でサービスワーカー起動時にプリキャッシュする。更新時は`skipWaiting`/`clients.claim`で即時反映。
- API呼び出し (Supabase) は **Network First + Cache Fallback**。オンラインであれば最新データを取得し、オフライン時は IndexedDB または Cache Storage の応答を返す。
- 画像は **Stale-While-Revalidate** で表示速度を優先しつつ、バックグラウンド更新。
- ローカル変更(試行の下書き)は IndexedDB に一時保存し、オンライン復帰時に Supabase へ同期する。
- Service Worker は Workbox を利用し、precachingマニフェスト、ランタイムキャッシュ制御、バージョン管理を自動化。

## 2. データベース設計

Supabase の Postgres を利用し、テーブルごとに主キーを `uuid` 型で生成する。日付・時刻は `timestamptz`。ユーザーIDは Supabase Auth が生成する `uuid` を参照。関係の整合性を保つため外部キー制約を使用する。

### 2.1 ER図 (概念)

```
users (id) 1 ──∞ recipe_bases (user_id)
recipe_bases (id) 1 ──∞ trials (recipe_base_id)
trials (id) 1 ──∞ trial_photos (trial_id)
trials (id) 1 ──∞ favorites (trial_id)  (favorites can also reference recipe_bases)
trials (id) 1 ──∞ branches (child_id)
trials (id) 0..1 ──1 branches (parent_id)
materials, spice_blends etc. are referenced by pivot tables
```

### 2.2 テーブル定義例

以下は主要テーブルのDDL例。プライマリキーと外部キー、制約を明示し、RLSの記述は3.5節にて扱う。

#### 2.2.1 users (Supabase Auth)
Supabase が提供する `auth.users` を使用。アプリ側で独自プロフィールが必要な場合は `profiles` テーブルを追加。例：

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### 2.2.2 materials

```sql
CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('tea','milk','sweetener','spice','ginger','other')),
  unit text NOT NULL, -- g, ml, piece 等
  attributes jsonb, -- 任意の追加情報（脂肪分, 茶葉形状など）
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, category)
);
```

#### 2.2.3 spice_blends

```sql
CREATE TABLE spice_blends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE spice_blend_items (
  blend_id uuid NOT NULL REFERENCES spice_blends(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  unit text NOT NULL,
  PRIMARY KEY (blend_id, material_id)
);
```

#### 2.2.4 recipe_bases

```sql
CREATE TABLE recipe_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  tags text[],
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','limited','public')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### 2.2.5 trials

```sql
CREATE TABLE trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_base_id uuid REFERENCES recipe_bases(id) ON DELETE SET NULL,
  parent_trial_id uuid REFERENCES trials(id) ON DELETE SET NULL,
  name text NOT NULL,
  summary text, -- 概要: 今日の狙いや一言
  date timestamptz NOT NULL DEFAULT now(),
  overall_rating numeric CHECK (overall_rating >= 0 AND overall_rating <= 5),
  total_brewing_time numeric, -- 全体の煮出し時間
  attributes jsonb, -- 詳細入力項目: スパイス順序, こし方, 投入タイミング
  custom_values jsonb, -- カスタム項目の値(key-value)
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','limited','public')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### 2.2.6 trial_materials (pivot)

```sql
CREATE TABLE trial_materials (
  trial_id uuid NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  unit text NOT NULL,
  timing text, -- 例: 'start','middle','end'
  PRIMARY KEY (trial_id, material_id)
);
```

#### 2.2.7 trial_spice_blends

```sql
CREATE TABLE trial_spice_blends (
  trial_id uuid NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  blend_id uuid NOT NULL REFERENCES spice_blends(id) ON DELETE CASCADE,
  PRIMARY KEY (trial_id, blend_id)
);
```

#### 2.2.8 trial_photos

```sql
CREATE TABLE trial_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  file_path text NOT NULL, -- Supabase Storage path
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### 2.2.9 favorites

```sql
CREATE TABLE favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('recipe_base','trial')),
  target_id uuid NOT NULL,
  level text NOT NULL CHECK (level IN ('star','favorite','standard')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
```

#### 2.2.10 branches

```sql
CREATE TABLE branches (
  child_id uuid PRIMARY KEY REFERENCES trials(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES trials(id) ON DELETE SET NULL
);
```

### 2.3 インデックスとパフォーマンス

- `trials.user_id`、`trials.recipe_base_id` にB-treeインデックスを作成し、ユーザーごとの検索やレシピベース絞り込みを高速化。
- `trial_materials.material_id` にはインデックスを付与し、特定材料を使用した試行検索に備える。
- JSONBカラム(`attributes`,`custom_values`)にはGINインデックスを設定し、特定キーの検索を高速化。

## 3. API設計

RESTfulなエンドポイントを Next.js API routes または Supabase Edge Functions に実装する。これによりクライアントから直接Supabaseを利用する方法と独自バックエンドAPIの併用が可能になる。

### 3.1 認証・セッション

- ユーザーはメールアドレスで登録し、Magic Linkでログイン。Supabase Auth が `access_token` (JWT) を発行する。
- クライアントはSupabase SDKを用いて `supabase.auth.getSession()` でセッションを取得。JWTはHTTP-Only Cookieまたは localStorage に保存する。
- APIルートでは `Authorization: Bearer <jwt>` ヘッダーを受け取り、Supabaseの `auth.api.getUser()` でユーザー検証を行う。

### 3.2 基本エンドポイント一覧

| エンドポイント | メソッド | 説明 | 認可 | 入力 | 出力 |
|---|---|---|---|---|---|
| `/api/recipe-bases` | GET | ユーザーのレシピベース一覧取得 | 要ログイン | クエリ: `visibility` / `tags` | `[{ id, name, tags, created_at, visibility }]` |
| `/api/recipe-bases` | POST | 新規レシピベース作成 | 要ログイン | JSON: `name, description, tags, visibility` | `{ id }` |
| `/api/recipe-bases/{id}` | GET | レシピベース詳細 | 公開の場合誰でも/非公開は本人のみ | - | `{ id, name, description, trials_count, tags }` |
| `/api/recipe-bases/{id}` | PATCH | レシピベース更新 | 本人のみ | JSON: `name?`, `description?`, `tags?`, `visibility?` | `200 OK` |
| `/api/recipe-bases/{id}` | DELETE | レシピベース削除 | 本人のみ | - | `204 No Content` |
| `/api/trials` | GET | 試行リスト取得 | 本人のみ (公開設定により他ユーザー閲覧可) | クエリ: `recipe_base_id`, `date_from`, `date_to`, `query`, `star_only`, `rating_min` | `[{ id, name, date, overall_rating, recipe_base_id }]` |
| `/api/trials` | POST | 新規試行登録 | 要ログイン | JSON: 詳細後述 | `{ id }` |
| `/api/trials/{id}` | GET | 試行詳細 | 公開設定による | - | `{ id, name, date, recipe_base_id, parent_trial_id, materials: [...], spices: [...], attributes, custom_values, photos: [...], overall_rating, visibility }` |
| `/api/trials/{id}` | PATCH | 試行更新 | 本人のみ | JSON: 更新対象フィールド | `200 OK` |
| `/api/trials/{id}` | DELETE | 試行削除 | 本人のみ | - | `204 No Content` |
| `/api/trials/{id}/clone` | POST | 試行の複製 | 本人のみ | JSON: `new_name?`, `visibility?`, `override_fields?` | `{ new_trial_id }` |
| `/api/comparison` | POST | 2件比較 | 公開設定による | JSON: `trial_id_a`, `trial_id_b` | 差分オブジェクト(材料・工程・評価の比較) |
| `/api/favorites` | GET | お気に入り一覧 | 本人のみ | クエリ: `level` | `[{ target_type, target_id, level }]` |
| `/api/favorites` | POST | お気に入り登録 | 本人のみ | JSON: `target_type`, `target_id`, `level` | `200 OK` |
| `/api/favorites/{id}` | DELETE | お気に入り解除 | 本人のみ | - | `204 No Content` |
| `/api/upload-url` | POST | 画像アップロード用署名URL発行 | 要ログイン | JSON: `file_name`, `file_type` | `{ url, fields }` |

- 画像アップロードは Supabase Storage の [signed URL](https://supabase.com/docs/guides/storage#uploading-files) を利用し、クライアントから直接アップロードすることでバックエンドの負荷を減らす。
- `override_fields` には複製時に変更したいフィールドを指定し、サーバー側で差分を適用する。

### 3.3 リクエストフォーマット (試行登録)

```json
{
  "recipe_base_id": "uuid",
  "parent_trial_id": "uuid or null",
  "name": "試行名",
  "summary": "一言メモ",
  "date": "2026-04-18T09:30:00+09:00",
  "materials": [
    { "material_id": "uuid", "amount": 200, "unit": "ml", "timing": "start" },
    ...
  ],
  "spice_blends": ["blend_uuid1", "blend_uuid2"],
  "attributes": { "brew_method": "water-first", "boil_times": 1, "filter_type": "fine" },
  "custom_values": { "チャイ感": 4.5, "温まり度": 5 },
  "overall_rating": 4.7,
  "visibility": "private"
}
```

### 3.4 応答フォーマット (比較)

```json
{
  "trial_a_id": "uuid",
  "trial_b_id": "uuid",
  "materials_diff": [
    { "material_id": "uuid", "name": "生姜", "amount_a": 5, "amount_b": 8, "unit": "g" },
    ...
  ],
  "attributes_diff": {
    "brew_method": { "a": "water-first", "b": "milk-first" },
    "boil_times": { "a": 1, "b": 2 }
  },
  "custom_values_diff": {
    "チャイ感": { "a": 4, "b": 5 },
    "甘さ": { "a": 3, "b": 2 }
  },
  "overall_rating_diff": { "a": 4.5, "b": 4.7 }
}
```

### 3.5 RLS (Row-Level Security) ポリシー

SupabaseではRLSを有効化し、以下のようなポリシーを適用する：

- `users`: 読み書き不可 (Supabase Authからのみ操作)。
- `profiles`: `auth.uid() = id` のときのみ参照・更新許可。
- `materials`、`spice_blends`、`recipe_bases`、`trials` 等: `user_id = auth.uid()` のレコードのみ参照・更新を許可。ただし `visibility='public'` または `visibility='limited'` の場合は他ユーザーにも読み取りを許可。
- `favorites`: `user_id = auth.uid()` のみ読み書き許可。
- 外部キー制約とCASCADE削除により、ユーザー削除時に関連データも削除される。

## 4. 画面設計

UXは研究記録を円滑に行うことを最優先とし、初期表示は軽量化、必要なときに詳細項目を展開する「プログレッシブディスクロージャ」を採用。

### 4.1 画面一覧

| 画面ID | 名称 | 主なコンポーネント |
|---|---|---|
| **H1** | ホーム | ヘッダー(ロゴ・設定アイコン)、「前回を再現」ボタン、最近の試行リスト、定番レシピエリア、研究中のレシピライン一覧、検索ボックス、フッター。
| **R1** | レシピベース一覧 | カード形式で名前・タグ・試行件数を表示。新規作成ボタン、フィルタ(タグ、公開設定)。
| **R2** | レシピベース詳細 | ベース概要、タグ、試行タイムライン、派生ライン(系譜リンク)、ベース編集/削除。
| **T1** | 試行入力フォーム | ベース選択ドロップダウン、複製元選択、基本項目入力欄、詳細項目切替ボタン、カスタム項目追加ボタン、プリセット呼び出し、写真アップロード、保存/下書きボタン、キャンセル。
| **T2** | 試行詳細ビュー | 試行名、日付、レシピベース名、親試行リンク、材料リスト(表)、詳細属性(カード)、評価チャート、写真カルーセル、メモ、次回狙い、スター/お気に入り/定番昇格ボタン、編集ボタン。
| **T3** | 試行履歴リスト | フィルタ(レシピベース、日付、評価、スター)、並べ替え(最近順、評価順)、リスト表示またはカード表示。カレンダービューへの切替ボタン。
| **T4** | カレンダービュー | 月/週/日単位で試行件数をマーカー表示。クリックで該当日の試行リストへ遷移。
| **C1** | 比較ビュー | 上部で比較対象を選択(親と子を提案)、差分表(材料・工程・評価)、差分ハイライト色分け、比較結果のエクスポートボタン。
| **B1** | 系譜ビュー | 選択したレシピベースまたは試行から、親子関係を横方向にノードと線で表示。各ノードはクリックで詳細を表示し、複製・派生ボタンを提供。ノードの色・アイコンでスターや定番ステータスを表現。
| **S1** | 設定/カスタマイズ | ユーザープロフィール、入力項目の表示順設定、カスタム項目管理、テンプレート管理、データエクスポート、アプリテーマ(ライト/ダーク)切替。

### 4.2 画面フロー

1. **初期起動**: セッションが無ければログイン画面を表示。Magic Link 送信 → メールからリンク開き認証完了。
2. **ホーム表示**: 「前回を再現」ボタンを強調。未入力の下書きがある場合は「続きから入力」ボタンも表示。
3. **新規試行**: ホームまたはレシピベース詳細から「新しい試行」ボタンを押すとT1。ベース選択→材料プリセット選択→スパイスブレンド追加→数量調整→評価入力→保存。
4. **複製試行**: T2から「複製して新規作成」ボタン→T1に遷移し、差分編集。
5. **比較**: T2または試行リストから2件選択し、C1を表示。差分ハイライトを確認し、必要に応じて関連メモや次回改善案を書く。
6. **系譜参照**: レシピベース詳細から「系譜を見る」リンク→B1。ノードクリックで詳細表示および派生開始。
7. **お気に入り/定番設定**: T2でスターアイコンを押すとスター追加。お気に入りボタンを押すとお気に入り一覧に登録。定番昇格ボタンを押すとベース化してR2に反映。

### 4.3 入力UI設計

- **基本項目**は常時表示。`amount` は数値＋単位ドロップダウン (g/ml/個)。`overall_rating` は5段階レーティングバー。
- **詳細項目**はアコーディオンで折りたたみ。ユーザーが詳細入力モードをONにすると展開。
- **カスタム項目**追加はモーダルで実装。項目名、説明、値の型(数値/テキスト/選択肢)を入力し、テンプレートとして保存する機能。
- **プリセット呼び出し**はモーダル内で一覧から選択。選択後に数量調整スライダーで微調整。
- **ステータス切替**はセレクトボックスまたはトグルボタン(Private / Limited / Public)。

## 5. オフライン同期の詳細

- IndexedDB で `offline_trials` テーブルを保持。試行登録時にネットワーク状態を検出し、オフラインならDBに保存。オンライン時にバックグラウンドでSupabaseへ送信し、成功したらローカルデータを削除。同期失敗時はユーザーに通知。
- Service Worker でAPIリクエストをフックし、失敗時にローカルキャッシュへ格納。オンライン時に再送を試みる。
- 画面に「同期待ちリスト」バッジを表示し、同期が完了すると消える。

## 6. 認証・権限設計

- Supabase Auth を使用して Magic Link 認証。ソーシャルログインは v2以降の検討項目。
- 認証状態は React Context で保持し、非ログイン時はログイン画面へリダイレクト。
- RLS によってユーザーデータのプライバシーを確保。公開設定が `public` の試行/レシピのみ他ユーザーが閲覧できる。
- APIルートのレスポンスは認証ユーザーに紐付くデータのみ返すよう、Supabaseの`rpc`関数やEdge Function側で二重チェックを実施。

## 7. エラーハンドリングとフィードバック

- UI層でネットワークエラーや認証エラーを検出し、トースト通知やモーダルでユーザーに知らせる。エラー状態はステートに保持し再試行ボタンを提供。
- フォームバリデーションは、必須項目の未入力や数値範囲をリアルタイムで検出。Zodなどのスキーマバリデーションライブラリを使用。
- APIから返るHTTPステータスを統一：400系は入力エラー、401は認証エラー、403は権限エラー、404は存在しないリソース、500はサーバーエラー。UIは各ケースに応じた文言を用意。

## 8. ロギング・監視

- クライアント: ユーザーの操作ログ（試行作成や比較閲覧）はGoogle AnalyticsやAmplitudeで匿名収集しUX改善に利用。個人情報は含めない。
- サーバー: Supabase Edge Functions および Cloudflare Functions のログをDashbordで閲覧。エラー時はSlack/Webhookに通知。
- パフォーマンス監視: Web Vitals API とNext.jsの built-in analyticsを利用し、起動時間やインタラクション遅延を測定。

## 9. デプロイ・運用

- GitHub リポジトリにmainブランチを配置し、pull request はCI/CDでテスト→lint→buildを実行。
- Cloudflare Pages へデプロイする際、月500ビルドの上限に達しないようブランチ制御。プレビュー環境はPRごとに自動生成。
- Supabaseはプロジェクト毎に `dev` と `prod` 環境を作成。Freeプランの制約を超えそうになったらProプランへの移行を検討。DBスキーマ変更はSupabase Migrationsを使用。

## 10. テスト戦略

- **単体テスト:** Reactコンポーネント、ユーティリティ関数、RLSポリシーの検証。Jest と React Testing Library。
- **APIテスト:** End-to-EndテストでSupabase Edge FunctionsとNext.js API routesを対象にHTTPリクエスト/レスポンスを検証。Supertest 等を利用。
- **E2Eテスト:** Cypress または Playwright でユーザーフローを実行。オフラインモードやキャッシュの動作もテスト対象。
- **パフォーマンステスト:** Lighthouse CI でPWAとしての基準 (スコア80以上) を確認。

## 11. 移行・拡張計画

- **画像ストレージ拡張:** Supabase Storageの1GB制限を超える場合はCloudflare R2へ切り替え。初期実装ではSupabase Storage用のラッパークラスを用意し、R2に変更する際もURL生成やアクセス権限処理を差し替えるだけで済むようにする。
- **公開機能の追加:** v2で公開・限定公開を実装するときは、公開試行と非公開試行を別テーブルに分けるか、RLSポリシーで細かく制御する。公開ページは静的生成可能な構造にし、Cloudflare Pages Functions でSSRする場合はキャッシュ戦略を再検討する。
- **AI提案機能:** ユーザーの過去試行データから次に試すべき材料や手順を提案する場合、Supabase Edge Functions と外部AIサービス(LLM API)を接続。個人データを外部に送る際は明示的な同意を得る。
- **マルチデバイス同期:** モバイルとデスクトップ間で無停止同期できるよう、Realtime APIの採用を検討。パフォーマンスへの影響やFreeプランの制約を考慮しつつ実験する。

## 12. 補足: 技術選定理由

- **Cloudflare Pages:** 無料プランでも無制限の帯域幅とグローバルエッジ配信が利用できる。500ビルド/月・1同時ビルド制限に留意しつつ、個人開発規模では十分。静的アセットの20,000ファイル制限と25MiBファイルサイズ制限はPWA構成に適合。
- **Supabase:** Freeプランで50k MAU・500MB DB・1GB Storage・5GB egressと充実。RLSによるセキュアなデータ分離が容易で、PostgreSQLを直接扱える柔軟性が高い。
- **Next.js PWA:** クロスプラットフォーム開発を1コードベースで実現。App Routerの`app/manifest.ts` によるWeb App Manifest生成やサービスワーカー登録などPWA機能を簡潔に実装できる。
- **Workbox:** Cache戦略やサービスワーカー管理を簡素化し、App Shellパターンとキャッシュ更新を安全に実現。

## 13. 結論
本詳細設計書では、要件定義で掲げた「チャイ研究特化の研究ノート」を実現するために、システム構成から画面設計、データベーススキーマ、API設計、オフライン対応、認証・権限、テスト・運用計画に至るまで具体的に記述した。特に以下の点を重視している：

* **研究ログを主役とする情報構造**：完成レシピではなく試行単位の記録を中心に設計し、ベースレシピから派生する系譜と比較機能を充実させた。これによりユーザーは自分の好みを系統立てて発見できる。
* **柔軟かつシンプルな入力体験**：基本項目・詳細項目・カスタム項目の三層構造により、初めてのユーザーでも迷わず記録を開始でき、研究が深まるほど入力内容を広げられる。プリセットや評価テンプレートにより再利用性を高め、入力の負荷を軽減した。
* **高いモバイル体験とオフライン対応**：Next.js PWAとWorkboxによるApp Shellパターン、キャッシュ戦略、オフライン同期により、帯域や接続状況に左右されない操作性を提供する。これはCloudflare Pagesのエッジ配信と組み合わせて高速なUXを実現する。
* **セキュアでスケーラブルなバックエンド**：SupabaseとPostgreSQLを採用し、RLSでユーザーごとにデータを保護しながら公開・限定公開も実現できる構成とした。無料プランの制約（DB容量、Storage容量、アクティブプロジェクト数など）を考慮し、将来のスケーリングやCloudflare R2への移行も視野に入れた。
* **堅牢なテスト・運用体制**：単体・API・E2Eテストやパフォーマンス監視を含むテスト戦略、CI/CDによる自動デプロイ、ログ監視とアラートにより、高品質を維持しながら開発速度を保てるようにした。

これらの設計要素により、チャイ研究に必要な自由度と利便性をバランスよく提供することができる。本ドキュメントをもとに実装を進め、ユーザーテストを経てフィードバックを反映させることで、チャイ愛好家にとって不可欠な研究ツールを完成させることを期待する。