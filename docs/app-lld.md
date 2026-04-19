# チャイ研究アプリ 詳細設計書 (v1)

**作成日:** 2026-04-18
**改訂方針:** v1は非公開の個人研究ログに限定し、研究ライン、試行、複製、履歴、スターを安全に実装する。

## 1. システムアーキテクチャ

### 1.1 v1の全体構成

v1では、Cloudflare Pages上で動作する静的Next.jsアプリを基本構成とする。読み取り、研究ライン更新、スター切替はSupabase ClientからPostgreSQLへアクセスし、RLSでユーザー単位のデータ隔離を行う。試行本体と材料行の書き込みは定義済みRPCに集約する。Next.js API Routes、Cloudflare Pages Functions、GraphQL、Realtimeはv1では原則使用しない。

```text
ユーザー端末
└─ ブラウザ
   └─ Next.js 静的アプリ
      ├─ React UI
      ├─ React Hook Form + Zod
      ├─ TanStack Query
      ├─ Supabase Client
      └─ localStorage による軽量下書き

クラウド側
├─ Cloudflare Pages
│  └─ 静的アセット配信
└─ Supabase
   ├─ Auth
   ├─ PostgreSQL
   ├─ RLS
   └─ 必要最小限のPostgres RPC
```

### 1.2 v1で使用しないもの

以下はv1では使用しない。

- Next.js API Routes
- Cloudflare Pages Functions
- GraphQL
- Supabase Realtime
- Supabase Storage
- Cloudflare R2
- Workboxによるオフライン自動同期
- 外部AI API

### 1.3 サーバー側ロジック

v1でサーバー側の整合性が必要な処理は、Supabase Postgres RPCとして実装する。対象は、試行本体と材料行を同時に保存する `save_trial_with_ingredients`、既存試行を複製する `clone_trial`、試行を論理削除する `soft_delete_trial` に限定する。

## 2. データベース設計

v1のDBは、非公開の個人研究ログを安全に保存し、試行を複製できることを目的とする。公開機能、材料マスター、スパイスブレンド、写真、カスタム項目、定番昇格はv1のDBに含めない。

### 2.1 テーブル一覧

| テーブル | 役割 |
|---|---|
| `research_lines` | 研究テーマを表す。 |
| `trials` | 1回分の試行ログを表す。 |
| `trial_ingredients` | 試行に含まれる材料行を表す。 |
| `trial_stars` | ユーザーが試行に付けるスターを表す。 |

### 2.2 DDL方針

```sql
CREATE TABLE research_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  research_line_id uuid NOT NULL REFERENCES research_lines(id) ON DELETE CASCADE,
  parent_trial_id uuid REFERENCES trials(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  brewed_at timestamptz NOT NULL DEFAULT now(),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  brewing_time_minutes numeric(6,2) CHECK (brewing_time_minutes IS NULL OR brewing_time_minutes >= 0),
  boil_count smallint CHECK (boil_count IS NULL OR boil_count BETWEEN 0 AND 20),
  strainer text CHECK (strainer IS NULL OR char_length(strainer) <= 80),
  note text NOT NULL CHECK (char_length(btrim(note)) BETWEEN 1 AND 1000),
  next_idea text NOT NULL CHECK (char_length(btrim(next_idea)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE trial_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('tea','water','milk','sweetener','spice','other')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  amount numeric(8,2) CHECK (amount IS NULL OR amount >= 0),
  unit text CHECK (unit IS NULL OR char_length(unit) <= 16),
  timing text CHECK (timing IS NULL OR char_length(timing) <= 80),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0)
);

CREATE TABLE trial_stars (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_id uuid NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trial_id)
);
```

### 2.3 制約

- `trials.research_line_id` は必須とする。
- 新規作成または研究ライン変更時の `research_line_id` は、認証ユーザー本人の未アーカイブ研究ラインのみ参照できる。
- `trials.parent_trial_id` は同一ユーザーの試行のみ参照できる。
- `parent_trial_id` の循環は禁止する。`save_trial_with_ingredients` と `clone_trial` で、自己参照と祖先方向の循環を拒否する。
- `trial_ingredients` は材料マスターを参照しない。v1では試行時点の材料名と量をスナップショットとして保存する。
- `deleted_at` は試行の論理削除に使用する。物理削除はv1では管理者作業または将来のクリーンアップ対象とする。
- 研究ラインのアーカイブは `archived_at` 更新で表す。v1のUIとクライアント処理から物理削除は行わない。
- RPCの `input jsonb` は通信上の入力形式であり、任意のJSONBを業務データとして永続化する設計ではない。

