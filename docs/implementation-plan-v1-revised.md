# チャイ研究アプリ v1 実装計画書 改訂版

**作成日:** 2026-04-19  
**位置づけ:** `docs/implementation-plan-v1-audit.md` の監査結果を反映した改訂版  
**対象:** `docs/implementation-plan-v1.md` の安全性、具体性、検証可能性、責務分離、スコープ厳守の改善

## 1. 改訂版の目的と前提

この文書は、監査で「主要修正完了まで実装開始不可」と判定された `docs/implementation-plan-v1.md` を、安全側に改訂するための実装計画書である。改訂前計画は、v1スコープ意識はある一方で、DB/RLS/RPCの検証ゲート不足、巨大タスク、human review gate不足、AppResult/AppErrorの曖昧さ、受け入れ基準との対応不足があり、そのまま実装を始めてよい状態ではなかった。

改訂の目的は、次の5点を計画レベルで閉じることである。

- 4業務テーブル `research_lines`、`trials`、`trial_ingredients`、`trial_stars` のRLS、権限、想定外直接CRUD拒否、ユーザーA/B分離をM2内の完了条件にする。
- DB、RLS、grant/revoke、`security definer`、RPC、認可境界に関わるData Access変更にhuman review gateを追加する。
- 改訂前のM2-01相当の巨大タスクを、DDL、index、helper、RLS有効化、policy、grant/revoke、検証、レビューに分割する。
- UI実装順をData Access/RPC/受け入れ基準に明確に紐づけ、仮UIや直接CRUDへ逃げる余地をなくす。
- 不明点を要確認事項として独立管理し、未解消なら止める作業を明記する。

この文書は実装コード、SQL、コンポーネント、テストコードを作らない。v1の価値は、公開レシピサービスではなく、非公開の個人研究ログとして試行ログを安全に記録、複製、読み返せることである。

## 2. 参照文書と判断優先順位

### 2.1 参照文書

- `docs/mvp-scope-contract.md`
- `docs/pj-policy.md`
- `docs/app-rdd.md`
- `docs/app-lld.md`
- `docs/app-design.md`
- `docs/screen-acceptance-criteria.md`
- `docs/tech-stack.md`
- `docs/db-migration-rls-policy.md`
- `docs/supabase-data-access-error-contract.md`
- `docs/deployment-contract.md`
- `docs/codex-execution-rules.md`
- `README.md`
- `docs/implementation-plan-v1.md`
- `docs/implementation-plan-v1-audit.md`

### 2.2 優先順位

1. v1スコープ判断は `docs/mvp-scope-contract.md` を最優先する。
2. DB/RLS/RPC、migration、human reviewの判断は `docs/db-migration-rls-policy.md` と `docs/app-lld.md` を優先する。
3. Supabase操作、Data Access境界、AppResult/AppErrorは `docs/supabase-data-access-error-contract.md` を優先する。
4. UI、状態表示、アクセシビリティ、画面別完了判定は `docs/app-design.md` と `docs/screen-acceptance-criteria.md` を優先する。
5. 静的配信、ルーティング、環境変数、Cloudflare Pagesは `docs/deployment-contract.md` を優先する。
6. 技術選定、ライブラリ追加禁止、テスト方針は `docs/tech-stack.md` と `docs/codex-execution-rules.md` を優先する。
7. READMEはリポジトリ全体の入口として扱う。READMEの文書一覧の表示順は、MVP Scope Contractの優先度を下げるものではない。

DB/RLS/RPCに関する変更は、スコープ内であってもhuman reviewと検証が完了するまで完了扱いにしない。

## 3. v1スコープ境界

### 3.1 実装対象

- Magic Link認証、`/auth/callback/`、未認証ガード、ログアウト
- 研究ラインの作成、編集、アーカイブ、一覧、詳細
- 試行の作成、編集、詳細、履歴、絞り込み、親試行リンク
- 材料行の入力、並び、保存
- `save_trial_with_ingredients` による試行本体と材料行の一括保存
- `clone_trial` による試行複製
- `soft_delete_trial` による論理削除
- スター付与、解除、スター絞り込み
- 軽量ローカル下書き
- RLSによるユーザー単位の隔離
- A1、H1、L1、L2、T1、T2、T3、S1の画面
- Vitest、React Testing Library、Playwright、DB/RLS/RPC検証

### 3.2 実装しないもの

- 公開、限定公開、共有URL
- SNS、フォロー、コメント、リアクション
- 写真アップロード、Storage、Cloudflare R2
- 外部AI API、AI提案
- 比較画面、任意比較、複数件比較、グラフ、ランキング
- 系譜グラフ、React Flow、D3.js
- カスタム項目、評価テンプレート、材料プリセット、スパイスブレンド
- お気に入り棚、定番昇格
- オフライン自動同期、Dexie.js、Workbox
- Next.js API Routes、Server Actions、SSR、Cloudflare Pages Functions、Workers
- Supabase Realtime、GraphQL
- 新ライブラリの独断追加
- `service_role`、DB接続文字列、外部AIキー、Storage/R2キー、GitHubトークンをブラウザへ置くこと
- `trials` と `trial_ingredients` をUIまたはData Accessから直接 insert/update/delete/upsert すること
- 将来機能の無効ボタン、準備中表示、先回りカラム、先回りテーブル

### 3.3 運用確認と機能実装の切り分け

ユーザー向けデータエクスポートUIはv1非対象である。一方で、Supabaseバックアップ状況、手動エクスポート手順、PreviewとProductionの分離はv1実装前またはデプロイ前の運用確認対象である。これらを「将来機能」と誤解して省略しない。

外部Analyticsはv1では導入しない。ログには材料名、メモ、試行本文、Magic Link、認証トークン、Supabase生エラー、SQL、内部IDの不要な露出を含めない。

## 4. 要確認事項と停止条件

| ID | 未確定事項 | 危険性 | 判断者 | 解消期限 | 未解消なら止める作業 |
|---|---|---|---|---|---|
| Q-01 | Supabase local/preview/productionの分離、Auth Redirect URL、テストデータ方針 | PreviewでProductionデータを触る、RLS検証が不安定になる | project owner / human reviewer | M0完了前 | M2以降のDB変更、M7 E2E、M8 deploy |
| Q-02 | RLS/RPC検証の実行方式と記録先 | RLS未検証のままUI/RPCへ進む | human reviewer | M0完了前 | M2のDDL以降 |
| Q-03 | DB/RLS/RPC human reviewの運用単位、承認記録の保存先 | `security definer` やpolicyが未レビューで入る | project owner / human reviewer | M0完了前 | M2以降のDB/RLS/RPC変更 |
| Q-04 | 研究ライン名重複の正規化範囲 | UI/Zod/DB unique/エラー分類が食い違う | project owner | M2の研究ラインDA前 | M2の研究ライン作成/編集UI、unique制約確定 |
| Q-05 | `brewed_at` の入力、保存、表示、日付範囲検索のタイムゾーン方針 | 日本時間の画面表示とDB検索境界がずれる | project owner / human reviewer | M3の試行フォーム前 | M3 T1、M5 T3日付絞り込み |
| Q-06 | RPC別SQLSTATEまたはエラー識別子とAppError分類 | 権限/入力/競合/Not FoundがUIで誤表示される | human reviewer | 各RPC設計レビュー前 | M3/M4のRPC migrationとUI接続 |
| Q-07 | `clone_trial` 即DB作成後の編集導線と放置複製試行の扱い | 複製して閉じるだけで不要試行が残る | project owner | M4 clone UI前 | M4 clone UI、E2E完了判定 |
| Q-08 | Supabaseバックアップ状況と手動エクスポート手順 | DB事故時の復旧確認がない | project owner | M8完了前。DB本実装前に方針確認 | 本番デプロイ、M8完了 |
| Q-09 | CI/手動テストのコマンド名と未実施記録形式 | テスト完了判定が人依存になる | human reviewer | M0完了前 | M7完了、PR完了報告 |
| Q-10 | 作業記録の保存先 | human reviewや未実施検証が散逸する | project owner | M0完了前 | M2以降のレビュー必須タスク |

Q-01からQ-03、Q-09、Q-10が未解消の場合、アプリ機能実装には進まない。M0の調査と計画補正だけを許可する。

## 5. 依存関係とゲート

### 5.1 M2完了前に着手してよい作業

- M0の環境、レビュー、テスト、作業記録の確定
- M1のNext.js静的アプリ骨格、Magic Link認証、`/auth/callback/`、未認証ガード
- デザイントークンのTailwind反映、共通UIの最小部品。ただし業務データを読み書きしない範囲に限る。
- `AppResult` / `AppError` の型とData Access境界の定義
- テスト基盤の空実行、Playwrightの認証後状態作成方針の検討

### 5.2 M2完了前に着手してはいけない作業

- T1/T2/T3/L2の業務データ接続
- `save_trial_with_ingredients`、`clone_trial`、`soft_delete_trial` のmigration
- `trials`、`trial_ingredients` への直接書き込みを伴う仮実装
- 研究ライン以外の業務一覧、詳細、保存UIの完成扱い
- RLS未検証テーブルを前提とするE2E

### 5.3 次マイルストーンへ進む共通条件

各マイルストーンは、完了条件に加えて次を満たすまで次へ進めない。

- 該当範囲がv1スコープ内である。
- 参照文書と受け入れ基準の該当箇所を確認済みである。
- DB/RLS/RPCに触れた場合、対象migration、policy、grant/revoke、`security definer`、検証結果、human review記録がそろっている。
- UIに触れた場合、画面別のローディング、空状態、エラー、認証切れ、モバイル390x844、デスクトップ1280x800の確認観点がある。
- 実行できないテストは、未実施理由、代替確認、残リスクを作業記録に明記している。

