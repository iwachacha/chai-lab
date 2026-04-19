# チャイ研究アプリ DB Migration & RLS Policy

**作成日:** 2026-04-19

この文書は、チャイ研究アプリv1におけるDB migration、RLS、DB変更レビューの方針を定義する。v1の全業務データは非公開であり、RLS不備は重大事故として扱う。

## 1. 基本方針

v1のDB変更は、Supabase migrationsで管理する。Supabase管理画面からの手動スキーマ変更を正規手順として扱わない。

DB変更では、次の原則を守る。

1. migration、RLS、インデックス、テスト観点をセットで扱う。
2. 業務テーブルには必ずユーザー所有者または親レコード経由の所有者確認を持たせる。
3. 公開・限定公開・共有URL向けのカラムやポリシーをv1で作らない。
4. クライアントから `service_role` を使わない。
5. RLSを無効化したまま実装を進めない。
6. DB変更は、要件定義、詳細設計、MVP Scope Contractと整合している場合のみ行う。

## 2. migration運用

### 2.1 ファイル単位

1つのmigrationは、1つの論理変更に限定する。複数の無関係な変更を1ファイルに混ぜない。

ファイル名は以下を基本とする。

```text
supabase/migrations/YYYYMMDDHHMMSS_short_description.sql
```

例:

```text
supabase/migrations/20260419090000_create_v1_core_tables.sql
supabase/migrations/20260419093000_add_save_trial_with_ingredients_rpc.sql
supabase/migrations/20260419094000_add_clone_trial_rpc.sql
supabase/migrations/20260419100000_add_v1_rls_policies.sql
```

### 2.2 migrationの構成

DB変更を含むPRでは、migrationと同時に次を提示する。

| 項目 | 必須内容 |
|---|---|
| 目的 | なぜDB変更が必要か。 |
| 影響テーブル | 追加・変更・削除されるテーブル、カラム、関数、ポリシー。 |
| RLS | `USING` と `WITH CHECK` の方針。 |
| インデックス | 一覧、詳細、絞り込みで必要なインデックス。 |
| 互換性 | 既存データ、既存画面、既存RPCへの影響。 |
| テスト | RLS、CRUD、複製、エラーケースの確認方法。 |
| ロールバック | 問題発生時に戻す方針。必要に応じて修正migrationを作る。 |

### 2.3 禁止事項

v1では以下を禁止する。

- RLSなしの業務テーブル作成
- `anon` ロールに業務データの読み書きを許可すること
- 公開・限定公開を想定した `visibility`、`public_slug`、`share_token` などの追加
- 写真、ファイル、Storage連携前提のテーブル追加
- 材料マスター、スパイスブレンド、カスタム項目定義の先回り追加
- `service_role` キーをフロントエンドで使う設計
- `security definer` 関数で所有者確認を省略すること
- 既存RLSを一時的に広げてから後で直す進め方

## 3. v1許可テーブル

v1で許可する業務テーブルは以下に限定する。

| テーブル | 所有者判定 | RLS要件 |
|---|---|---|
| `research_lines` | `user_id = auth.uid()` | 本人のみ select / insert / update。v1ではdeleteポリシーを作らず、削除UIは `archived_at` 更新とする。 |
| `trials` | `user_id = auth.uid()` | 本人のみ select / insert / update。v1ではdeleteポリシーを作らず、削除UIは `deleted_at` 更新とする。 |
| `trial_ingredients` | 親 `trials.user_id = auth.uid()` | 親試行が本人のものだけ select / insert / update / delete。 |
| `trial_stars` | `user_id = auth.uid()` | 本人のスターだけ select / insert / delete。 |

## 4. RLS設計ルール

### 4.1 共通ルール

すべての業務テーブルでRLSを有効化する。

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

`FORCE ROW LEVEL SECURITY` は、運用とテスト方針が固まるまでは必須にしない。ただし、RLSを迂回するアプリケーション経路を作ってはならない。

親レコード所有者の確認は、RLSポリシー内で複雑な自己参照を直接書かず、`security definer` の検証関数に切り出す。検証関数は `auth.uid()` を内部で参照し、`search_path` を固定する。

