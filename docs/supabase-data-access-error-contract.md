# チャイ研究アプリ Supabase Data Access & Error Contract

**作成日:** 2026-04-19

この文書は、チャイ研究アプリv1におけるSupabaseデータアクセスとエラー取り扱いの契約を定義する。v1では独自REST APIを作成せず、フロントエンドはSupabase Client、PostgreSQL、RLS、必要最小限のPostgres RPCを通じてデータを扱う。

**運用注記:** RPC内部エラー識別子、AppError分類、Data Access責務の技術判断はAIが行う。RPC追加/変更時は、識別子、UI向け分類、RLS/所有者確認、direct CRUD禁止、部分保存なしをAI自己監査記録に残し、人間確認はv1スコープ変更、外部契約、本番データ、不可逆操作に限る。

## 1. 基本方針

1. UIコンポーネントからSupabase Clientを直接呼び出さない。
2. Supabase操作はデータアクセス層に閉じ込める。
3. UIへ返すエラーは、本書の分類に正規化する。
4. RLSを前提にしつつ、クライアント側でも認証状態と所有者前提を崩さない。
5. `service_role` キーをブラウザへ渡さない。
6. 内部テーブル名、SQL、ポリシー名、Supabaseの詳細エラーをユーザーに表示しない。

## 2. データアクセス層

実装では、機能ごとにデータアクセス関数を用意する。ファイル構成は実装時に決めてよいが、UIからは以下の責務を持つ関数群を呼び出す。

| 領域           | 代表操作                                            |
| -------------- | --------------------------------------------------- |
| Auth           | セッション取得、Magic Link送信、ログアウト          |
| Research Lines | 一覧取得、詳細取得、作成、編集、アーカイブ          |
| Trials         | 一覧取得、詳細取得、作成、編集、論理削除、複製      |
| Ingredients    | `save_trial_with_ingredients` RPC内での材料行全置換 |
| Stars          | スター取得、付与、解除                              |
| Drafts         | ローカル下書き保存、復元、破棄                      |

試行本体と材料行の書き込みは、`save_trial_with_ingredients`、`clone_trial`、`soft_delete_trial` に集約する。データアクセス層であっても、`trials` と `trial_ingredients` を直接 insert / update / delete しない。

データアクセス層はSupabaseの戻り値をそのままUIへ渡さず、成功結果または正規化エラーとして返す。

## 3. 戻り値形式

データアクセス関数は、原則として以下の形で結果を返す。

```ts
type AppResult<T> = { ok: true; data: T } | { ok: false; error: AppError };
```

例外をUIまで伝播させない。予期しない例外も `UNKNOWN_ERROR` または `SERVER_ERROR` に正規化する。

## 4. エラー分類

v1でUIが扱うエラーは以下に限定する。

| code               | 意味                                            | UI表示方針                                             |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------ |
| `AUTH_REQUIRED`    | 未ログイン、セッションなし                      | ログインを促す。                                       |
| `AUTH_EXPIRED`     | セッション切れ                                  | 再ログインを促す。                                     |
| `FORBIDDEN`        | RLSまたは権限により操作不可                     | 「対象のデータを表示または変更できません」と表示する。 |
| `NOT_FOUND`        | 対象データが存在しない、またはRLSにより見えない | 存在しないか表示できない旨を表示する。                 |
| `VALIDATION_ERROR` | 入力値が不正                                    | 入力欄の近くに表示する。                               |
| `CONFLICT`         | 重複、同時更新、親子関係不整合                  | 再読み込みまたは入力修正を促す。                       |
| `NETWORK_ERROR`    | 通信断、タイムアウト                            | 再試行導線を表示する。                                 |
| `RATE_LIMITED`     | 認証メール送信などの制限                        | 時間をおいて再試行するよう伝える。                     |
| `SERVER_ERROR`     | SupabaseまたはRPCで処理不能                     | 入力を保持し、再試行または時間をおくよう伝える。       |
| `UNKNOWN_ERROR`    | 分類不能                                        | 入力を保持し、再試行導線を表示する。                   |