## 6. Human Review Gate

### 6.1 必須ゲート対象

次の変更は、human review完了まで完了扱いにしない。

- migration追加/変更
- RLS有効化、policy追加/変更
- grant/revoke変更
- helper関数追加/変更
- `security definer` 関数追加/変更
- RPC仕様追加/変更
- `trials`、`trial_ingredients`、`trial_stars`、`research_lines` の認可境界に関わるData Access変更
- 静的構成、Auth Redirect、環境変数、Supabase環境分離に関わる変更

### 6.2 レビュー内容

human reviewerは次を確認する。

- 変更がv1スコープ内で、公開、共有、写真、AI、比較、系譜、カスタム項目、同期を含まない。
- migrationが1論理変更に分かれている。
- 対象テーブル、policy、helper、RPC、grant/revoke、indexの影響範囲が説明されている。
- RLSの `USING` と `WITH CHECK` の意図が明確である。
- `security definer` は `auth.uid()` と所有者確認を行い、`search_path` を固定し、PUBLIC実行権限を取り消し、必要なロールだけにgrantしている。
- `trials` と `trial_ingredients` の試行保存、編集、論理削除は定義済みRPC以外から成立しない。
- ユーザーA/B分離、anon拒否、想定外直接CRUD拒否の検証結果がある。
- Supabase生エラー、SQL、内部ID、研究本文をUIや外部ログに出していない。

### 6.3 レビュー前提資料

- migration差分またはSQL差分の説明
- 対象オブジェクト一覧
- RLS policy matrix
- grant/revoke一覧
- RPC入出力、認可、戻り値、失敗時挙動、エラー分類表
- 実行済みテストと未実施テストの一覧
- direct CRUD検索結果
- rollbackまたは修正migration方針

### 6.4 通過条件と停止条件

通過条件は、human reviewerまたはproject ownerの承認が作業記録またはPR本文に残っていること、かつ該当検証が完了していることである。レビュー不通過または未実施の場合、該当DB/RLS/RPC/Data Accessタスク、およびそれに依存するUI、E2E、デプロイを停止する。

## 7. マイルストーン計画

### M0: 実装準備・基盤確認

- 目的: 実装開始前に環境、作業記録、レビュー、テスト、Supabase分離、CI方針を固定する。
- 実施範囲: リポジトリ現状確認、Node/npm方針、Supabase環境、RLS/RPC検証方式、human review手順、作業記録先、ログ/Analytics方針。
- 着手条件: 参照文書と監査結果を読了している。
- 完了条件: Q-01、Q-02、Q-03、Q-09、Q-10の運用方針が決まり、M1/M2へ進む条件が文書化されている。
- 次へ進む条件: M1へは進める。M2へはSupabase環境、RLS/RPC検証方式、human review手順が確定していること。
- 人間レビュー要否: 必須。基盤方針とレビュー運用をproject ownerまたはhuman reviewerが承認する。
- 主なリスク: docs-only状態を見落とす、ProductionデータをPreviewで使う、テスト未実施を記録しない。
- スコープ逸脱防止メモ: テンプレートや便利ライブラリを独断追加しない。

### M1: 認証/静的アプリ骨格

- 目的: Next.js静的export前提のアプリ骨格、Magic Link、Auth Callback、未認証ガードを作る。
- 実施範囲: `output: 'export'`、`trailingSlash: true`、固定ルート、`/auth/callback/`、Supabase public env、Auth Data Access、共通レイアウト、最小共通UI。
- 着手条件: M0でNode/npm/静的構成方針が決定済み。
- 完了条件: API Routes、Server Actions、SSR、Pages Functionsなしで固定ルートが成立し、A1とAuth Callbackが動作する。
- 次へ進む条件: M1静的構成レビュー通過、フロントenvに許可された `NEXT_PUBLIC_*` 以外がないこと。
- 人間レビュー要否: 静的構成、環境変数、Auth Redirectは必須。
- 主なリスク: 動的ルート、SSR、API Routesへ流れる。
- スコープ逸脱防止メモ: SNSログイン、プロフィール、公開導線を作らない。

### M2: DB/RLS基盤 + 研究ライン

- 目的: v1の4業務テーブルを安全に作り、RLS、権限、直接CRUD可否、A/B分離を検証したうえで研究ライン機能へ接続する。
- 実施範囲: DDL、index、helper、RLS enable、policy、grant/revoke、4テーブル検証、研究ラインData Access、L1/L2最小UI。
- 着手条件: M0のSupabase環境、RLS/RPC検証方式、human review手順が確定済み。M1のAuth基盤が動作している。
- 完了条件: 4業務テーブルすべてでRLS有効化、policy、grant/revoke、想定外直接CRUD拒否、ユーザーA/B分離、anon拒否が検証済みである。研究ラインの作成/編集/アーカイブ/一覧が本人データだけで動作し、L1に試行数と最終試行日を表示する方針が実装準備済みである。
- 次へ進む条件: M2-10のDB/RLS human review gate通過。未通過ならM3に進まない。
- 人間レビュー要否: 必須。
- 主なリスク: 巨大migration、RLS未検証、`trials` / `trial_ingredients` の直接書き込み余地。
- スコープ逸脱防止メモ: 公開カラム、写真テーブル、比較/系譜/カスタム項目用テーブルを作らない。

### M3: 試行作成/編集 + 材料行 + `save_trial_with_ingredients`

- 目的: 試行本体と材料行をRPCだけで保存、編集できるようにする。
- 実施範囲: `save_trial_with_ingredients` 設計レビュー、RPC migration、RPC検証、Trial Data Access、T1/T2接続。
- 着手条件: M2完了、Q-05とQ-06が該当範囲で解消済み。
- 完了条件: `save_trial_with_ingredients` が本人の新規/編集、材料行全置換、部分保存なし、所有者不一致拒否、入力エラー分類を満たす。UI/Data Accessから `trials` / `trial_ingredients` への直接書き込み経路がない。
- 次へ進む条件: RPC human review通過、RPCテスト通過、T1保存失敗時の入力保持確認済み。
- 人間レビュー要否: 必須。
- 主なリスク: 直接CRUD、部分保存、RPCエラー分類漏れ。
- スコープ逸脱防止メモ: 写真、評価テンプレート、材料プリセット、カスタム項目を追加しない。

### M4: 複製/論理削除/スター

- 目的: 複製、論理削除、スターのv1操作を安全に追加する。
- 実施範囲: `clone_trial`、`soft_delete_trial`、スターData Access、T2操作、スター絞り込み準備。
- 着手条件: M3完了、Q-06とQ-07が該当範囲で解消済み。
- 完了条件: `clone_trial` は材料行をコピーしスターをコピーしない。`soft_delete_trial` は本人の未削除試行だけを論理削除する。スターは本人の未削除試行だけに付与/解除できる。
- 次へ進む条件: RPC/スターRLS検証とhuman review通過。
- 人間レビュー要否: RPCとスターData Access認可境界は必須。
- 主なリスク: スター複製、物理削除、他ユーザー試行のスター/削除。
- スコープ逸脱防止メモ: お気に入り棚、定番昇格、系譜グラフへ広げない。

### M5: 履歴/絞り込み/詳細

- 目的: T3履歴、L2試行一覧、T2詳細、親試行リンク、研究ライン/スター/日付範囲絞り込みを完成させる。
- 実施範囲: 履歴Data Access、50件単位読み込み、詳細取得、Not Found/Forbidden正規化、日付範囲、ホーム接続。
- 着手条件: M4完了、Q-05解消済み。
- 完了条件: 自分の未削除試行だけを最新順で初期50件、追加50件単位で取得し、他ユーザー/削除済みIDは内部情報を出さず表示不可にする。
- 次へ進む条件: 画面別受け入れ基準のH1/L2/T2/T3該当項目を確認済み。
- 人間レビュー要否: 認可境界に関わるData Accessは必須。
- 主なリスク: 削除済みや他ユーザーの詳細表示、日付境界ズレ。
- スコープ逸脱防止メモ: 比較、グラフ、ランキング、カレンダーを作らない。

### M6: 軽量ローカル下書き

- 目的: 認証ユーザー単位、同一ブラウザ内の軽量下書きを追加する。
- 実施範囲: localStorage key、保存/復元/破棄、共有端末リスク表示、ログアウト時確認。
- 着手条件: M3のT1フォームが成立している。
- 完了条件: `chai-lab:draft:v1:<user_id>` の範囲でのみ保存し、常時破棄導線があり、サーバー保存、自動同期、自動再送をしない。
- 次へ進む条件: T1/S1受け入れ基準の下書き関連を確認済み。
- 人間レビュー要否: 認可境界ではないが、共有端末リスクと保存先確認はレビュー推奨。
- 主なリスク: 別ユーザーへの下書き露出、オフライン同期への膨張。
- スコープ逸脱防止メモ: Dexie.js、Workbox、同期キューを追加しない。

### M7: テスト強化/E2E/受け入れ確認

