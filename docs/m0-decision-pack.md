# M0 Decision Pack

**作成日:** 2026-04-19  
**対象:** v1実装前のM0要確認事項  
**位置づけ:** `docs/implementation-plan-v1-revised.md` のM0を完了判定可能にするための意思決定整理

## 1. 文書の目的

この文書は、M0で残っている要確認事項について、既存文書から確定できること、文書だけでは確定できないこと、人間判断が必要なこと、推奨案、未解消時の停止範囲を整理する。

この文書は実装コード、DB migration、RLS policy、RPC、UIを作らない。目的は、M1以降へ進む前に、環境、検証、レビュー、記録のゲートを安全に判断できる状態にすることである。

## 2. M0の対象範囲

M0で扱うのは、次の準備・基盤確認に限定する。

- Supabase環境分離、Auth Redirect、テストデータ方針
- RLS/RPC検証方式と証跡の残し方
- human review gateの運用
- 研究ライン名重複、`brewed_at`、RPCエラー、`clone_trial` UXの仕様判断整理
- Supabaseバックアップ状況と手動エクスポート手順の確認方針
- CI/手動テストコマンド、未実施記録形式
- 作業記録と承認記録の保存先

M0では、Next.jsプロジェクト作成、Supabase migration作成、RLS実装、RPC実装、UI実装、テストコード作成には着手しない。

## 3. 現時点での実装開始制約

現時点では、M1以降の実装へ進むには人間判断または承認が不足している。特に次の項目は、M1へ進む前に「決定済み」または「期限付きで安全に延期」が明記されている必要がある。

- G0-ENV: Supabase環境分離確認
- G0-AUTH: Auth Redirect確認
- G0-RLS-VERIFY: RLS/RPC検証方式確定
- G0-REVIEW: human review gate運用確定
- G0-DOMAIN: ドメイン仕様未確定点の判断または停止範囲承認
- G0-BACKUP: バックアップ/エクスポート方針確認
- G0-TESTOPS: テスト実行/未実施記録方式確定
- G0-LOGGING: 作業記録保存先とログ方針確定

M1へ進む最低条件は、G0-ENV、G0-AUTH、G0-RLS-VERIFY、G0-REVIEW、G0-TESTOPS、G0-LOGGINGが完了し、G0-DOMAINとG0-BACKUPについては判断期限と停止範囲が承認されていることである。G0-DOMAINの各仕様判断が未確定でも、M1の静的アプリ骨格と認証基盤には進める。ただし、その場合でもM2以降の該当タスクは停止する。

## 4. 要確認事項一覧

| ID | 論点 | 文書から確定できる範囲 | 人間判断が必要な範囲 | 未解消時の主な停止範囲 |
|---|---|---|---|---|
| D-01 | Supabase環境分離 / Auth Redirect / テストデータ | ProductionデータをPreviewで使わない、callbackは `/auth/callback/`、service_role禁止 | 実際のSupabase project、Preview URL、テストデータ投入/削除手順 | M1 env/Auth、M2 DB、M7 E2E、M8 deploy |
| D-02 | RLS/RPC検証方式と記録先 | A/B分離、direct CRUD拒否、anon拒否、RPC検証が必須 | SQL/手動/テストコード/CIのどれを採用し、証跡をどこへ残すか | M2 DDL以降 |
| D-03 | human review gate運用 | DB/RLS/security definer/RPCは人間レビュー必須 | 承認者、承認記録、差し戻し運用 | M2以降のDB/RLS/RPC |
| D-04 | 研究ライン名重複の正規化 | 同一ユーザー内の未アーカイブ研究ラインで重複不可、空白のみ不可 | trimのみか、大文字小文字/全角半角も同一視するか | M2-05、M2-12、L1作成/編集 |
| D-05 | `brewed_at` の日時方針 | DBは `timestamptz`、UIは日付、履歴は日付範囲で絞り込み | 表示タイムゾーン、保存時刻、検索境界 | M3 T1、M5 T3 |
| D-06 | RPC別エラー識別子とAppError分類 | AppError分類とRPC別の失敗分類は定義済み | SQLSTATE/識別子、Data Accessでのマッピング詳細 | M3/M4 RPC、UI接続 |
| D-07 | `clone_trial` 即DB作成後の放置試行 | `clone_trial` はDBに新規試行を作成し、新IDを返す | 放置された複製試行を許容するか、削除導線で扱うか | M4 clone UI |
| D-08 | バックアップ/手動エクスポート | ユーザー向けexport UIは非対象、運用側確認は必要 | Supabase plan、手動export手順、確認者 | M8 deploy |
| D-09 | CI/手動テストと未実施記録 | npm、Vitest、RTL、Playwright、RLSテストを使う | 具体コマンド名、CI対象、未実施テンプレート | M7完了、PR完了報告 |
| D-10 | 作業記録保存先 | 実行結果、未実施、レビュー承認を記録する必要がある | PR本文、専用docs、両方のどれを正とするか | M2以降のレビュー必須タスク |