```sql
CREATE FUNCTION is_own_active_research_line(target_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM research_lines
    WHERE id = target_id
      AND user_id = auth.uid()
      AND archived_at IS NULL
  );
$$;

CREATE FUNCTION is_own_active_trial(target_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trials
    WHERE id = target_id
      AND user_id = auth.uid()
      AND deleted_at IS NULL
  );
$$;
```

### 4.2 `research_lines`

`research_lines` は `user_id` で所有者を判定する。

- select: `user_id = auth.uid()`
- insert: `user_id = auth.uid()`
- update: `user_id = auth.uid()` かつ更新後も `user_id = auth.uid()`
- delete: v1ではポリシーを作成しない

v1のUI削除はアーカイブとして扱い、原則 `archived_at` を更新する。物理削除は管理作業または将来のデータ整理で扱う。アーカイブ済み研究ラインは新規試行選択から除外し、既存試行の `research_line_id` は維持する。

SQL雛形:

```sql
CREATE POLICY research_lines_select_own
ON research_lines FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY research_lines_insert_own
ON research_lines FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY research_lines_update_own
ON research_lines FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 4.3 `trials`

`trials` は `user_id` で所有者を判定する。

- select: `user_id = auth.uid()` かつ通常画面では `deleted_at IS NULL`
- insert: `user_id = auth.uid()` かつ参照する `research_line_id` が本人の未アーカイブ研究ラインである
- update: `user_id = auth.uid()` かつ更新後も `user_id = auth.uid()`。`research_line_id` を変更する場合は本人の未アーカイブ研究ラインのみ許可する
- delete: v1ではポリシーを作成しない

`parent_trial_id` を設定する場合は、同一ユーザーの試行のみ許可する。循環する親子関係は禁止する。

SQL雛形:

```sql
CREATE POLICY trials_select_own
ON trials FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY trials_insert_own_active_line
ON trials FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND is_own_active_research_line(research_line_id)
  AND (
    parent_trial_id IS NULL
    OR is_own_active_trial(parent_trial_id)
  )
);

CREATE POLICY trials_update_own_active_line
ON trials FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND is_own_active_research_line(research_line_id)
  AND (
    parent_trial_id IS NULL
    OR is_own_active_trial(parent_trial_id)
  )
);
```

### 4.4 `trial_ingredients`

`trial_ingredients` は自身に `user_id` を持たないため、親 `trials` の所有者で判定する。

- select: 親試行の `user_id = auth.uid()`
- insert: 挿入先の親試行の `user_id = auth.uid()`
- update: 更新対象の親試行の `user_id = auth.uid()`
- delete: 親試行の `user_id = auth.uid()`

材料行を取得・保存する処理では、必ず親試行の所有者確認が通る設計にする。

SQL雛形:

```sql
CREATE POLICY trial_ingredients_select_own
ON trial_ingredients FOR SELECT
USING (
  is_own_active_trial(trial_id)
);

CREATE POLICY trial_ingredients_insert_own
ON trial_ingredients FOR INSERT
WITH CHECK (
  is_own_active_trial(trial_id)
);

CREATE POLICY trial_ingredients_update_own
ON trial_ingredients FOR UPDATE
USING (
  is_own_active_trial(trial_id)
)
WITH CHECK (
  is_own_active_trial(trial_id)
);

CREATE POLICY trial_ingredients_delete_own
ON trial_ingredients FOR DELETE
USING (
  is_own_active_trial(trial_id)
);
```

### 4.5 `trial_stars`

`trial_stars` は `user_id` と `trial_id` の複合主キーで扱う。

- select: `user_id = auth.uid()`
- insert: `user_id = auth.uid()` かつ対象試行の `user_id = auth.uid()`
- delete: `user_id = auth.uid()`
- update: v1では不要

スターは本人の軽い印であり、他ユーザーと共有しない。

SQL雛形:

```sql
CREATE POLICY trial_stars_select_own
ON trial_stars FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY trial_stars_insert_own
ON trial_stars FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND is_own_active_trial(trial_id)
);