- 目的: 下位テストで潰すべきものを済ませ、E2Eと画面受け入れ基準を確認する。
- 実施範囲: unit、component、DB/RLS/RPC再実行、E2E、390x844/1280x800、性能確認、スコープ検索、生成物管理。
- 着手条件: M1からM6の必須テストが各マイルストーン内で実行済み。
- 完了条件: 必須テストの実行結果、未実施理由、代替確認、残リスクが記録されている。主要画面が画面別受け入れ基準を満たす。
- 次へ進む条件: Criticalな未実施テストなし。RLS/RPC未実施ならM8へ進まない。
- 人間レビュー要否: 最終受け入れと未実施テスト判断は必須。
- 主なリスク: M7で初めてRLS/RPC不備が見つかる、E2Eだけで安全確認したつもりになる。
- スコープ逸脱防止メモ: テスト補助のために本番UIへ未実装導線を入れない。

### M8: デプロイ前確認

- 目的: Cloudflare Pages静的デプロイ前に構成、環境変数、Auth Redirect、運用確認、スコープを最終確認する。
- 実施範囲: `npm run build`、`out`、固定ルート、env、Preview分離、Auth Redirect、バックアップ/手動エクスポート、ログ方針、最終スコープ監査。
- 着手条件: M7完了。
- 完了条件: API Routes/SSR/Pages Functionsなし、許可envのみ、PreviewとProduction分離、RLSにより他ユーザーIDが表示不可、運用確認が記録済み。
- 次へ進む条件: project ownerがデプロイ前確認を承認。
- 人間レビュー要否: 必須。
- 主なリスク: `service_role` 混入、PreviewがProduction Supabaseを参照、静的export漏れ。
- スコープ逸脱防止メモ: デプロイ都合でWorkers/Functionsへ逃げない。

## 8. 詳細タスク分解

各タスクは、優先度、サイズ、目的、対応レイヤー、参照文書、着手条件、具体作業、レビュー要否、テスト/検証内容、完了条件、次タスクへ渡す成果物、想定リスク、スコープ逸脱防止メモを持つ。

### M0タスク

#### M0-01 リポジトリ現状と作業記録先の固定

- 優先度/サイズ: P0 / S
- 目的: docs-only状態、既存変更、作業記録先を確認する。
- 対応レイヤー: Docs / Repo
- 参照文書: README、codex-execution-rules
- 着手条件: 作業開始直後
- 具体作業: `git status`、既存設定、未追跡ファイルを確認し、PR本文または作業記録ファイルのどちらへレビュー/未実施検証を書くか決める。
- レビュー要否: 必須
- テスト/検証内容: 既存変更を上書きしない対象を明記する。
- 完了条件: 作業記録先と触らない既存変更が明確である。
- 次タスクへ渡す成果物: 作業記録運用
- 想定リスク: ユーザー変更の上書き、レビュー記録の散逸
- スコープ逸脱防止メモ: このタスクで実装コードを書かない。

#### M0-02 Node/npm/CIコマンド方針

- 優先度/サイズ: P0 / S
- 目的: Node LTS、npm、lockfile、テストコマンド、CI/手動の境界を固定する。
- 対応レイヤー: Deploy / Test
- 参照文書: tech-stack、deployment-contract、codex-execution-rules
- 着手条件: M0-01完了
- 具体作業: `.nvmrc`、`package.json`、npm lockfile、想定コマンド名、未実施記録形式を決める。
- レビュー要否: 必須
- テスト/検証内容: まだ実装前のため、コマンド名と必須/任意の区分を確認する。
- 完了条件: M7で使うコマンドと未実施報告形式が決まっている。
- 次タスクへ渡す成果物: テスト/CI方針
- 想定リスク: 完了判定の曖昧化
- スコープ逸脱防止メモ: パッケージマネージャーを混在させない。

#### M0-03 Supabase環境分離とAuth Redirect方針

- 優先度/サイズ: P0 / M
- 目的: local/preview/productionの分離とAuth Redirectを確認する。
- 対応レイヤー: DB / Auth / Deploy
- 参照文書: deployment-contract、app-rdd、db-migration-rls-policy
- 着手条件: M0-01完了
- 具体作業: Supabaseプロジェクト分離、PreviewでProductionデータを使わない方針、`/auth/callback/` URL、テストユーザー作成方法を決める。
- レビュー要否: 必須
- テスト/検証内容: 環境変数に許可値以外を置かない前提を確認する。
- 完了条件: Q-01が解消され、M2以降のDB検証環境が決まっている。
- 次タスクへ渡す成果物: Supabase環境方針
- 想定リスク: Productionデータ破壊、Redirect失敗
- スコープ逸脱防止メモ: サーバー側callbackを作らない。

#### M0-04 RLS/RPC検証方式の固定

- 優先度/サイズ: P0 / M
- 目的: DB/RLS/RPCをどの段階で何で検証するか決める。
- 対応レイヤー: DB / RLS / RPC / Test
- 参照文書: db-migration-rls-policy、codex-execution-rules
- 着手条件: M0-03完了
- 具体作業: SQLテスト、Supabase local、手動検証、CI対象の区分、A/Bユーザー作成、検証結果保存先を決める。
- レビュー要否: 必須
- テスト/検証内容: RLS有効化、policy、grant、direct CRUD可否、A/B分離、anon拒否の検証項目を固定する。
- 完了条件: Q-02が解消され、M2-09の検証が実行可能である。
- 次タスクへ渡す成果物: RLS/RPC検証手順
- 想定リスク: M7までRLS検証が後送りになる
- スコープ逸脱防止メモ: 検証のために本番UIへテスト導線を入れない。

#### M0-05 Human Review Gate運用確定

- 優先度/サイズ: P0 / S
- 目的: DB/RLS/RPC/security definer変更をレビューなしで通さない。
- 対応レイヤー: Docs / DB / RLS / RPC
- 参照文書: db-migration-rls-policy、implementation-plan-v1-audit
- 着手条件: M0-01完了
- 具体作業: reviewer役割、承認記録、レビュー前提資料、不通過時に止める作業を固定する。
- レビュー要否: 必須
- テスト/検証内容: レビュー対象変更の一覧が抜けていないか確認する。
- 完了条件: Q-03が解消される。
- 次タスクへ渡す成果物: Human Review Gate運用
- 想定リスク: `security definer` やpolicyの未レビュー混入
- スコープ逸脱防止メモ: 「必要に応じてレビュー」にしない。

#### M0-06 ログ/Analytics/運用確認方針

- 優先度/サイズ: P1 / S
- 目的: 個人研究ログの内容を外部やログへ漏らさない。
- 対応レイヤー: Deploy / Docs / Security
- 参照文書: app-lld、supabase-data-access-error-contract、app-rdd
- 着手条件: M0-01完了
- 具体作業: 外部Analyticsを導入しない、ログ禁止項目、バックアップ/手動エクスポート確認時期を決める。
- レビュー要否: 必須
- テスト/検証内容: env、依存、ログ方針に外部送信前提がないことを確認する。
- 完了条件: Q-08の確認期限とM8タスクが明確である。
- 次タスクへ渡す成果物: ログ/運用確認方針
- 想定リスク: 研究内容や認証情報のログ混入
- スコープ逸脱防止メモ: ユーザー向けエクスポートUIを作らない。

### M1タスク

#### M1-01 静的Next.js骨格と固定ルート

- 優先度/サイズ: P0 / M
- 目的: Cloudflare Pages静的配信前提を最初に固定する。
- 対応レイヤー: UI / Deploy
- 参照文書: deployment-contract、tech-stack
- 着手条件: M0-02完了
- 具体作業: 静的export、trailing slash、`out`、固定ルート、クエリパラメータ方式、API Routes/SSR/Pages Functions禁止をプロジェクト設定に反映する。
- レビュー要否: 必須
- テスト/検証内容: 固定ルート一覧に `/auth/callback/` を含め、任意ID動的ルートがないことを確認する。
- 完了条件: M8ではなくM1時点で静的構成が成立している。
- 次タスクへ渡す成果物: 静的アプリ骨格
- 想定リスク: M8で静的export不適合が発覚する
- スコープ逸脱防止メモ: API RoutesやFunctionsを作らない。

#### M1-02 Supabase public clientとenv境界

- 優先度/サイズ: P0 / S
- 目的: ブラウザで使える公開envだけでSupabaseを初期化する。
- 対応レイヤー: Data Access / Auth / Deploy
- 参照文書: deployment-contract、supabase-data-access-error-contract
- 着手条件: M1-01完了、M0-03完了
- 具体作業: `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_APP_ORIGIN` のみに限定する。
- レビュー要否: 必須
- テスト/検証内容: `SUPABASE_SERVICE_ROLE_KEY`、DB接続文字列、外部AI/Storage/R2/GitHubトークンがないことを検索する。
- 完了条件: フロントenvに許可値以外がない。
- 次タスクへ渡す成果物: Supabase client境界
- 想定リスク: service_role混入
- スコープ逸脱防止メモ: サーバー側セッション管理を作らない。

#### M1-03 AppResult/AppError契約とData Access境界

- 優先度/サイズ: P0 / M
- 目的: UIへSupabase生エラーを渡さない戻り値契約を固定する。
- 対応レイヤー: Data Access / ErrorHandling / Test
- 参照文書: supabase-data-access-error-contract、codex-execution-rules
- 着手条件: M1-02完了
- 具体作業: `AppResult` は成功/失敗の判別、data、errorを持つ形式に固定し、`AppError` はcode、message、retryable、fieldErrors、causeをUI非表示前提で扱う。全Data Access関数はこの契約に合わせる。
- レビュー要否: 認可境界に関わるため必須
- テスト/検証内容: 認証切れ、権限不足、入力エラー、通信失敗、未知エラーの分類表を作る。
- 完了条件: 「相当」ではなく契約文書に一致した戻り値形が決まっている。
- 次タスクへ渡す成果物: Data Access戻り値契約
- 想定リスク: 生エラー表示、retryable/fieldErrors漏れ
- スコープ逸脱防止メモ: UIコンポーネントからSupabase clientをimportしない。