## 5. 論点別詳細整理

### 5.1 D-01 Supabase環境分離 / Auth Redirect / テストデータ方針

- 関連文書: `deployment-contract.md`, `app-rdd.md`, `app-lld.md`, `supabase-data-access-error-contract.md`, `implementation-plan-v1-revised.md`

**文書から確定できること**

- v1はSupabase Auth + PostgreSQL + RLSを使う。
- フロントエンドで使える環境変数は `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_ORIGIN` に限定する。
- `SUPABASE_SERVICE_ROLE_KEY`、DB接続文字列、外部AIキー、Storage/R2キーはブラウザに置かない。
- Auth Redirectはlocal、preview、productionそれぞれで `/auth/callback/` を使う。
- Preview環境ではProductionデータを使わない。
- Magic Link E2Eではメール配送を必須にせず、テスト用セッション注入、Supabase localのテストユーザー、テスト専用認証ヘルパーのいずれかを使える。

**文書だけでは確定できないこと**

- localでSupabase localを使うか、専用の開発Supabase projectを使うか。
- Preview用Supabase projectを作れるか。
- ProductionのSupabase project URLとAuth Redirect URL。
- テストデータの命名規則、削除手順、誤投入防止手順。
- Preview URLが固定か、PRごとに変わるか。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | localはSupabase localまたは開発project、previewはProductionとは別project、productionは本番projectに分離する。テストデータはsyntheticのみ、`e2e_` などの接頭辞と専用ユーザーで管理する | Productionデータ誤操作を避けやすい。RLS検証を安全に繰り返せる | Preview projectの用意が必要 |
| B | local/previewで同一の非本番Supabase projectを使う | project数を抑えられる | Previewの検証データが混ざる。並行作業で不安定になりやすい |
| C 禁止 | PreviewでProduction Supabaseを使う | 準備は少ない | 本番データ漏えい・破壊の事故に直結する |

**v1推奨案**

選択肢Aを推奨する。Preview専用projectがすぐ用意できない場合でも、Production projectをPreview検証に使うことは不可とし、Preview UI検証は非本番projectまたはlocalで代替する。

**決める人**

project ownerがSupabase projectとURLを決め、human reviewerが環境分離と秘密情報の扱いを確認する。

**期限**

M1のSupabase client/env設定前。遅くともM0完了判定前。

**未解消時の停止範囲**

M1のAuth実装、M2以降のDB/RLS変更、M7 E2E、M8 deployを停止する。

**決定後に更新すべき箇所**

`docs/m0-readiness-gate.md` のG0-ENV/G0-AUTH、実装PRの作業記録、必要なら `docs/deployment-contract.md` の環境別補足。

### 5.2 D-02 RLS/RPC検証方式と記録先

- 関連文書: `db-migration-rls-policy.md`, `codex-execution-rules.md`, `implementation-plan-v1-revised.md`

**文書から確定できること**