### 2.4 入力長と値の上限

UI、Zod、RPC、DB制約は次の上限をそろえる。上限は、非技術者が扱う画面での表示崩れと過大入力を防ぐための制約であり、機能追加ではない。

| 項目 | 制約 |
|---|---|
| 研究ライン名、試行名 | 1〜80文字。前後空白だけの値は禁止。 |
| 研究ライン説明 | 500文字以内。 |
| 一言メモ、次回の狙い | 1〜1000文字。前後空白だけの値は禁止。 |
| 材料名 | 1〜80文字。 |
| 単位 | 16文字以内。自由入力だが短い単位名に限定する。 |
| こし方、投入タイミング | 80文字以内。 |
| 評価 | 1〜5。 |
| 煮出し時間 | 0以上。 |
| 沸騰回数 | 0〜20。 |

### 2.5 インデックス

```sql
CREATE INDEX idx_research_lines_user_id ON research_lines(user_id);
CREATE UNIQUE INDEX idx_research_lines_active_title
  ON research_lines(user_id, title)
  WHERE archived_at IS NULL;
CREATE INDEX idx_trials_user_id ON trials(user_id);
CREATE INDEX idx_trials_research_line_id ON trials(research_line_id);
CREATE INDEX idx_trials_parent_trial_id ON trials(parent_trial_id);
CREATE INDEX idx_trials_brewed_at ON trials(brewed_at DESC);
CREATE INDEX idx_trials_user_brewed_active ON trials(user_id, brewed_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_trial_ingredients_trial_id ON trial_ingredients(trial_id);
```

## 3. データアクセス / API設計

v1では独自REST APIを原則作成しない。フロントエンドはSupabase Clientを通じて、RLSで保護されたテーブルへアクセスする。試行保存、試行複製、試行論理削除はPostgres RPCを使用する。

### 3.1 クライアント操作

| 操作 | 方法 |
|---|---|
| 研究ライン一覧取得 | `research_lines` を認証ユーザー条件で取得 |
| 研究ライン作成・編集 | `research_lines` へ insert / update |
| 試行一覧取得 | `trials` と `trial_stars` を取得。材料詳細は必要時に取得 |
| 試行詳細取得 | `trials` と `trial_ingredients` を取得 |
| 試行作成・編集 | `save_trial_with_ingredients(input jsonb)` RPC を呼び出す |
| 試行論理削除 | `soft_delete_trial(trial_id uuid)` RPC を呼び出す |
| スター切替 | `trial_stars` に insert / delete |
| 試行複製 | `clone_trial(source_trial_id uuid)` RPC を呼び出す |

### 3.2 `save_trial_with_ingredients` RPC

`save_trial_with_ingredients(input jsonb)` は、試行本体と材料行を1トランザクションで保存し、保存後の試行IDを返す。

- 新規作成時は `input.id` を空にし、認証ユーザー本人の未アーカイブ研究ラインに試行を作成する。
- 編集時は `input.id` が認証ユーザー本人の未削除試行であることを確認する。
- 材料行はv1では全置換とする。保存時に既存材料行を削除し、入力された材料行を `display_order` 順で再作成する。
- `parent_trial_id` を設定する場合は、認証ユーザー本人の未削除試行のみ許可する。
- `parent_trial_id` が自分自身または子孫試行を指す場合は拒否する。
- `research_line_id` を変更する場合は、変更先が認証ユーザー本人の未アーカイブ研究ラインであることを確認する。
- `user_id`、`created_at`、`updated_at`、`deleted_at`、`trial_stars` は入力から受け取らず、サーバー側で決定する。
- 保存中に一部だけ成功した状態を残さない。

入力JSONは次の形に限定する。未知のキーは無視せず、入力エラーとして扱う。

```ts
type SaveTrialInput = {
  id?: string;
  research_line_id: string;
  parent_trial_id?: string | null;
  title: string;
  brewed_at: string;
  rating: 1 | 2 | 3 | 4 | 5;
  brewing_time_minutes?: number | null;
  boil_count?: number | null;
  strainer?: string | null;
  note: string;
  next_idea: string;
  ingredients: Array<{
    category: 'tea' | 'water' | 'milk' | 'sweetener' | 'spice' | 'other';
    name: string;
    amount?: number | null;
    unit?: string | null;
    timing?: string | null;
    display_order: number;
  }>;
};
```

### 3.3 `clone_trial` RPC

`clone_trial` は指定された試行を複製し、新しい試行IDを返す。