#### M1-04 Magic Link認証とAuth Callback

- 優先度/サイズ: P0 / M
- 目的: A1と認証後遷移を静的ページ内で成立させる。
- 対応レイヤー: Auth / UI / Test
- 参照文書: app-rdd、screen-acceptance-criteria、deployment-contract
- 着手条件: M1-03完了
- 具体作業: Magic Link送信、callbackでのセッション確定、未認証時の業務画面誘導、ログアウトを作る。
- レビュー要否: Auth Redirectとenvは必須
- テスト/検証内容: A1のメール形式、送信中、成功、失敗、認証切れ表示。E2Eメール配送は必須にせず、テスト用セッション方針に従う。
- 完了条件: `/auth/callback/` が静的ページとして動き、業務画面が未認証で表示されない。
- 次タスクへ渡す成果物: 認証基盤
- 想定リスク: サーバーcallback実装、Redirect不一致
- スコープ逸脱防止メモ: SNSログインを追加しない。

#### M1-05 デザイントークンと最小共通UI

- 優先度/サイズ: P1 / M
- 目的: UIの基礎をv1画面に必要な最小範囲で作る。
- 対応レイヤー: UI / Test
- 参照文書: app-design、screen-acceptance-criteria、tech-stack
- 着手条件: M1-01完了
- 具体作業: Tailwind token、button/input/select/dialog等の最小部品、任意色/影追加の検索手順、Radix primitive追加時の個別理由記録を用意する。
- レビュー要否: Radix追加がある場合は必須
- テスト/検証内容: arbitrary color/shadowの検索、icon buttonのaria-label確認。
- 完了条件: 共通UIがv1画面に必要な範囲に限定されている。
- 次タスクへ渡す成果物: UI基礎部品
- 想定リスク: UI部品名目で依存や装飾が膨らむ
- スコープ逸脱防止メモ: 将来機能用の部品や無効ボタンを作らない。

### M2タスク

#### M2-00 DB変更分割計画レビュー

- 優先度/サイズ: P0 / S
- 目的: M2のDB変更を巨大migrationにしない。
- 対応レイヤー: DB / RLS / Docs
- 参照文書: db-migration-rls-policy、implementation-plan-v1-audit
- 着手条件: M0-04、M0-05完了
- 具体作業: DDL、index、helper、RLS enable、policy、grant/revoke、検証を別タスク/別論理変更に分け、レビュー順を決める。
- レビュー要否: 必須
- テスト/検証内容: 各migrationが1論理変更であることを確認する。
- 完了条件: M2-01からM2-10の順序とレビュー対象が承認済み。
- 次タスクへ渡す成果物: DB変更分割計画
- 想定リスク: 4テーブル、helper、policy、grantの混在
- スコープ逸脱防止メモ: v1許可4テーブル以外を計画に入れない。

#### M2-01 `research_lines` DDL

- 優先度/サイズ: P0 / S
- 目的: 研究ラインテーブルを最小DDLで作る。
- 対応レイヤー: DB
- 参照文書: app-lld、db-migration-rls-policy
- 着手条件: M2-00承認
- 具体作業: 必要カラム、所有者、アーカイブ、作成/更新時刻を定義する。公開/共有/写真/AI/比較用カラムを入れない。
- レビュー要否: 必須
- テスト/検証内容: DDL差分、先回りカラムなし、owner列の存在を確認する。
- 完了条件: DDLのみのmigrationがレビュー通過。
- 次タスクへ渡す成果物: `research_lines` table
- 想定リスク: uniqueやpolicyを同一migrationに混ぜる
- スコープ逸脱防止メモ: 公開状態カラムを作らない。

#### M2-02 `trials` DDL

- 優先度/サイズ: P0 / S
- 目的: 試行本体テーブルを最小DDLで作る。
- 対応レイヤー: DB
- 参照文書: app-lld、mvp-scope-contract
- 着手条件: M2-01完了
- 具体作業: 研究ライン参照、親試行参照、`deleted_at`、`brewed_at`、試行メモ/評価項目をv1範囲で定義する。
- レビュー要否: 必須
- テスト/検証内容: 写真、公開、比較、系譜グラフ専用、カスタム項目用カラムがないことを確認する。
- 完了条件: DDLのみのmigrationがレビュー通過。
- 次タスクへ渡す成果物: `trials` table
- 想定リスク: 将来機能用カラム追加
- スコープ逸脱防止メモ: trial保存ロジックはまだ作らない。

#### M2-03 `trial_ingredients` DDL

- 優先度/サイズ: P0 / S
- 目的: 材料行テーブルを最小DDLで作る。
- 対応レイヤー: DB
- 参照文書: app-lld
- 着手条件: M2-02完了
- 具体作業: 親trial、材料名、量、単位、順序を定義する。
- レビュー要否: 必須
- テスト/検証内容: 材料マスター、プリセット、スパイスブレンド用構造がないことを確認する。
- 完了条件: DDLのみのmigrationがレビュー通過。
- 次タスクへ渡す成果物: `trial_ingredients` table
- 想定リスク: 将来の材料辞書を先回りする
- スコープ逸脱防止メモ: 材料行保存はRPCまで直接実装しない。

#### M2-04 `trial_stars` DDL

- 優先度/サイズ: P0 / S
- 目的: スター状態をv1最小範囲で扱う。
- 対応レイヤー: DB
- 参照文書: app-lld、mvp-scope-contract
- 着手条件: M2-03完了
- 具体作業: userとtrialの組み合わせ、作成時刻、重複防止を定義する。
- レビュー要否: 必須
- テスト/検証内容: お気に入り棚、定番昇格、リアクション用構造がないことを確認する。
- 完了条件: DDLのみのmigrationがレビュー通過。
- 次タスクへ渡す成果物: `trial_stars` table
- 想定リスク: SNSリアクションへ拡張する
- スコープ逸脱防止メモ: スターは本人の印だけに限定する。

#### M2-05 Index/constraint migration

- 優先度/サイズ: P0 / M
- 目的: v1検索と整合性に必要なindex/constraintをDDL本体から分ける。
- 対応レイヤー: DB
- 参照文書: app-lld、app-rdd、db-migration-rls-policy
- 着手条件: M2-01からM2-04完了、Q-04の方針が必要な範囲で決定済み
- 具体作業: user/line/date/star取得、未削除一覧、active research line重複、親参照に必要なindex/constraintを定義する。
- レビュー要否: 必須
- テスト/検証内容: 1000件程度の履歴取得に必要なindex観点を確認する。
- 完了条件: index/constraintだけのmigrationがレビュー通過。
- 次タスクへ渡す成果物: index/constraint
- 想定リスク: 正規化未決定のままuniqueを固定する
- スコープ逸脱防止メモ: 検索便利機能や集計用indexを過剰に作らない。

#### M2-06 Helper/View/Enum等の補助要素

- 優先度/サイズ: P0 / M
- 目的: RLSとRPCで使う最小helperを分離して作る。
- 対応レイヤー: DB / RLS
- 参照文書: app-lld、db-migration-rls-policy
- 着手条件: M2-05完了
- 具体作業: 所有者確認helper、active line/trial確認helperなど必要最小限を定義し、`security definer` を使う場合はsearch_path固定、PUBLIC revoke、authenticated grantを明記する。
- レビュー要否: 必須
- テスト/検証内容: A/B所有者確認、deleted/archivedの扱い、PUBLIC実行不可を確認する。
- 完了条件: helperの権限と動作がレビュー通過。
- 次タスクへ渡す成果物: helper set
- 想定リスク: helperが広すぎてRLSを迂回する
- スコープ逸脱防止メモ: 将来機能向けhelperを作らない。

#### M2-07 RLS有効化

- 優先度/サイズ: P0 / S
- 目的: 4業務テーブルすべてでRLSを有効にする。
- 対応レイヤー: RLS
- 参照文書: db-migration-rls-policy、mvp-scope-contract
- 着手条件: M2-06完了
- 具体作業: `research_lines`、`trials`、`trial_ingredients`、`trial_stars` のRLS有効化を行う。
- レビュー要否: 必須
- テスト/検証内容: 各テーブルでRLSが有効であることを検証手順で確認する。
- 完了条件: 4テーブルすべてRLS有効化済み。
- 次タスクへ渡す成果物: RLS enabled tables
- 想定リスク: 1テーブルだけ有効化漏れ
- スコープ逸脱防止メモ: authなし公開policyを作らない。

#### M2-08 Policy定義

- 優先度/サイズ: P0 / L
- 目的: テーブル別に許可操作と拒否操作を明示する。
- 対応レイヤー: RLS
- 参照文書: app-lld、db-migration-rls-policy
- 着手条件: M2-07完了
- 具体作業: `research_lines` は本人select/insert/updateのみ、delete不可。`trials` は本人selectのみ、insert/update/delete/upsert不可。`trial_ingredients` は親trial本人selectのみ、insert/update/delete/upsert不可。`trial_stars` は本人の未削除trialに対するselect/insert/deleteのみ、update不可。
- レビュー要否: 必須
- テスト/検証内容: `USING` と `WITH CHECK` の意図、他ユーザー拒否、archived/deletedの扱いを確認する。
- 完了条件: policy matrixがレビュー通過。
- 次タスクへ渡す成果物: RLS policies
- 想定リスク: select広すぎ、write許可広すぎ
- スコープ逸脱防止メモ: 公開閲覧policyを作らない。