- 全業務テーブルでRLSを有効化する。
- ユーザーA/B分離、anon拒否、direct CRUD拒否、RPCの成功/失敗を確認する。
- `trials` と `trial_ingredients` の直接 insert/update/delete/upsert はアプリから成立してはならない。
- `clone_trial` はスターをコピーしない。
- `soft_delete_trial` は物理削除しない。
- 未実施検証は未実施として明示し、RLS/RPC/security definerの未実施は原則として次へ進む理由にならない。

**文書だけでは確定できないこと**

- 検証をSQLだけで行うか、テストコード化するか。
- 初期段階からCIに入れるか、M2では手動SQL + 証跡で進めるか。
- 証跡の保存先。
- A/Bユーザーの作成方法。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | M2ではSQLまたはSupabase localの再実行可能な検証手順を作り、結果を作業記録に貼る。後続で可能ならテストコード化する | 早期にRLS事故を止められる。初期実装負荷が過剰になりにくい | 手動要素が残るため記録品質に依存する |
| B | M2からすべて自動テスト化しCIに入れる | 再現性が高い | docs-onlyからの初期負荷が高く、環境準備で詰まりやすい |
| C | M7でまとめて検証する | 初期実装は速い | 監査で否定された進め方。RLS事故を後で発見する |

**v1推奨案**

選択肢Aを推奨する。M2-10では少なくとも、4テーブルのRLS有効化、policy、grant/revoke、A/B分離、anon拒否、direct CRUD拒否、RPCごとの重要仕様を、チェックリストと実行結果で記録する。M7で再実行する。

**決める人**

human reviewerが検証方式と証跡形式を承認する。project ownerは非本番環境の用意を判断する。

**期限**

M0完了前。未決ならM2 DDLへ進めない。

**未解消時の停止範囲**

M2-00以降のDB作業、M3/M4 RPC、M7 RLS再実行を停止する。

**決定後に更新すべき箇所**

`docs/m0-readiness-gate.md` のG0-RLS-VERIFY、`docs/implementation-plan-v1-revised.md` のM2-10証跡欄、作業記録テンプレート。

### 5.3 D-03 human review gate運用

- 関連文書: `db-migration-rls-policy.md`, `codex-execution-rules.md`, `implementation-plan-v1-revised.md`

**文書から確定できること**

- 新しい業務テーブル、RLS policy、`security definer`、所有者関係、削除/アーカイブ/論理削除、公開/共有/写真/比較/系譜/AI関連DB変更は人間レビューなしにマージしてはならない。
- 改訂計画ではmigration、RLS、grant/revoke、helper、RPC、認可境界Data Access、静的構成/環境変数/Auth Redirectをレビュー必須にしている。

**文書だけでは確定できないこと**

- human reviewerの実際の担当者または役割名。
- 承認記録をPR本文だけに残すか、docsにも残すか。
- 差し戻し時にどこまでやり直すか。

**レビュー対象別の運用案**

| 対象 | 事前資料 | 承認者 | 差し戻し時の扱い |
|---|---|---|---|
| migration | 目的、影響オブジェクト、1論理変更の説明、rollback/修正方針 | human reviewer | 後続RLS/policy/RPC/UIを停止 |
| RLS policy | policy matrix、`USING`/`WITH CHECK`、A/B分離観点 | human reviewer | M2-10再検証まで停止 |
| grant/revoke | role別許可表、PUBLIC revoke、anon拒否、authenticated許可範囲 | human reviewer | 権限検証を再実行 |
| security definer | search_path、auth.uid、所有者確認、PUBLIC revoke、grant | human reviewer | 関数依存タスクを停止 |
| RPC仕様変更 | 入力、認可、戻り値、失敗時挙動、AppError分類、影響テーブル | human reviewer | RPC migrationとUI接続を停止 |
| 認可境界Data Access | 呼び出し経路、direct CRUD検索結果、AppResult分類 | human reviewer | 該当UI接続とE2Eを停止 |

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | PR本文を正式承認記録とし、ローカル/AI作業では補助的に `docs/implementation-worklog.md` のような作業記録を使う | 通常開発と相性がよく、履歴が追いやすい | PR前の作業記録先を別途決める必要がある |
| B | docs内の専用ログを正式記録にする | PRがなくても追える | 文書更新が増え、実装差分と混ざりやすい |
| C 禁止 | チャット上の承認だけで進める | 手軽 | 後続エージェントが確認できず、監査証跡にならない |