CREATE POLICY trial_stars_delete_own
ON trial_stars FOR DELETE
USING (user_id = auth.uid());
```

## 5. RPC方針

v1で許可するRPCは、複数テーブルをまとめて扱う処理に限定する。初期対象は `save_trial_with_ingredients(input jsonb)` と `clone_trial(source_trial_id uuid)` のみである。

### 5.1 `save_trial_with_ingredients`

`save_trial_with_ingredients` は、試行本体と材料行を1トランザクションで保存する。

1. `auth.uid()` が存在しない場合は失敗する。
2. 新規作成時は、入力された `research_line_id` が認証ユーザー本人の未アーカイブ研究ラインであることを確認する。
3. 編集時は、対象試行が認証ユーザー本人の未削除試行であることを確認する。
4. `parent_trial_id` がある場合は、認証ユーザー本人の未削除試行であることを確認する。
5. 材料行は全置換とする。既存材料行を削除し、入力された材料行を再作成する。
6. 試行本体と材料行の保存は同一トランザクションで行い、一部だけ成功した状態を残さない。
7. 失敗時は内部情報を返さない。

### 5.2 `clone_trial`

`clone_trial` は以下を満たす。

1. `source_trial_id` が認証ユーザー本人の試行であることを確認する。
2. 元試行が論理削除済みの場合は失敗する。
3. 元試行の研究ラインがアーカイブ済みの場合は失敗する。
4. 詳細設計書のコピー対象マトリクスに従って `trials` を作成する。
5. `trial_ingredients` をコピーする。
6. 新しい試行の `parent_trial_id` に元試行IDを設定する。
7. `trial_stars` はコピーしない。
8. 新しい試行IDを返す。
9. 失敗時は内部情報を返さない。

RPCで `security definer` を使う場合は、必ず関数内で `auth.uid()` と所有者を照合し、`search_path` を固定する。

## 6. RLSテスト要件

DB変更を含む実装では、最低限以下を確認する。

| テスト | 期待結果 |
|---|---|
| ユーザーAが自分の研究ラインを作成できる | 成功する。 |
| ユーザーAがユーザーBの研究ラインを取得する | 0件または権限エラーになる。 |
| ユーザーAがユーザーBの試行を取得する | 0件または権限エラーになる。 |
| ユーザーAがユーザーBの試行に材料行を追加する | 失敗する。 |
| ユーザーAがユーザーBの試行を複製する | 失敗する。 |
| ユーザーAがユーザーBの試行にスターを付ける | 失敗する。 |
| 未認証状態で業務テーブルを読む | 失敗する。 |
| ユーザーAが `research_lines` を物理削除する | 失敗する。 |
| ユーザーAが `trials` を物理削除する | 失敗する。 |
| `save_trial_with_ingredients` が試行本体と材料行を同時に保存する | 一部保存の状態を残さない。 |
| `clone_trial` が材料行をコピーしスターをコピーしない | 期待どおりの新規試行が作成される。 |

## 7. レビュー必須条件

以下に該当するDB変更は、人間レビューなしにマージしてはならない。

- 新しい業務テーブルの追加
- RLSポリシーの追加、変更、削除
- `security definer` 関数の追加、変更
- 所有者カラムまたは親子関係の変更
- 削除、アーカイブ、論理削除の挙動変更
- 公開、共有、写真、カスタム項目、比較、系譜、AIに関係するDB変更

## 8. 実装前チェックリスト

DB変更前に以下を確認する。

1. MVP Scope Contractに含まれる変更か。
2. 詳細設計書のテーブル方針と矛盾しないか。
3. RLSの `USING` と `WITH CHECK` を説明できるか。
4. 他ユーザーのデータを読めないテストがあるか。
5. Supabase Data Access & Error Contractの戻り値とエラー分類に影響しないか。
6. 画面別受け入れ基準に必要な状態が追加されているか。
7. Codex Execution Rules上、実装前に反対または保留すべき変更ではないか。