- 元試行が認証ユーザーのものでない場合は失敗する。
- 元試行が論理削除済みの場合は失敗する。
- 元試行の研究ラインがアーカイブ済みの場合は失敗する。
- `trial_ingredients` をコピーする。
- 新しい試行の `parent_trial_id` には元試行IDを設定する。
- `trial_stars` はコピーしない。
- `created_at`、`updated_at` は新規作成時刻とする。

コピー対象は以下とする。

| フィールド | 複製時の扱い |
|---|---|
| `user_id` | `auth.uid()` を設定する。 |
| `research_line_id` | 元試行と同じ研究ラインを設定する。ただし研究ラインがアーカイブ済みなら失敗する。 |
| `parent_trial_id` | 元試行IDを設定する。 |
| `title` | 元試行タイトルを初期値としてコピーする。 |
| `brewed_at` | 新規作成時刻を設定する。 |
| `rating` | 元試行の値をコピーする。 |
| `brewing_time_minutes` | 元試行の値をコピーする。 |
| `boil_count` | 元試行の値をコピーする。 |
| `strainer` | 元試行の値をコピーする。 |
| `note` | 元試行の値をコピーする。 |
| `next_idea` | 元試行の値をコピーする。 |
| `deleted_at` | `null` を設定する。 |
| `trial_ingredients` | 全行をコピーする。 |
| `trial_stars` | コピーしない。 |

### 3.4 `soft_delete_trial` RPC

`soft_delete_trial(trial_id uuid)` は、認証ユーザー本人の未削除試行だけを対象に `deleted_at` を設定する。

- 対象試行が存在しない、他ユーザーの試行である、または既に論理削除済みの場合は失敗する。
- 物理削除は行わない。
- `trial_ingredients` と `trial_stars` は物理削除しない。通常の一覧・詳細では `deleted_at IS NULL` の試行だけを扱う。
- 失敗時は内部IDやSQL詳細を返さない。

### 3.5 エラー方針

v1ではUI側で次のエラー分類を扱う。

- 認証エラー
- 権限エラー
- 入力エラー
- ネットワークエラー
- 予期しない保存エラー

詳細なAPI Error Contractは [Supabase Data Access & Error Contract](supabase-data-access-error-contract.md) で定義する。

### 3.6 RLSポリシーと書き込み権限

v1では全データを非公開とし、認証ユーザー本人のみが自分のデータを参照・更新できる。公開・限定公開の読み取りポリシーは作成しない。

- `research_lines`: `user_id = auth.uid()` のレコードのみ select / insert / update を許可する。deleteポリシーはv1では作成しない。
- `trials`: selectは `user_id = auth.uid()` のレコードのみ許可する。insert / update / delete はアプリから直接呼ばず、`save_trial_with_ingredients`、`clone_trial`、`soft_delete_trial` に集約する。
- `trial_ingredients`: selectは親の `trials.user_id = auth.uid()` が成立する場合のみ許可する。insert / update / delete はアプリから直接呼ばず、`save_trial_with_ingredients` と `clone_trial` に集約する。
- `trial_stars`: `user_id = auth.uid()` のレコードのみ select / insert / delete を許可する。
- `save_trial_with_ingredients`、`clone_trial`、`soft_delete_trial` RPC は `security definer` を使用する場合でも、内部で必ず `auth.uid()` と対象レコードの所有者を照合する。
- RLSテストでは、ユーザーAがユーザーBの研究ライン、試行、材料行、スターを読めないことを確認する。

## 4. 画面設計

v1の画面は、研究ログを素早く保存し、前回の試行を複製して少し変える体験に集中する。写真、カレンダー、比較画面、系譜グラフ、設定の高度なカスタマイズはv1では扱わない。

| 画面ID | 名称 | 主なコンポーネント |
|---|---|---|
| **A1** | 認証画面 | Magic Link用メール入力、送信、送信後案内、認証エラー表示 |
| **H1** | ホーム | 直近の試行、「前回を複製」ボタン、研究ライン一覧、最近の試行 |
| **L1** | 研究ライン一覧 | 研究ラインカード、新規作成、編集、アーカイブ |
| **L2** | 研究ライン詳細 | ライン概要、試行一覧、新規試行ボタン |
| **T1** | 試行入力フォーム | 研究ライン選択、材料行入力、基本評価、メモ、次回の狙い、保存、下書き |
| **T2** | 試行詳細 | 試行内容、材料行、親試行リンク、複製ボタン、スター、編集 |
| **T3** | 試行履歴 | 最新順リスト、研究ライン絞り込み、スター絞り込み |
| **S1** | 最小設定 | ログアウト、下書き管理 |

v1ではC1比較ビュー、B1系譜ビュー、カレンダービューは作成しない。

### 4.1 画面フロー