**v1推奨案**

選択肢Aを推奨する。PR本文を正式な承認記録とし、PRがない段階では作業記録ファイルまたはM0文書に「未承認」と明示する。チャットだけの承認は正式証跡にしない。

**決める人**

project ownerが承認記録の正本を決め、human reviewerがレビュー通過条件を承認する。

**期限**

M0完了前。未決ならM2以降へ進めない。

**未解消時の停止範囲**

M2以降のDB/RLS/RPC、認可境界Data Access、M8 deploy。

**決定後に更新すべき箇所**

`docs/m0-readiness-gate.md` のG0-REVIEW/G0-LOGGING、`docs/implementation-plan-v1-revised.md` の6章、作業記録テンプレート。

### 5.4 D-04 研究ライン名重複の正規化範囲

- 関連文書: `app-lld.md`, `screen-acceptance-criteria.md`, `supabase-data-access-error-contract.md`

**文書から確定できること**

- 研究ライン名は必須で、前後空白だけの値は禁止する。
- 同一ユーザー内の未アーカイブ研究ラインで重複する研究ライン名は許可しない。
- アーカイブ済み研究ラインは通常一覧と新規試行選択から除外する。
- DB案には `char_length(btrim(title)) BETWEEN 1 AND 80` と active title unique index がある。

**文書だけでは確定できないこと**

- 保存時にtrim済み文字列を保存するか。
- 重複判定で大文字小文字を同一視するか。
- 全角半角、Unicode正規化、連続空白を同一視するか。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | 前後空白をtrimして保存し、trim後の完全一致だけを重複扱いにする | v1として単純。UI/Zod/DBでそろえやすい | `Morning` と `morning` は別扱いになる |
| B | trim + 大文字小文字を同一視する | 英字名の重複を減らせる | DB index、UI表示、エラー文言が少し複雑になる |
| C | 全角半角、Unicode、連続空白まで正規化する | 重複は最も減る | v1には重く、想定外の同一視が起きる |

**v1推奨案**

選択肢Aを推奨する。理由は、v1では入力負荷と実装安全性を優先し、過度な正規化を避けるためである。ただし、推奨案を採用する場合は、UI、Zod、DB制約、CONFLICT表示で「前後空白を除いた同名は不可」と表現をそろえる必要がある。

**決める人**

project ownerがユーザー体験として判断し、human reviewerがDB/UI/エラーの整合を確認する。

**期限**

M2-05 index/constraint、M2-12 Research Line Data Access着手前。

**未解消時の停止範囲**

M2-05、M2-12、M2-13、L1作成/編集。

**決定後に更新すべき箇所**

`docs/app-lld.md` の制約/インデックス、`docs/supabase-data-access-error-contract.md` のResearch Lines契約、`docs/screen-acceptance-criteria.md` のL1作成・編集。

### 5.5 D-05 `brewed_at` のタイムゾーン、表示、検索境界

- 関連文書: `app-lld.md`, `screen-acceptance-criteria.md`, `supabase-data-access-error-contract.md`, `app-rdd.md`

**文書から確定できること**

- DBでは `brewed_at timestamptz NOT NULL DEFAULT now()` を使う。
- T1の必須項目は「日付」である。
- T3は日付範囲で絞り込む。
- 試行一覧の並び順は `brewed_at DESC, created_at DESC` を基本とする。

**文書だけでは確定できないこと**