#### M2-09 Grant/Revoke整理

- 優先度/サイズ: P0 / M
- 目的: anon/authenticatedの権限をpolicy意図と一致させる。
- 対応レイヤー: DB / RLS
- 参照文書: db-migration-rls-policy、deployment-contract
- 着手条件: M2-08完了
- 具体作業: anonの業務テーブルアクセス拒否、authenticatedの許可範囲、helper/RPC実行権限、PUBLIC revokeを整理する。
- レビュー要否: 必須
- テスト/検証内容: anon拒否、authenticatedの想定外操作拒否、PUBLIC実行不可を確認する。
- 完了条件: grant/revoke matrixがレビュー通過。
- 次タスクへ渡す成果物: 権限設定
- 想定リスク: PUBLICに広く実行権限が残る
- スコープ逸脱防止メモ: service_role前提のブラウザ処理を作らない。

#### M2-10 4テーブルRLS/権限/直接CRUD検証

- 優先度/サイズ: P0 / L
- 目的: M2内で全4業務テーブルの安全性を実行確認する。
- 対応レイヤー: RLS / DB / Test
- 参照文書: db-migration-rls-policy、codex-execution-rules、implementation-plan-v1-audit
- 着手条件: M2-09完了
- 具体作業: 4テーブルそれぞれでRLS有効化、policy、grant/revoke、anon拒否、ユーザーA/B分離、想定外直接CRUD拒否、想定経路の成功を検証する。
- レビュー要否: 必須
- テスト/検証内容: `research_lines` はAが自分だけ作成/編集でき、Bの行参照/更新/削除不可。`trials` はAが自分のselectのみ可能でinsert/update/delete/upsert不可。`trial_ingredients` は親trial所有者だけselect可能で直接write不可。`trial_stars` は本人の未削除trialだけinsert/delete可能でBのtrialや削除済みtrialは拒否。全テーブルでanon拒否。
- 完了条件: 検証結果が作業記録にあり、失敗がない。未実施があればM2未完了。
- 次タスクへ渡す成果物: RLS/権限検証結果
- 想定リスク: M7までRLS不備を見逃す
- スコープ逸脱防止メモ: 検証のためにpolicyを緩めない。

#### M2-11 DB/RLS Human Review Gate通過

- 優先度/サイズ: P0 / S
- 目的: M2のDB/RLS変更を人間レビューで閉じる。
- 対応レイヤー: DB / RLS / Docs
- 参照文書: db-migration-rls-policy、implementation-plan-v1-audit
- 着手条件: M2-10完了
- 具体作業: DDL、index、helper、policy、grant/revoke、検証結果、direct CRUD検索結果、スコープ検索結果をレビューに出す。
- レビュー要否: 必須
- テスト/検証内容: reviewerがM2-10結果と禁止要素なしを確認する。
- 完了条件: 承認記録が残る。未承認ならM3へ進まない。
- 次タスクへ渡す成果物: M2承認記録
- 想定リスク: DB事故の未レビュー通過
- スコープ逸脱防止メモ: 「レビュー予定」で完了にしない。

#### M2-12 研究ラインData Access

- 優先度/サイズ: P0 / M
- 目的: 研究ライン操作をData Access層に閉じ込める。
- 対応レイヤー: Data Access / ErrorHandling
- 参照文書: supabase-data-access-error-contract、app-lld
- 着手条件: M2-11完了、Q-04解消済み
- 具体作業: 一覧、作成、編集、アーカイブ、active line取得、L1の試行数/最終試行日用取得を定義する。
- レビュー要否: 認可境界のため必須
- テスト/検証内容: AUTH_REQUIRED、FORBIDDEN/NOT_FOUND、CONFLICT、NETWORK_ERRORの分類を確認する。
- 完了条件: UIからSupabaseを直接呼ばず、本人データだけが返る。
- 次タスクへ渡す成果物: Research Line Data Access
- 想定リスク: アーカイブ済みlineを新規試行選択に出す
- スコープ逸脱防止メモ: 公開/フォロー/投稿数概念を入れない。

#### M2-13 L1/L2研究ラインUI

- 優先度/サイズ: P1 / M
- 目的: 研究ラインの一覧、作成、編集、アーカイブを受け入れ基準に沿って作る。
- 対応レイヤー: UI / Test
- 参照文書: app-design、screen-acceptance-criteria
- 着手条件: M2-12完了
- 具体作業: L1カードに名前、説明、試行数、最終試行日を表示し、空状態、loading、error、認証切れ、アーカイブ確認を実装する。
- レビュー要否: 通常UIレビュー
- テスト/検証内容: L1/L2受け入れ基準、モバイル1カラム、アーカイブ済みの扱い。
- 完了条件: 研究ラインUIが本人データだけで動作し、スコープ外導線がない。
- 次タスクへ渡す成果物: 研究ラインUI
- 想定リスク: UIが試行保存より先に過剰機能化する
- スコープ逸脱防止メモ: 公開状態や共有導線を表示しない。

### M3タスク

#### M3-01 `save_trial_with_ingredients` RPC仕様レビュー

- 優先度/サイズ: P0 / M
- 目的: 試行保存RPCの入力、認可、戻り値、失敗時挙動を実装前に固定する。
- 対応レイヤー: RPC / ErrorHandling / Docs
- 参照文書: app-lld、supabase-data-access-error-contract、db-migration-rls-policy
- 着手条件: M2完了、Q-05/Q-06解消済み
- 具体作業: 新規/編集、材料全置換、所有者確認、親試行、archived line、入力エラー、競合、Not Found、戻り値、SQLSTATE/AppError分類を定義する。
- レビュー要否: 必須
- テスト/検証内容: 仕様表に認可とエラー分類があることを確認する。
- 完了条件: human reviewer承認済み。
- 次タスクへ渡す成果物: RPC仕様書相当の作業記録
- 想定リスク: RPC責務の曖昧化
- スコープ逸脱防止メモ: 比較/写真/カスタム項目を入力に含めない。

#### M3-02 `save_trial_with_ingredients` migration

- 優先度/サイズ: P0 / L
- 目的: 試行本体と材料行保存をRPCへ集約する。
- 対応レイヤー: RPC / DB / RLS
- 参照文書: app-lld、db-migration-rls-policy
- 着手条件: M3-01承認
- 具体作業: `security definer`、search_path固定、auth.uid所有者確認、PUBLIC revoke、authenticated grant、トランザクション、部分保存なしを満たすRPCを追加する。
- レビュー要否: 必須
- テスト/検証内容: security definer hardening、grant/revoke、他ユーザー拒否、archived/deleted拒否。
- 完了条件: migrationと権限がレビュー通過。
- 次タスクへ渡す成果物: save RPC
- 想定リスク: 所有者確認漏れ、部分保存
- スコープ逸脱防止メモ: UI直接保存を許可しない。

#### M3-03 Save RPC検証

- 優先度/サイズ: P0 / L
- 目的: RPCをUI接続前に検証する。
- 対応レイヤー: RPC / Test
- 参照文書: codex-execution-rules、db-migration-rls-policy
- 着手条件: M3-02完了
- 具体作業: 新規、編集、材料全置換、材料0件拒否、未知キー拒否、他ユーザーline/trial拒否、直接CRUD失敗、部分保存なしを検証する。
- レビュー要否: 必須
- テスト/検証内容: `trials` / `trial_ingredients` direct insert/update/delete/upsertが失敗し、RPC経由だけ成功する。
- 完了条件: 検証結果が記録済み。未実施ならT1接続不可。
- 次タスクへ渡す成果物: Save RPC検証結果
- 想定リスク: UIで初めて保存不備が出る
- スコープ逸脱防止メモ: 検証のために権限を緩めない。

#### M3-04 Trial Data Access

- 優先度/サイズ: P0 / M
- 目的: 試行保存/詳細取得をData Access層へ閉じ込める。
- 対応レイヤー: Data Access / ErrorHandling
- 参照文書: supabase-data-access-error-contract、app-lld
- 着手条件: M3-03完了
- 具体作業: save RPC呼び出し、detail取得、research line候補取得、エラー分類、入力保持に必要な戻り値を実装対象として定義する。
- レビュー要否: 認可境界のため必須
- テスト/検証内容: UIからSupabase直接importなし、direct CRUD検索、AppError分類。
- 完了条件: `trials` / `trial_ingredients` direct write経路が存在しない。
- 次タスクへ渡す成果物: Trial Data Access
- 想定リスク: Data Access内で直接CRUDを書く
- スコープ逸脱防止メモ: RPC以外の保存経路を作らない。

#### M3-05 T1試行フォーム

- 優先度/サイズ: P0 / L
- 目的: 試行と材料行をモバイル1カラムで入力し保存する。
- 対応レイヤー: UI / Test
- 参照文書: screen-acceptance-criteria、app-design
- 着手条件: M3-04完了
- 具体作業: 研究ライン選択、`brewed_at`、材料行、単位候補 g/ml/tsp/tbsp/piece/pinch、メモ、保存中、保存失敗、入力保持を作る。
- レビュー要否: 通常UIレビュー
- テスト/検証内容: Zod、React Hook Form、保存失敗時resetなし、モバイル1カラム。
- 完了条件: T1受け入れ基準を満たし、保存はRPC経由のみ。
- 次タスクへ渡す成果物: 試行入力UI
- 想定リスク: 保存失敗で入力を失う
- スコープ逸脱防止メモ: 写真、AI、カスタム項目を置かない。

#### M3-06 T2詳細の基本表示