1. 未ログインの場合はログイン画面を表示する。
2. 初回ログイン後、研究ラインがない場合は研究ライン作成へ誘導する。
3. 研究ライン作成後、最初の試行入力へ誘導する。
4. 既存試行がある場合、ホームで直近試行の複製を主要アクションとして表示する。
5. 試行詳細では、親試行リンク、複製、編集、スターを提供する。

### 4.2 入力UI設計

- フォームはモバイル1カラムを基本とする。
- 材料行はカテゴリ、名称、量、単位を1行単位で入力する。
- 詳細項目は煮出し時間、沸騰回数、こし方に限定する。
- 写真、公開設定、カスタム項目は表示しない。
- 保存失敗時は入力内容を保持し、再試行できるようにする。

## 5. オフライン対応

v1ではオフライン自動同期を実装しない。ネットワーク切断時にサーバー保存をキューへ積み、オンライン復帰後に自動再送する機能は対象外とする。

v1で扱うのは、入力中データの軽量なローカル下書きのみである。下書きは簡易復元のための補助であり、サーバー保存やバックアップではない。

- 下書きは同一端末・同一ブラウザ内に保存する。
- 下書きは `chai-lab:draft:v1:<user_id>` のように認証ユーザー単位で名前空間を分け、未認証状態や別ユーザーには復元しない。
- 下書きはユーザーが明示的に破棄できる。
- 下書き復元時には、保存されていない内容であることをUIで明示する。
- ログアウト時は未送信下書きを保持するか破棄するかをユーザーに確認する。
- オンライン復帰時の自動送信は行わない。
- 複数端末間の同期、競合解決、再送管理はv2以降で別途設計する。

## 6. 認証・権限設計

- Supabase Auth の Magic Link を使用する。
- 認証状態はSupabase Clientから取得する。
- 非ログイン時はログイン画面へ誘導する。
- v1の全データは非公開であり、他ユーザーのデータを読むUIやAPIは存在しない。

## 7. エラーハンドリングとフィードバック

- フォームバリデーションはZodで行う。
- 必須項目、数値範囲、材料行の不足を保存前に検出する。
- 保存失敗時は入力内容を保持する。
- 認証切れの場合はログインへ誘導する。
- 権限エラーは「対象のデータを表示できません」と表示し、詳細なIDや内部情報は表示しない。

## 8. ロギング・監視

v1では外部Analyticsを導入しない。個人研究ログの内容を外部分析サービスへ送らない。運用上必要なエラー確認は、Cloudflare PagesとSupabaseの標準ログで行う。

## 9. デプロイ・運用

- GitHubのmainブランチを本番デプロイ対象とする。
- Pull Requestではlint、typecheck、test、buildを実行する。
- Cloudflare Pagesへ静的アプリとしてデプロイし、Next.js静的出力、認証リダイレクト、環境変数、固定ルート方針は [Deployment Contract](deployment-contract.md) に従う。
- DBスキーマ変更はSupabase migrationsで管理し、[DB Migration & RLS Policy](db-migration-rls-policy.md) に従う。
- migrationにはRLSとテスト観点を必ず含める。

## 10. テスト戦略

- **単体テスト:** バリデーション、表示ロジック、複製関連のユーティリティを対象とする。
- **RLSテスト:** ユーザーAがユーザーBの研究ライン、試行、材料行、スターを読めないことを確認する。
- **UIテスト:** Playwrightで主要画面のモバイル・デスクトップ表示を確認する。
- **E2Eテスト:** ログイン後の研究ライン作成、試行作成、複製、スター切替を確認する。

## 11. 移行・拡張計画

v1で継続利用が確認できた後、次の順で拡張を検討する。

1. 親子2件に限定した比較表示
2. カレンダーまたは簡易統計
3. 写真アップロード
4. カスタム項目
5. 定番化した試行の管理
6. 簡易系譜ビュー
7. 公開・限定公開
8. AI提案
9. SNS要素

これらはv1のDBやUIに先回りして実装しない。拡張時は要件定義、詳細設計、RLS、[MVP Scope Contract](mvp-scope-contract.md)、受け入れ基準を更新してから実装する。

## 12. 結論

本詳細設計書は、チャイ研究アプリv1を非公開の個人研究ログとして実装するための最小設計を定義した。v1の実装対象は、認証、研究ライン、試行、材料行、複製、履歴、スター、軽量下書き、RLSに限定する。

公開、写真、比較、系譜、カスタム項目、AI、オフライン自動同期はv1では扱わない。これにより、初期実装の安全性、継続運用性、Codexによる実装再現性を優先する。