- UIの「日付」をJST固定で扱うか、ブラウザのlocal timezoneで扱うか。
- date-only入力をDBに保存する時刻を何時にするか。
- 日付範囲検索の境界をどのtimezoneで作るか。
- ユーザーがtimezoneをまたいだ場合にどう表示するか。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | v1では日本語UI前提としてJSTのカレンダー日で扱う。date-only入力はJSTの同日内の固定時刻で保存し、検索はJSTの開始以上・翌日開始未満で行う | 表示と検索が安定し、v1の想定利用に合いやすい | 海外timezone利用時の期待とずれる可能性がある |
| B | ブラウザlocal timezoneで入力/表示/検索境界を作る | ユーザー環境に自然 | timezone変更時やE2Eでずれやすい |
| C | UTC日付として扱う | 実装は単純 | 日本語UIの「日付」と表示がずれやすい |

**v1推奨案**

選択肢Aを推奨する。ただし、文書上はJST固定が明記されていないため、人間判断が必要である。採用する場合、T1、T3、Data Access、テストでJST境界を明示する。

**決める人**

project ownerが利用想定を判断し、human reviewerがDB検索境界とテスト観点を確認する。

**期限**

M3 T1日付入力前、M5 T3日付範囲実装前。

**未解消時の停止範囲**

M3-05、M5-01、M5-02、日付範囲関連E2E。

**決定後に更新すべき箇所**

`docs/app-lld.md` の `brewed_at` 方針、`docs/supabase-data-access-error-contract.md` のTrials一覧/作成契約、`docs/screen-acceptance-criteria.md` のT1/T3。

### 5.6 D-06 RPC別エラー識別子とAppError分類

- 関連文書: `supabase-data-access-error-contract.md`, `app-lld.md`, `db-migration-rls-policy.md`

**文書から確定できること**

- UIが扱うAppError codeは定義済みである。
- RPC別に、未認証、Not Found、Forbidden、Conflict、Validation、Server Errorの分類がある。
- Supabase生エラー、SQL、内部IDをUIに出してはならない。

**文書だけでは確定できないこと**

- PostgreSQL側でどのSQLSTATEまたは識別子を返すか。
- Data Accessがどの情報を見てAppErrorへ分類するか。
- どのエラーを `FORBIDDEN` とし、どのエラーを `NOT_FOUND` に寄せるか。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | RPCは安定した内部エラー識別子を返し、Data AccessでAppErrorへ明示マッピングする。UIにはユーザー向けmessageだけ返す | 分類が安定し、テストしやすい | RPC設計レビューで識別子一覧を作る必要がある |
| B | PostgreSQLのSQLSTATEだけで分類する | 標準的 | 業務エラーの粒度が不足する可能性がある |
| C | Supabase/PostgRESTのmessage文字列で分類する | 初期実装は簡単 | message変更に弱く、生エラー漏えいの誘惑が強い |

**v1推奨案**

選択肢Aを推奨する。RPC設計レビューで、`save_trial_with_ingredients`、`clone_trial`、`soft_delete_trial` それぞれの失敗条件とAppError分類表を作る。UIは識別子やSQLを表示しない。

**決める人**

human reviewerがエラー分類を承認する。

**期限**

各RPC設計レビュー前。`save_trial_with_ingredients` はM3-01前、`clone_trial` と `soft_delete_trial` はM4-01/M4-02前。

**未解消時の停止範囲**

M3/M4 RPC migration、Trial Data Access、T1/T2 UI接続。

**決定後に更新すべき箇所**

`docs/supabase-data-access-error-contract.md` のRPC契約、`docs/implementation-plan-v1-revised.md` のM3/M4タスク補足。

### 5.7 D-07 `clone_trial` 即DB作成後の編集/放置試行

- 関連文書: `app-lld.md`, `app-rdd.md`, `screen-acceptance-criteria.md`, `supabase-data-access-error-contract.md`

**文書から確定できること**

- `clone_trial` は新しい試行IDを返すRPCである。
- 複製時は材料行をコピーし、スターはコピーしない。
- `created_at`、`updated_at` は新規作成時刻である。
- 元試行が他ユーザー、論理削除済み、アーカイブ済み研究ラインの場合は失敗する。