## 5. `AppError`形式

```ts
type AppError = {
  code:
    | "AUTH_REQUIRED"
    | "AUTH_EXPIRED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "CONFLICT"
    | "NETWORK_ERROR"
    | "RATE_LIMITED"
    | "SERVER_ERROR"
    | "UNKNOWN_ERROR";
  message: string;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
};
```

`message` はユーザー向け文言とする。Supabaseの生エラーメッセージをそのまま入れない。開発時に詳細が必要な場合は、開発者向けログに限定して扱う。

## 6. Auth契約

### 6.1 Magic Link送信

入力:

- `email: string`

成功:

- Magic Link送信済み状態を返す。

失敗:

- メール形式不正: `VALIDATION_ERROR`
- 送信制限: `RATE_LIMITED`
- 通信失敗: `NETWORK_ERROR`
- その他: `SERVER_ERROR`

### 6.2 セッション取得

成功:

- 認証済みユーザーIDを返す。

失敗:

- セッションなし: `AUTH_REQUIRED`
- セッション切れ: `AUTH_EXPIRED`

## 7. Research Lines契約

### 7.1 一覧取得

条件:

- 認証済みユーザーであること。
- 通常一覧では `archived_at IS NULL` を基本とする。
- 新規試行選択用の一覧では、アーカイブ済み研究ラインを返さない。
- Data Accessの既定一覧関数は、`archived_at IS NULL` を付けたうえで `updated_at DESC, created_at DESC` の順で返す。

成功:

- 自分の研究ラインのみを返す。

失敗:

- 未認証: `AUTH_REQUIRED`
- 通信失敗: `NETWORK_ERROR`
- その他: `SERVER_ERROR`

### 7.2 作成・編集

入力:

- `title: string`
- `description?: string`

検証:

- `title` は必須。
- `title` は前後空白をtrimした値を保存する。Data Accessは保存前に `trim()` を適用し、その結果に対して長さ検証を行う。これはDBの `title = btrim(title)` 制約と一致させるための normalize であり、DBより広い意味付けは追加しない。
- 同一ユーザー内の未アーカイブ研究ラインで、trim後タイトルが完全一致するものは許可しない。
- 大文字小文字、全角半角、Unicode正規化はv1では同一視しない。
- `description` は任意で、Data Accessでは空文字を強制的に `null` へ変換しない。文字数上限 500 だけをクライアント側でも確認し、trimや正規化を追加しない。

失敗:

- 入力不正: `VALIDATION_ERROR`
- 重複: `CONFLICT`
- 権限なし: `FORBIDDEN`

### 7.3 アーカイブ

処理:

- `archived_at` を設定する。
- 物理削除は行わない。
- 既存試行の `research_line_id` は変更しない。
- アーカイブ済み研究ラインは新規試行選択用一覧に返さない。
- アーカイブ後は、同一ユーザーが同じtrim後タイトルで新しい研究ラインを再作成できる。Data Accessはアーカイブ済み行を通常一覧から除外するが、archive後に同名再利用を独自に拒否しない。

失敗:

- 対象なし: `NOT_FOUND`
- 権限なし: `FORBIDDEN`

### 7.4 詳細取得

条件:

- 認証済みユーザーであること。
- 本人の研究ラインだけを返す。
- `archived_at` が設定済みの研究ラインでも、既存試行や履歴から参照できるよう通常の詳細取得では返してよい。

失敗:

- 対象なしまたは表示不可: `NOT_FOUND`
- 権限なし: `FORBIDDEN`

### 7.5 削除

- `research_lines` の physical delete API はData Accessに作らない。
- v1の削除相当操作は `archived_at` 更新だけに限定する。

## 8. Trials契約

### 8.1 一覧取得

条件:

- 認証済みユーザーであること。
- 通常一覧では `deleted_at IS NULL` を基本とする。
- Data Access層の通常取得関数は、一覧、詳細、集計、複製元候補、スター状態取得のすべてで論理削除済み試行を返さない。
- 研究ライン、スター有無、日付範囲で絞り込める。
- 初回取得は50件までとし、追加読み込みも50件単位とする。
- 並び順は `brewed_at DESC, created_at DESC` を基本とする。
- `brewed_at` はv1では `Asia/Tokyo` のカレンダー日として扱う。Data Accessはdate-only入力をJST 00:00のISO timestampへ変換して保存し、表示用にはJST日付へ戻す。日付範囲検索を実装する場合は `[開始日JST 00:00, 翌日JST 00:00)` で境界を作る。

成功:

- 自分の試行のみを最新順で返す。

### 8.2 詳細取得

成功:

- 試行本体、材料行、スター状態、親試行への参照情報を返す。
- 対象試行が論理削除済みの場合は、本人の試行であっても通常詳細として返さない。

失敗:

- 対象なしまたは表示不可: `NOT_FOUND`
- 権限なし: `FORBIDDEN`

### 8.3 作成・編集

入力:

- 研究ラインID
- 試行名
- 日付
- 材料行
- 総合評価
- 一言メモ
- 次回の狙い
- 詳細項目

検証:

- 研究ラインIDは本人の研究ラインを指すこと。
- 試行名、日付、材料行、総合評価、一言メモ、次回の狙いは必須。
- 評価は定義済み範囲内であること。
- 材料行は少なくとも1行以上であること。
- 文字数、数値範囲、材料カテゴリは [詳細設計書](app-lld.md) の入力長と値の上限に従う。
- `user_id`、`created_at`、`updated_at`、`deleted_at`、スター状態は入力として受け取らない。

保存:

- 試行本体と材料行は `save_trial_with_ingredients(input jsonb)` RPCで保存する。
- 保存処理は1トランザクションで行う。
- 編集時の材料行は全置換に統一する。既存材料行を削除し、入力された材料行を `display_order` 順で再作成する。
- `parent_trial_id` が自分自身または子孫試行を指す場合は保存しない。
- RPCが失敗した場合、試行本体だけ、または材料行だけが保存された状態を残さない。

失敗:

- 入力不正: `VALIDATION_ERROR`
- 権限なし: `FORBIDDEN`
- 通信失敗: `NETWORK_ERROR`
- 保存失敗: `SERVER_ERROR`

### 8.4 論理削除

処理:

- `soft_delete_trial(trial_id uuid)` RPCで `deleted_at` を設定する。
- v1のUIから物理削除しない。
- 論理削除後の試行は通常一覧、詳細、集計、スター取得、複製元の候補に出さない。
- RLSもアプリ向けselectでは未削除試行だけを許可するため、Data Accessのfilter漏れがあっても通常UIへ削除済み試行を出さない。

失敗:

- 対象なし: `NOT_FOUND`
- 権限なし: `FORBIDDEN`
- 既に論理削除済み: `CONFLICT`

### 8.5 Trial最小縦切りの検証済みData Access境界

2026-04-22の非本番PGlite検証では、Trial最小縦切りについて次の境界を実証済みとする。補助証跡は `supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.md` を参照する。

- Data Accessが使う保存経路は `save_trial_with_ingredients(input jsonb)` であり、ownerの新規保存と編集が成功する。
- Data Accessが使う論理削除経路は `soft_delete_trial(trial_id uuid)` であり、ownerの未削除Trialだけを論理削除できる。
- `trials` / `trial_ingredients` の直接 insert / update / delete / upsert は、Data Access層から提供しないだけでなく、DB grant上も `authenticated` で `42501` 拒否される。
- 他ユーザー相当のselectは0件になり、cross-ownerの保存、編集、論理削除RPCは `CHAI_TRIAL_NOT_FOUND` hintで拒否される。
- 論理削除済みTrialはRLSにより通常selectから見えないため、Data Accessの通常一覧、詳細、集計、スター状態取得、複製元候補では返さない。