- 優先度/サイズ: P1 / M
- 目的: 保存済み試行を本人だけが閲覧できる。
- 対応レイヤー: UI / Data Access / Test
- 参照文書: screen-acceptance-criteria、app-design
- 着手条件: M3-04完了
- 具体作業: 詳細、材料行、親試行リンク表示枠、Not Found/Forbidden、loading/error/auth expiredを作る。
- レビュー要否: 認可境界のため必須
- テスト/検証内容: 他ユーザーID、削除済みID、存在しないIDで内部情報を出さない。
- 完了条件: T2基本表示が本人データだけで成立する。
- 次タスクへ渡す成果物: 試行詳細基本UI
- 想定リスク: ID直指定で他ユーザー情報が出る
- スコープ逸脱防止メモ: 共有URL表示を作らない。

### M4タスク

#### M4-01 `clone_trial` 設計/migration/検証

- 優先度/サイズ: P0 / L
- 目的: 複製をRPCで安全に実装する。
- 対応レイヤー: RPC / DB / Test
- 参照文書: app-lld、db-migration-rls-policy、screen-acceptance-criteria
- 着手条件: M3完了、Q-07解消済み
- 具体作業: 設計レビュー、security definer hardening、本人未削除trial確認、材料行コピー、スター非コピー、親ID設定、AppError分類を定義し検証する。
- レビュー要否: 必須
- テスト/検証内容: スター付き元trialを複製して新trialにstarが作られない。他ユーザー/削除済み/archived line拒否。
- 完了条件: レビューと検証が通過し、未編集複製のUX方針が記録済み。
- 次タスクへ渡す成果物: Clone RPC
- 想定リスク: スター複製、放置複製試行
- スコープ逸脱防止メモ: 系譜グラフへ広げない。

#### M4-02 `soft_delete_trial` 設計/migration/検証

- 優先度/サイズ: P0 / M
- 目的: 論理削除をRPCで安全に実装する。
- 対応レイヤー: RPC / DB / Test
- 参照文書: app-lld、db-migration-rls-policy
- 着手条件: M3完了
- 具体作業: security definer hardening、本人未削除trial確認、`deleted_at`設定、物理削除なし、材料行/スター保持、AppError分類を定義し検証する。
- レビュー要否: 必須
- テスト/検証内容: 他ユーザー拒否、二重削除、一覧除外、detail表示不可、直接update失敗。
- 完了条件: レビューと検証が通過。
- 次タスクへ渡す成果物: Soft delete RPC
- 想定リスク: 物理削除、直接update
- スコープ逸脱防止メモ: 復元UIは作らない。

#### M4-03 Star Data AccessとRLS再検証

- 優先度/サイズ: P0 / M
- 目的: スター付与/解除を本人の未削除試行だけに限定する。
- 対応レイヤー: Data Access / RLS / Test
- 参照文書: app-lld、supabase-data-access-error-contract
- 着手条件: M2のstar RLS検証完了、M3完了
- 具体作業: star insert/delete、状態取得、AppError分類、deleted/non-owned拒否をData Accessから扱う。
- レビュー要否: 認可境界のため必須
- テスト/検証内容: AがBのtrialにstar不可、deleted trial不可、update/upsert不可。
- 完了条件: スター操作の許可/拒否が検証済み。
- 次タスクへ渡す成果物: Star Data Access
- 想定リスク: 他ユーザーtrialへのstar
- スコープ逸脱防止メモ: リアクションやお気に入り棚へ拡張しない。

#### M4-04 T2操作UI

- 優先度/サイズ: P1 / M
- 目的: 詳細画面に複製、論理削除、スターを安全に接続する。
- 対応レイヤー: UI / Test
- 参照文書: screen-acceptance-criteria、app-design
- 着手条件: M4-01からM4-03完了
- 具体作業: 操作ボタン、確認ダイアログ、成功/失敗、認証切れ、複製後遷移を作る。
- レビュー要否: 通常UIレビュー
- テスト/検証内容: cloneでstar非コピー、soft delete後一覧除外、削除確認、aria-label。
- 完了条件: T2操作受け入れ基準を満たす。
- 次タスクへ渡す成果物: T2操作UI
- 想定リスク: UIだけで削除状態を仮反映してDB不整合
- スコープ逸脱防止メモ: 比較/共有ボタンを置かない。

### M5タスク

#### M5-01 履歴/絞り込みData Access

- 優先度/サイズ: P0 / M
- 目的: T3/L2/H1の試行一覧取得を安全に実装する。
- 対応レイヤー: Data Access / Test
- 参照文書: app-lld、supabase-data-access-error-contract、screen-acceptance-criteria
- 着手条件: M4完了、Q-05解消済み
- 具体作業: 未削除、自分のみ、最新順、初期50件、追加50件、line/star/date filter、Not Found/Forbiddenを定義する。
- レビュー要否: 認可境界のため必須
- テスト/検証内容: 他ユーザー/削除済み除外、日付境界、1000件程度での2秒目標確認。
- 完了条件: 一覧取得が受け入れ基準と性能目標に沿う。
- 次タスクへ渡す成果物: History Data Access
- 想定リスク: deleted_at除外漏れ、日付ズレ
- スコープ逸脱防止メモ: カレンダーや集計グラフを作らない。

#### M5-02 T3/L2/H1 UI接続

- 優先度/サイズ: P1 / L
- 目的: 履歴、研究ライン詳細、ホームを受け入れ基準に沿って接続する。
- 対応レイヤー: UI / Test
- 参照文書: screen-acceptance-criteria、app-design
- 着手条件: M5-01完了
- 具体作業: T3の50件単位、filter、empty/loading/error/auth expired、L2のline別一覧、H1の最近の試行/研究ライン導線を作る。
- レビュー要否: 通常UIレビュー
- テスト/検証内容: 390x844/1280x800、詳細遷移、親試行リンク、禁止導線なし。
- 完了条件: H1/L2/T3受け入れ基準を満たす。
- 次タスクへ渡す成果物: 履歴/ホームUI
- 想定リスク: 履歴画面が比較画面化する
- スコープ逸脱防止メモ: 比較、ランキング、グラフを置かない。

### M6タスク

#### M6-01 Local draft Data Access

- 優先度/サイズ: P1 / M
- 目的: 下書きを同一ブラウザ/認証ユーザー単位に限定する。
- 対応レイヤー: Data Access / UI / Test
- 参照文書: supabase-data-access-error-contract、screen-acceptance-criteria
- 着手条件: M3-05完了
- 具体作業: key `chai-lab:draft:v1:<user_id>`、保存/読込/破棄、別ユーザー混入防止、サーバー送信なしを定義する。
- レビュー要否: 推奨
- テスト/検証内容: 別user_idで復元されない、logout後の扱い、破棄が常に可能。
- 完了条件: 下書きがlocalStorageだけに残り、同期/自動再送がない。
- 次タスクへ渡す成果物: Draft storage
- 想定リスク: 共有端末で内容露出
- スコープ逸脱防止メモ: オフライン同期ライブラリを追加しない。

#### M6-02 T1/S1下書きUI

- 優先度/サイズ: P1 / M
- 目的: 下書き保存、復元、破棄、共有端末リスクをUIに反映する。
- 対応レイヤー: UI / Test
- 参照文書: screen-acceptance-criteria、app-design
- 着手条件: M6-01完了
- 具体作業: T1で復元/破棄、S1で下書き管理、ログアウト時の保持/破棄確認を作る。
- レビュー要否: 通常UIレビュー
- テスト/検証内容: 入力保持、破棄、共有端末リスク表示、認証切れ。
- 完了条件: 常時破棄導線があり、下書きをサーバー保存しない。
- 次タスクへ渡す成果物: Draft UI
- 想定リスク: 下書きが消せない、同期機能に拡張する
- スコープ逸脱防止メモ: 自動同期や再送キューを作らない。

### M7タスク

#### M7-01 Unit/Component必須テスト

- 優先度/サイズ: P0 / M
- 目的: UI前に潰せるロジックと状態表示を確認する。
- 対応レイヤー: Test / UI / Data Access
- 参照文書: tech-stack、screen-acceptance-criteria
- 着手条件: M1からM6の対象実装完了
- 具体作業: Zod、AppError分類、date range、draft key、フォーム入力保持、状態表示、確認ダイアログをテストする。
- レビュー要否: 通常レビュー
- テスト/検証内容: 必須テストと未実施項目を分ける。
- 完了条件: 失敗がなく、未実施なら理由と残リスクがある。
- 次タスクへ渡す成果物: unit/component結果
- 想定リスク: E2Eでしか不具合検出できない
- スコープ逸脱防止メモ: テストのために本番コードへ裏口を作らない。

#### M7-02 DB/RLS/RPC再実行ゲート

- 優先度/サイズ: P0 / M
- 目的: M2/M3/M4で実行した安全テストをリリース前に再確認する。
- 対応レイヤー: DB / RLS / RPC / Test
- 参照文書: db-migration-rls-policy、codex-execution-rules
- 着手条件: M4完了
- 具体作業: 4テーブルRLS、direct CRUD可否、A/B分離、save/clone/delete RPC、star非コピー、logical deleteを再実行する。
- レビュー要否: 必須
- テスト/検証内容: 未実施ならM8に進まない。
- 完了条件: CriticalなDB/RLS/RPCテストに未実施がない。
- 次タスクへ渡す成果物: リリース前DB安全確認
- 想定リスク: 途中の変更でRLSが崩れる
- スコープ逸脱防止メモ: テスト失敗をpolicy緩和で直さない。

#### M7-03 E2Eと画面別受け入れ確認