**文書だけでは確定できないこと**

- 複製直後に編集画面へ遷移するのか、詳細画面へ遷移するのか。
- ユーザーが編集せず閉じた複製試行を「有効な試行」として残すか。
- 放置複製を削除するための導線をどう案内するか。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | 現行設計どおり、cloneは即DB作成する。作成後は編集画面または詳細画面へ遷移し、不要なら通常の論理削除で扱う。自動 cleanup はしない | RPC契約に一致し、余計な状態管理がない | 編集せず閉じた複製が残る |
| B | clone後に一時的な編集状態を作り、保存時に確定する | 放置複製を減らせる | `clone_trial` 即DB作成契約と衝突し、RPC責務が変わる |
| C | 一定時間未編集なら自動削除する | 不要データは減る | 自動削除はv1に重く、ユーザーの記録を消す危険がある |

**v1推奨案**

選択肢Aを推奨する。放置複製リスクは、複製後の画面で「複製済みである」ことを明確にし、不要なら論理削除できる導線で扱う。自動削除や未保存cloneはv1では導入しない。

**決める人**

project ownerがUXとして許容するか判断し、human reviewerがRPC契約との整合を確認する。

**期限**

M4 clone UI前。

**未解消時の停止範囲**

M4-01のUI接続部分、M4-04、clone関連E2E。

**決定後に更新すべき箇所**

`docs/screen-acceptance-criteria.md` のT1/T2複製導線、`docs/supabase-data-access-error-contract.md` のclone UI挙動補足。

### 5.8 D-08 Supabaseバックアップ状況と手動エクスポート手順

- 関連文書: `app-rdd.md`, `db-migration-rls-policy.md`, `deployment-contract.md`

**文書から確定できること**

- ユーザー向け自動バックアップ機能とデータエクスポートUIはv1非対象である。
- 開発・運用側はSupabaseのバックアップ状況と手動エクスポート手順を確認する必要がある。
- S1にデータエクスポート導線を置かない。

**文書だけでは確定できないこと**

- 実際のSupabase planで利用できるバックアップ機能。
- 手動エクスポートの担当者、頻度、手順。
- 本番前に非本番でdry-runするか。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | 本番前にSupabase planのbackup可否と、SQL dumpまたはDashboard等による手動export手順を作業記録に残す。UIは作らない | v1範囲を広げず、復旧確認だけ満たせる | 実際の復旧訓練までは含まない |
| B | v1でユーザー向けexport UIも作る | ユーザー安心感は増える | v1範囲外で、受け入れ基準も不足 |
| C | バックアップ確認をv2へ送る | 初期負荷は下がる | DB事故時の復旧手順がない |

**v1推奨案**

選択肢Aを推奨する。M8完了前に必須確認とし、M0では担当者、確認期限、証跡形式を決める。

**決める人**

project ownerがSupabase planと運用担当を決める。

**期限**

M8完了前。本番デプロイ前には必須。M0では確認方針と担当を決める。

**未解消時の停止範囲**

M8-03、M8-04、本番デプロイ。

**決定後に更新すべき箇所**

`docs/m0-readiness-gate.md` のG0-BACKUP、M8作業記録。必要なら `docs/deployment-contract.md` の運用補足。

### 5.9 D-09 CI/手動テストコマンドと未実施記録形式

- 関連文書: `tech-stack.md`, `app-lld.md`, `codex-execution-rules.md`, `screen-acceptance-criteria.md`

**文書から確定できること**

- npmを使う。
- TypeScript strict、ESLint、Prettier、Vitest、React Testing Library、Playwright、RLSテストを使う。
- Playwrightは390x844と1280x800を最低限確認する。
- 未実施検証は最終報告で明示する。

**文書だけでは確定できないこと**