2026-04-22の `clone_trial` 非本番PGlite検証では、ownerのactive Trial複製、材料行コピー、`parent_trial_id` 保存、direct table write拒否、select-only grant、function grant、cross-owner / missing / archived source の `CHAI_TRIAL_NOT_FOUND` 統一を実証済みとする。補助証跡は `supabase/verification/runs/2026-04-22-clone-trial-verification.md` を参照する。

実Supabase projectへ接続する作業では、同じverification SQLを再実行し、PGlite harnessとの差分がないことを確認する。

## 9. `save_trial_with_ingredients` RPC契約

関数:

```sql
save_trial_with_ingredients(input jsonb)
```

RPC内部エラー識別子は、PostgreSQLのmessage文字列ではなく `hint` の安定値として扱う。Data Accessは次の表で `AppError` へ明示的に変換し、UIへ識別子、SQL、生エラーを表示しない。

| RPC hint                   | AppError分類       | retryable | UI方針                                   |
| -------------------------- | ------------------ | --------: | ---------------------------------------- |
| `CHAI_TRIAL_AUTH_REQUIRED` | `AUTH_REQUIRED`    |      true | ログインを促す                           |
| `CHAI_TRIAL_FORBIDDEN`     | `FORBIDDEN`        |     false | 表示または変更できない旨を表示           |
| `CHAI_TRIAL_NOT_FOUND`     | `NOT_FOUND`        |     false | 対象が見つからないか表示できない旨を表示 |
| `CHAI_TRIAL_VALIDATION`    | `VALIDATION_ERROR` |     false | 入力内容の確認を促す                     |
| `CHAI_TRIAL_CONFLICT`      | `CONFLICT`         |     false | 再読み込みまたは入力修正を促す           |

成功:

- 保存後の試行IDを返す。
- 新規作成時は、本人の未アーカイブ研究ラインに試行を作成する。
- 編集時は、本人の未削除試行を更新する。
- 材料行は全置換される。
- 入力JSONは [詳細設計書](app-lld.md) の `SaveTrialInput` に一致する。
- `input jsonb` はRPCの入力形式であり、任意のカスタム項目を永続化する用途には使わない。

失敗:

- 未認証: `AUTH_REQUIRED`
- 対象の研究ラインが存在しない、アーカイブ済み、または表示不可: `NOT_FOUND` または `CONFLICT`
- 編集対象の試行が存在しない、または表示不可: `NOT_FOUND`
- 他ユーザーの研究ライン、試行、親試行を指定した: `FORBIDDEN`
- 入力不正、未知キー、材料行0件、評価範囲外、文字数超過、親子循環: `VALIDATION_ERROR` または `CONFLICT`
- DB処理失敗: `SERVER_ERROR`

## 10. `clone_trial` RPC契約

関数:

```sql
clone_trial(source_trial_id uuid)
```

入力:

- `source_trial_id`: 複製元の試行ID

成功:

- 新しい試行IDを返す。
- 新しい試行の `parent_trial_id` は複製元IDになる。
- 元試行と同じ未アーカイブ研究ラインに作成される。
- 材料行をコピーする。
- スターはコピーしない。

失敗:

- 未認証: `AUTH_REQUIRED`
- 複製元が存在しない、他ユーザーの試行である、論理削除済みである、または元試行の研究ラインがアーカイブ済み: `NOT_FOUND`
- `source_trial_id` の形式不正: `VALIDATION_ERROR`
- DB処理失敗: `SERVER_ERROR`

cross-owner / archived / missing は存在漏洩を避けるため、RPC hintを `CHAI_TRIAL_NOT_FOUND` に統一する。Data Accessはこれを `NOT_FOUND` に正規化し、UIではRPC失敗時も現在画面を保持して再試行または戻る導線を表示する。

## 11. `soft_delete_trial` RPC契約

関数:

```sql
soft_delete_trial(trial_id uuid)
```

入力:

- `trial_id`: 論理削除する試行ID