- 優先度/サイズ: P0 / L
- 目的: A1/H1/L1/L2/T1/T2/T3/S1を受け入れ基準に沿って確認する。
- 対応レイヤー: UI / Test
- 参照文書: screen-acceptance-criteria、app-design
- 着手条件: M7-01、M7-02完了
- 具体作業: 認証後の研究ライン作成、試行作成、詳細、複製、スター、削除、履歴、下書き、ログアウトを確認する。
- レビュー要否: 必須
- テスト/検証内容: 390x844、1280x800、loading/empty/error/auth expired、禁止導線なし。
- 完了条件: 画面別traceability matrixに未確認Critical項目がない。
- 次タスクへ渡す成果物: E2E/受け入れ結果
- 想定リスク: 画面が存在するだけで完了扱い
- スコープ逸脱防止メモ: 共有/写真/AI/比較/系譜導線を置かない。

#### M7-04 性能/生成物/スコープ監査

- 優先度/サイズ: P1 / M
- 目的: 非機能要件、生成物、スコープ逸脱を最終前に確認する。
- 対応レイヤー: Test / Docs / Repo
- 参照文書: app-rdd、tech-stack、mvp-scope-contract
- 着手条件: M7-03完了
- 具体作業: 1000件程度の履歴で主要操作2秒目標、`test-results/` やスクリーンショットのコミット方針、禁止キーワード検索、依存差分確認を行う。
- レビュー要否: 必須
- テスト/検証内容: 公開/共有/写真/AI/比較/系譜/custom/offline/API Routes/Functionsの混入確認。
- 完了条件: 不要生成物をコミットせず、スコープ逸脱がない。
- 次タスクへ渡す成果物: 最終前監査結果
- 想定リスク: テスト成果物や不要依存の混入
- スコープ逸脱防止メモ: 検出した先回り実装は削除または設計変更まで停止する。

### M8タスク

#### M8-01 Static build and route check

- 優先度/サイズ: P0 / S
- 目的: Cloudflare Pages向け静的成果物を確認する。
- 対応レイヤー: Deploy / Test
- 参照文書: deployment-contract
- 着手条件: M7完了
- 具体作業: build、`out`、固定ルート、`/auth/callback/`、ID画面のquery方式、API Routes/SSR/Functionsなしを確認する。
- レビュー要否: 必須
- テスト/検証内容: ビルド結果、ルート一覧、禁止機能検索。
- 完了条件: Cloudflare Pages設定に合う。
- 次タスクへ渡す成果物: static build確認
- 想定リスク: 動的ルート混入
- スコープ逸脱防止メモ: Functionsへ逃げない。

#### M8-02 Env/Auth/Preview分離確認

- 優先度/サイズ: P0 / S
- 目的: 本番前に環境変数とAuth Redirectを確認する。
- 対応レイヤー: Deploy / Auth / Security
- 参照文書: deployment-contract、supabase-data-access-error-contract
- 着手条件: M8-01完了
- 具体作業: Cloudflare Pages env、Supabase Redirect URL、Preview Supabase分離、`service_role` なしを確認する。
- レビュー要否: 必須
- テスト/検証内容: local/preview/productionのcallback、許可envだけ。
- 完了条件: PreviewがProductionデータを参照しない。
- 次タスクへ渡す成果物: deploy env確認
- 想定リスク: 本番データ参照、secret混入
- スコープ逸脱防止メモ: サーバー側セッション管理を追加しない。

#### M8-03 Backup/export/logging operation check

- 優先度/サイズ: P0 / S
- 目的: 運用確認を本番前に閉じる。
- 対応レイヤー: Deploy / Docs / Security
- 参照文書: app-rdd、app-lld、supabase-data-access-error-contract
- 着手条件: M8-02完了、Q-08確認済み
- 具体作業: Supabaseバックアップ状況、手動エクスポート手順、外部Analyticsなし、ログ禁止項目を確認する。
- レビュー要否: 必須
- テスト/検証内容: 研究内容、材料名、メモ、認証情報が外部ログへ出ないことを確認する。
- 完了条件: 運用確認が作業記録に残る。
- 次タスクへ渡す成果物: 運用確認記録
- 想定リスク: 復旧手順不明、ログ漏えい
- スコープ逸脱防止メモ: ユーザー向けエクスポート機能を作らない。

#### M8-04 Final release review

- 優先度/サイズ: P0 / M
- 目的: v1として出してよいか最終判断する。
- 対応レイヤー: Docs / Test / Deploy
- 参照文書: mvp-scope-contract、codex-execution-rules、screen-acceptance-criteria
- 着手条件: M8-01からM8-03完了
- 具体作業: 実施/未実施テスト、human review記録、スコープ検索、未解消要確認事項、残リスクを確認する。
- レビュー要否: 必須
- テスト/検証内容: Critical未実施なし、Major残リスクの許容判断。
- 完了条件: project ownerがデプロイ可否を判断できる記録がある。
- 次タスクへ渡す成果物: デプロイ前判断
- 想定リスク: 未実施テストを隠す
- スコープ逸脱防止メモ: v1外要望は次期検討に回すだけで実装しない。

## 9. DB / RLS / RPC専用実装方針

### 9.1 4業務テーブルごとの実装順と検証順

| 順 | テーブル | 作るもの | 作成直後に確認するもの | M2完了に必要な検証 |
|---|---|---|---|---|
| 1 | `research_lines` | DDL、index/active unique、RLS、policy、grant | owner列、archive列、公開/共有列なし | Aは自分のselect/insert/update可。AはBの行参照/更新/削除不可。delete不可。anon拒否。 |
| 2 | `trials` | DDL、index、RLS、policy、grant | line/parent/deleted/brewed_at、先回り列なし | Aは自分のselectのみ可。insert/update/delete/upsertはRPC前でも直接不可。Bの行不可。anon拒否。 |
| 3 | `trial_ingredients` | DDL、index、RLS、policy、grant | parent trial、順序、材料行最小項目 | 親trial所有者だけselect可。insert/update/delete/upsert直接不可。Bの材料行不可。anon拒否。 |
| 4 | `trial_stars` | DDL、unique、RLS、policy、grant | user/trial unique、SNSリアクション列なし | 本人の未削除trialだけselect/insert/delete可。update/upsert不可。Bのtrial、削除済みtrial不可。anon拒否。 |

M2はmigration作成だけでは完了しない。上表の検証結果とhuman review承認がない限り、M3へ進まない。

### 9.2 policy / grant / revoke / helper / functionの扱い

- DDL、index、helper、RLS有効化、policy、grant/revoke、RPCは別論理変更として扱う。
- helperはRLS/RPCで必要な所有者確認に限定し、将来機能用helperを作らない。
- `security definer` を含むhelper/RPCは、search_path固定、`auth.uid()`、所有者確認、PUBLIC revoke、必要ロールへのgrantを必須にする。
- anonには業務テーブルの直接アクセスを許さない。
- authenticatedの許可はpolicyと一致させ、`trials` / `trial_ingredients` の直接書き込みを成立させない。

### 9.3 RPC変更時の必須レビュー項目

RPC追加/変更時は、次をレビュー前提資料に含める。

- RPC名、目的、v1スコープ根拠
- 入力項目と未知キー拒否
- 認可条件と所有者確認
- 影響テーブル
- 成功時戻り値
- 失敗時挙動、SQLSTATEまたは識別子、AppError分類
- `security definer` hardening
- grant/revoke
- A/B分離、direct CRUD拒否、部分保存なしの検証

### 9.4 直接CRUD禁止の担保

禁止対象は、UIだけでなくData Access、test helper、utility、将来のwrapper関数も含む。

必ず検索する対象:

- `from('trials')` と `from("trials")` に対する insert/update/delete/upsert
- `from('trial_ingredients')` と `from("trial_ingredients")` に対する insert/update/delete/upsert
- `delete`、`upsert`、`update` の見落とし
- 直接CRUDを包む独自関数
- Supabase raw SQLやRPCを使った迂回

許可される試行系書き込み経路は、`save_trial_with_ingredients`、`clone_trial`、`soft_delete_trial` に限定する。スターは `trial_stars` の本人未削除trialへのinsert/deleteのみ許可し、研究ラインは本人の作成/編集/アーカイブのみ許可する。

### 9.5 停止条件

次のいずれかが発生した場合、DB/RLS/RPCに依存する後続タスクを止める。

- 4業務テーブルのいずれかでRLS有効化が未確認
- A/B分離、anon拒否、想定外直接CRUD拒否が未実施
- `security definer` のsearch_path、PUBLIC revoke、authenticated grantが未確認
- human review承認がない
- migrationが複数論理変更を混在している
- v1非対象の列、テーブル、policy、UI導線が混入している

## 10. Data Accessとエラー処理方針

- UIコンポーネントはSupabase clientを直接importしない。
- Data AccessはSupabase操作、RPC呼び出し、AppResult/AppError正規化、RLS前提の本人データ取得、用途別filterを担当する。
- `AppResult` は成功/失敗が判別でき、成功時data、失敗時AppErrorを返す形に統一する。
- `AppError` はcode、ユーザー向けmessage、retryable、fieldErrors、内部causeを区別し、内部causeはUIへ表示しない。
- 入力エラーはZodとRPC両方で扱い、fieldErrorsへ寄せる。
- 認証切れはログイン誘導、権限不足と存在しないIDは内部情報を出さない表示不可状態、通信失敗はretryableとして再試行導線を出す。
- 保存失敗時はReact Hook Formの入力をresetしない。
- RPCごとのエラー分類表が未作成なら、該当RPCとUI接続に着手しない。