- 実際の `package.json` scripts名。
- CIで必須にする範囲。
- RLS/RPC検証をCIへ入れる時期。
- 未実施記録をPR本文に書くか、作業記録ファイルに書くか。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | 最初の実装PRで `lint`、`typecheck`、`test`、`test:e2e`、`build` 相当をnpm scriptsとして固定し、DB/RLSはM2で検証方式を別途記録する | 標準的で分かりやすい | DBテストの自動化は後続判断が必要 |
| B | 初期からDB/RLSもCI必須にする | 安全性が高い | Supabase local/CI準備の負荷が高い |
| C | コマンド名を実装者任せにする | 初期は楽 | 完了判定が揺れる |

**v1推奨案**

選択肢Aを推奨する。未実施記録は次の形式を必須にする。

| 項目 | 記載内容 |
|---|---|
| 未実施項目 | 例: Playwright preview環境確認 |
| 理由 | 例: Preview URL未発行 |
| 代替確認 | 例: local buildとlocal E2Eを実施 |
| 残リスク | 例: Preview Auth Redirectは未確認 |
| 次の確認者/期限 | 例: project ownerがM8で確認 |

**決める人**

human reviewerがテスト運用を承認する。package scripts名はM1の最初の実装PRで確定する。

**期限**

M0完了前に方針を決める。実際のscriptsはM1のプロジェクト作成時に固定する。

**未解消時の停止範囲**

M7完了、PR完了報告、M8 deploy。

**決定後に更新すべき箇所**

`docs/m0-readiness-gate.md` のG0-TESTOPS、`docs/implementation-plan-v1-revised.md` のM0-02/M7。

### 5.10 D-10 作業記録保存先

- 関連文書: `codex-execution-rules.md`, `implementation-plan-v1-revised.md`, `implementation-plan-v1-remediation-map.md`

**文書から確定できること**

- 実行したテスト、実行できなかった確認、残るリスク、次の具体作業を報告する必要がある。
- human reviewや未実施検証は散逸させてはならない。
- M2以降のレビュー必須タスクは、承認記録がないと進めない。

**文書だけでは確定できないこと**

- 記録の正本をPR本文にするか、docs内の作業記録ファイルにするか。
- PRがない作業中の一時記録をどこに残すか。
- 承認者の名前または役割をどう書くか。

**選択肢**

| 選択肢 | 内容 | メリット | リスク |
|---|---|---|---|
| A 推奨 | 正本はPR本文。PR前またはAI単独作業では `docs/implementation-worklog.md` のような軽量作業記録を使う | GitHub運用と文書運用を両立できる | worklog作成の承認が必要 |
| B | docs内の作業記録だけを正本にする | リポジトリ内で完結する | PRレビューとの対応が追いにくい |
| C | チャット報告だけにする | 手軽 | 後続エージェントが参照できない |

**v1推奨案**

選択肢Aを推奨する。M0では「どちらを正本にするか」を人間が決める。チャットだけを正式証跡にするのは不可。

**決める人**

project ownerが保存先を決め、human reviewerがレビュー証跡として十分か確認する。

**期限**

M0完了前。

**未解消時の停止範囲**

M2以降のレビュー必須タスク、M7/M8の未実施記録。

**決定後に更新すべき箇所**

`docs/m0-readiness-gate.md` のG0-LOGGING、`docs/implementation-plan-v1-revised.md` のM0-01/M0-05、必要なら作業記録テンプレート。

## 6. 推奨案一覧

| ID | 推奨案 |
|---|---|
| D-01 | local/preview/productionを分離し、PreviewでProductionデータを使わない。テストデータはsynthetic専用ユーザーで管理する。 |
| D-02 | M2では再実行可能なSQL/手順 + 証跡でRLS/RPCを検証し、M7で再実行する。 |
| D-03 | PR本文を正式承認記録とし、PR前作業は軽量worklogで補完する。 |
| D-04 | 研究ライン名はtrimして保存し、trim後完全一致だけを重複扱いにする。 |
| D-05 | v1ではJSTカレンダー日として扱う案を推奨するが、人間判断が必要。 |
| D-06 | RPCは安定した内部エラー識別子を返し、Data AccessでAppErrorへ明示マッピングする。 |
| D-07 | `clone_trial` は即DB作成のままとし、不要な複製は通常の論理削除で扱う。 |
| D-08 | ユーザー向けexport UIは作らず、運用側のbackup/export確認だけをM8までに実施する。 |
| D-09 | npm scriptsをM1で固定し、未実施記録テンプレートをPR/作業記録で必須にする。 |
| D-10 | 正本はPR本文、PR前作業はdocs内の軽量worklogで補完する。 |