成功:

- 対象試行の `deleted_at` を設定する。
- 関連する材料行とスターは物理削除しない。
- UIは履歴または研究ライン詳細へ戻る。

失敗:

- 未認証: `AUTH_REQUIRED`
- 対象が存在しない、または表示不可: `NOT_FOUND`
- 他ユーザーの試行: `FORBIDDEN`
- 既に論理削除済み: `CONFLICT`
- DB処理失敗: `SERVER_ERROR`

## 12. Stars契約

### 12.1 スター付与

入力:

- `trial_id`

成功:

- スター済み状態を返す。

失敗:

- 対象なし: `NOT_FOUND`
- 権限なし: `FORBIDDEN`
- 既にスター済み: 成功扱いにしてよい。

### 12.2 スター解除

成功:

- スターなし状態を返す。

失敗:

- 対象なし: `NOT_FOUND`
- 権限なし: `FORBIDDEN`
- 既に解除済み: 成功扱いにしてよい。

## 13. Drafts契約

下書きはSupabaseへ保存しない。ローカル保存のみとする。

### 13.1 保存

- 同一ブラウザ内に保存する。
- localStorageを使い、`chai-lab:draft:v1:<user_id>` のように認証ユーザーIDで名前空間を分ける。
- 未認証状態や別ユーザーのセッションでは復元しない。
- サーバー保存、バックアップ、複数端末同期を期待させない。
- ローカル端末を共有する場合は下書き内容が端末内に残る可能性があるため、破棄導線を常に提供する。

### 13.2 復元

- 下書きが存在する場合、ユーザーに復元または破棄を選ばせる。
- 自動でサーバー送信しない。
- 復元時には、まだサーバー保存されていない内容であることを明示する。

### 13.3 破棄

- 破棄前に確認する。
- 破棄後は復元できないことを明示する。
- ログアウト時は、未送信下書きを保持するか破棄するかを確認する。

## 14. UI表示文言の方針

エラー表示では内部情報を出さない。

| エラー             | 表示例                                                         |
| ------------------ | -------------------------------------------------------------- |
| `AUTH_REQUIRED`    | ログインが必要です。メール認証を行ってください。               |
| `AUTH_EXPIRED`     | セッションが切れました。もう一度ログインしてください。         |
| `FORBIDDEN`        | 対象のデータを表示または変更できません。                       |
| `NOT_FOUND`        | 対象のデータが見つからないか、表示できません。                 |
| `VALIDATION_ERROR` | 入力内容を確認してください。                                   |
| `CONFLICT`         | データの状態が変わっています。再読み込みして確認してください。 |
| `NETWORK_ERROR`    | 通信に失敗しました。接続を確認して再試行してください。         |
| `SERVER_ERROR`     | 保存に失敗しました。入力内容は保持されています。               |

## 15. ログ方針

v1では外部Analyticsへ個人研究ログを送らない。開発・運用上必要なエラー確認は、Cloudflare PagesとSupabaseの標準ログで行う。

ログに以下を含めない。

- 材料名、メモ、次回の狙いなどの本文
- Magic Link、認証トークン
- `service_role` キー
- 他ユーザーの識別につながる不要な情報

## 16. 実装チェックリスト

Supabase操作を実装する前に以下を確認する。

1. UIから直接Supabaseを呼んでいないか。
2. 戻り値が `AppResult<T>` 相当で正規化されているか。
3. `AppError` が本書の分類に収まっているか。
4. RLSで拒否された場合を `FORBIDDEN` または `NOT_FOUND` として扱えるか。
5. 保存失敗時に入力内容を保持できるか。
6. `service_role` をブラウザへ渡していないか。
7. 試行保存が `save_trial_with_ingredients` に集約されているか。
8. 試行論理削除が `soft_delete_trial` に集約されているか。
9. 履歴一覧が50件単位の取得になっているか。
10. v1対象外の公開、写真、AI、比較、系譜向け処理を追加していないか。