## 11. UIと受け入れ基準の対応方針

### 11.1 UI実装順

UIは、対応するData Access/RPCが完了してから接続する。仮UIは作ってもよいが、業務データ保存、直接CRUD、完了扱いは禁止する。

1. A1: M1-04後
2. H1骨格: M1-05後。業務データ接続はM5後
3. L1/L2研究ライン: M2-12後
4. T1: M3-04後
5. T2基本: M3-04後。操作はM4後
6. T3: M5-01後
7. S1: M1 logout後。下書き管理はM6後

### 11.2 画面別traceability matrix

| 画面 | 主な受け入れ基準 | 関連タスク | 完了時の必須確認 |
|---|---|---|---|
| A1 | Magic Link、送信中/成功/失敗、認証切れ | M1-04 | サーバーcallbackなし、SNSログインなし |
| H1 | 最近の試行、研究ライン導線、空状態 | M5-02 | 公開/共有導線なし |
| L1 | 研究ライン一覧、試行数、最終試行日、空状態 | M2-13 | 本人データのみ、アーカイブ確認 |
| L2 | 研究ライン詳細、試行一覧、アーカイブ済み扱い | M2-13/M5-02 | archived lineの既存試行参照を壊さない |
| T1 | 試行入力、材料行、単位候補、保存失敗時入力保持 | M3-05/M6-02 | 保存はRPCのみ、写真/AI/customなし |
| T2 | 詳細、親試行、clone、star、soft delete | M3-06/M4-04 | cloneでstar非コピー、削除後表示不可 |
| T3 | 初期50件、追加50件、line/star/date filter | M5-02 | deleted/other user除外、日付境界確認 |
| S1 | logout、下書き管理 | M6-02 | 下書き破棄導線、共有端末リスク |

### 11.3 UI品質ゲート

- モバイル1カラムを優先する。
- ローディング、空状態、エラー、認証切れを画面ごとに持つ。
- アイコンのみのボタンにはaria-labelを付ける。
- 破壊的操作には確認を挟む。
- 任意色、任意影、過剰なカード入れ子を避け、デザイントークンに寄せる。
- 公開、共有、写真、AI、比較、系譜、カスタム項目の導線を置かない。

## 12. テスト戦略

### 12.1 段階別の必須検証

| 段階 | 必須検証 | 未実施時の扱い |
|---|---|---|
| M1 | static export、固定ルート、Auth Callback、env禁止値検索 | M2へ進む前に解消 |
| M2 | 4テーブルRLS、policy、grant/revoke、direct CRUD可否、A/B分離、anon拒否 | M3へ進めない |
| M3 | save RPC、direct CRUD拒否、部分保存なし、入力保持 | T1完了不可 |
| M4 | clone star非コピー、soft delete、star権限 | M5へ進めない |
| M5 | 履歴filter、date range、50件単位、他ユーザー/削除済み除外 | M7 E2E完了不可 |
| M6 | draft key、復元/破棄、共有端末リスク | S1完了不可 |
| M7 | unit/component/E2E/visual/performance/scope検索 | M8へ進めない |
| M8 | build/env/Redirect/backup/logging/final review | deploy不可 |

### 12.2 RLS/RPC重要仕様

- ユーザーAがユーザーBの全4業務テーブル行を参照/更新/削除できない。
- `trials` / `trial_ingredients` の直接insert/update/delete/upsertが失敗する。
- `save_trial_with_ingredients` 経由でのみ試行保存が成立する。
- `clone_trial` は材料行をコピーし、スターをコピーしない。
- `soft_delete_trial` 後、通常一覧、履歴、詳細、複製元候補から除外される。
- `trial_stars` は本人の未削除試行だけに付与/解除できる。
- 未認証では業務テーブルへアクセスできない。

### 12.3 未実施なら明示する運用

未実施検証は「未実施」と書く。理由、代替確認、残リスク、次に誰が確認するかを記録する。RLS/RPC/security definerに関する未実施は、原則として次マイルストーンへ進む理由にならない。

## 13. デプロイ/運用方針

- v1はCloudflare Pagesの静的Next.jsアプリである。
- API Routes、Server Actions、SSR、Pages Functions、Workers、サーバー側セッション管理を使わない。
- フロントenvは `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_APP_ORIGIN` に限定する。
- Auth Callbackは `/auth/callback/` の静的ページで処理する。
- ID付き画面は固定ルート + query parameter方式にする。
- PreviewはProductionデータと分離する。
- Supabaseバックアップ状況と手動エクスポート手順をM8までに確認する。
- 外部Analyticsを導入せず、ログに個人研究内容や認証情報を含めない。

## 14. リスク一覧

| リスク | 発生条件 | 影響 | 予防策 | 発生時の対処 |
|---|---|---|---|---|
| スコープ膨張 | 公開/写真/AI/比較等を便利だから入れる | v1価値がぶれ、RLS/DBが複雑化 | MVP Scope Contract最優先、禁止検索 | 実装停止、差分削除または設計変更レビュー |
| RLS不備 | RLS未検証、policy広すぎ | 他ユーザー研究ログ漏えい | M2で4テーブル検証完了を必須化 | 後続停止、policy修正、再検証 |
| 直接CRUD | Data AccessやUIがtrial系を直接write | 部分保存、不整合、RPC契約崩壊 | direct CRUD検索、権限拒否、RPCテスト | 直接経路削除、RPC統一 |
| security definer不備 | search_path/PUBLIC revoke/所有者確認漏れ | 権限事故 | human review gate、hardening checklist | 関数停止、権限修正、影響確認 |
| 巨大migration | DDL/RLS/grant/RPC混在 | rollback困難、レビュー漏れ | M2-00分割レビュー | migration分割や修正migrationへ戻す |
| 静的構成衝突 | 動的route/SSR/APIへ依存 | Cloudflare Pages前提崩壊 | M1でstatic export固定 | 設計文書更新まで停止 |
| AppError曖昧 | 生エラーをUIへ流す | 内部情報露出、UX不安定 | M1-03で契約固定 | エラー分類修正、表示テスト追加 |
| ログ漏えい | console/外部ログに本文やtoken | 個人研究内容漏えい | ログ禁止項目、Analytics不導入 | ログ削除、キー再確認 |
| 下書き露出 | 共有端末でlocalStorageに残る | 別人が閲覧 | 常時破棄導線、共有端末リスク表示 | 破棄導線修正、注意表示追加 |
| 日付ズレ | timezone未定のままfilter実装 | 履歴検索が不正確 | Q-05解消までT1/T3停止 | 方針決定、テスト追加 |
| テスト不足 | M7でまとめて確認 | 早期不備を見逃す | M2/M3/M4内で必須テスト | 該当マイルストーンへ戻す |
| ドキュメント乖離 | 実装都合で仕様変更 | 後続が誤実装 | 仕様変更時は文書更新先行 | 実装を戻すか文書レビュー |

## 15. 実装開始チェックリスト

- [ ] v1範囲内か。
- [ ] 対象文書を読んだか。
- [ ] 公開、共有、SNS、写真、AI、比較、系譜、カスタム項目、オフライン同期に触れていないか。
- [ ] 新ライブラリ追加が必要なら、理由、代替案、影響、v1必須性を提示したか。
- [ ] DB/RLS/RPC/security definerに触れる場合、human review gate対象になっているか。
- [ ] migrationは1論理変更に分かれているか。
- [ ] RLS、policy、grant/revoke、テスト、レビューがセットか。
- [ ] 4業務テーブルのRLS/権限/direct CRUD可否検証をM2内で完了しているか。
- [ ] `trials` / `trial_ingredients` の書き込みがRPC以外から成立しないか。
- [ ] UIからSupabase clientを直接importしていないか。
- [ ] AppResult/AppError契約に沿っているか。
- [ ] 保存失敗時に入力を保持するか。
- [ ] static export、固定ルート、query parameter方式を壊していないか。
- [ ] `service_role` や機密値をブラウザへ置いていないか。
- [ ] ログに材料名、メモ、認証情報、SQL、生エラーを出していないか。
- [ ] 実行できないテストを未実施として記録したか。

## 16. 推奨実装順の要約

最初にM0で、Supabase環境分離、RLS/RPC検証方式、human review gate、CI/手動テスト、作業記録先を固定する。次にM1で、静的Next.js骨格、Magic Link、Auth Callback、AppResult/AppError契約、最小UI基盤を作る。

業務領域はM2でDB/RLS基盤を先に通し切る。4業務テーブルすべてのRLS、権限、直接CRUD可否、A/B分離、anon拒否、human reviewが終わるまでM3へ進まない。

M3で `save_trial_with_ingredients` とT1/T2基本、M4で `clone_trial`、`soft_delete_trial`、スター、M5で履歴と絞り込み、M6で下書き、M7で受け入れ確認、M8でデプロイ前確認を行う。公開、共有、写真、AI、比較、系譜、カスタム項目、オフライン同期は最後まで触らない。

## 17. 改訂後の実装開始可否

結論: **要確認事項解消後に開始可**。

理由は、Critical 3件とMajor/Minorの監査指摘は計画上のタスク、ゲート、完了条件、対応表へ反映したが、M0で解消すべきQ-01、Q-02、Q-03、Q-09、Q-10が未解消のままでは、DB/RLS/RPCを安全に実装できないためである。

許可される最初の作業はM0のみである。M0の確認、レビュー運用、検証方式、作業記録先が確定するまで、M1以降の実装、特にM2以降のDB/RLS/RPC変更へ進んではならない。