## 7. 人間判断が必要な項目

| ID | 判断者 | 判断内容 | 期限 |
|---|---|---|---|
| D-01 | project owner / human reviewer | Supabase project分離、Redirect URL、テストデータ方針 | M0完了前 |
| D-02 | human reviewer | RLS/RPC検証方式、証跡形式 | M0完了前 |
| D-03 | project owner / human reviewer | レビュー承認者、承認記録保存先、差し戻し運用 | M0完了前 |
| D-04 | project owner | 研究ライン名重複の正規化範囲 | M2-05前 |
| D-05 | project owner / human reviewer | `brewed_at` のtimezone/検索境界 | M3-05前 |
| D-06 | human reviewer | RPC別エラー識別子とAppError分類 | 各RPC設計レビュー前 |
| D-07 | project owner | clone後の放置複製試行の扱い | M4 clone UI前 |
| D-08 | project owner | Supabase backup/export確認担当と手順 | M8前 |
| D-09 | human reviewer | テストコマンド、CI/手動境界、未実施記録形式 | M0完了前 |
| D-10 | project owner | 作業記録/承認記録の保存先 | M0完了前 |

## 8. 未解消時の停止条件

| 未解消項目 | 停止する範囲 |
|---|---|
| D-01 | M1のSupabase Auth/env、M2 DB、M7 E2E、M8 deploy |
| D-02 | M2-00以降のDB/RLS、M3/M4 RPC |
| D-03 | M2以降のDB/RLS/RPC/security definer、認可境界Data Access |
| D-04 | M2-05、M2-12、M2-13 |
| D-05 | M3-05、M5-01、M5-02 |
| D-06 | M3-01以降のsave RPC、M4-01/M4-02、関連UI接続 |
| D-07 | M4-01のUI接続、M4-04、clone E2E |
| D-08 | M8-03、M8-04、本番deploy |
| D-09 | M7完了、M8 deploy、PR完了報告 |
| D-10 | M2以降のレビュー必須タスク、M7/M8の証跡確認 |

## 9. 計画書更新が必要な箇所

M0の人間判断が完了したら、少なくとも次を更新または追記する。

| 判断 | 更新先 |
|---|---|
| Supabase環境/Redirect | `docs/m0-readiness-gate.md` のG0-ENV/G0-AUTH。必要なら `docs/deployment-contract.md` |
| RLS/RPC検証方式 | `docs/m0-readiness-gate.md` のG0-RLS-VERIFY、`docs/implementation-plan-v1-revised.md` M2-10 |
| human review運用 | `docs/m0-readiness-gate.md` のG0-REVIEW、作業記録テンプレート |
| 研究ライン名正規化 | `docs/app-lld.md`, `docs/supabase-data-access-error-contract.md`, `docs/screen-acceptance-criteria.md` |
| `brewed_at` 方針 | `docs/app-lld.md`, `docs/supabase-data-access-error-contract.md`, `docs/screen-acceptance-criteria.md` |
| RPCエラー識別子 | `docs/supabase-data-access-error-contract.md`, 各RPC設計記録 |
| clone UX | `docs/screen-acceptance-criteria.md`, `docs/supabase-data-access-error-contract.md` |
| backup/export | M8作業記録。必要なら `docs/deployment-contract.md` |
| テスト運用 | `docs/implementation-plan-v1-revised.md` M0/M7、実装PRのscripts説明 |
| 作業記録保存先 | `docs/m0-readiness-gate.md` G0-LOGGING、実装PRテンプレートまたはworklog |
