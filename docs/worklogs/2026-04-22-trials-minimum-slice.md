# Worklog: Trials minimum vertical slice

## 確認対象

- 今回の判断根拠: `ローカル作業ツリー`
- 公開 repo / 既定ブランチ確認: 作業開始時に `git fetch origin main --prune` を実行し、`HEAD` と `origin/main` が `95a2338b6ba41483cd290675db088028bc8055cb` で一致していることを確認した
- 作業名: `Trials minimum vertical slice`
- 日付: 2026-04-22
- 変更分類: UI / Data Access / DB/RLS/RPC / Docs / Test
- 完了運用分類: 大きなコード変更
- 分類理由: TrialsのDB migration、RLS、RPC、認可境界Data Access、固定ルートUI、研究ライン詳細接続、軽量検証を追加するため
- 変更対象:
  - Trials core DB: `trials`, `trial_ingredients`
  - Trials RPC: `save_trial_with_ingredients`, `soft_delete_trial`
  - Trials UI: `/trials/new/`, `/trials/edit/?id=...`, `/trials/detail/?id=...`, `/trials/history/`, `/research-lines/detail/?id=...`
  - L1補助表示: 試行数 / 最終試行日
- 危険変更workflow該当: あり。migration、RLS policy、grant/revoke、`security definer` helper/RPC、認可境界Data Accessを追加した
- 人間確認: 不要。v1スコープ変更、Production、secret、本番データ、外部契約、不可逆な本番操作には触れていない

## 正本

- 正本ファイル:
  - `AGENTS.md`
  - `docs/mvp-scope-contract.md`
  - `docs/app-rdd.md`
  - `docs/app-lld.md`
  - `docs/app-design.md`
  - `docs/screen-acceptance-criteria.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/deployment-contract.md`
  - `docs/implementation-plan-v1.md`
  - `docs/m0-readiness-gate.md`
  - `docs/m0-decision-matrix.md`
- 正本で固定した定義 / 正式項目 / 停止条件:
  - v1の主役は完成レシピではなく、研究ライン配下の試行ログ
  - ID付き画面は固定route + query parameter方式
  - 試行本体と材料行の作成・編集は `save_trial_with_ingredients` RPCに集約
  - 論理削除は `soft_delete_trial` RPCに集約し、hard deleteは提供しない
  - `trials` / `trial_ingredients` の直接 insert / update / delete / upsert はUI / Data Accessから行わない
  - `brewed_at` はv1では `Asia/Tokyo` のカレンダー日として扱い、date-only入力をJST 00:00のISO timestampへ変換して保存する
  - Trials系RPCの失敗理由は `CHAI_TRIAL_*` の安定識別子から `AppError` へ明示マッピングする
- 正本を先に修正した確認:
  - `docs/app-lld.md` に `brewed_at` のJSTカレンダー日方針と `CHAI_TRIAL_*` 識別子表を追加
  - `docs/supabase-data-access-error-contract.md` にData Access上のJST変換とRPC hint → AppError表を追加

## GitHub反映状況

- GitHubに反映済み: あり。今回の検証補完差分は `main` へpush済み
- 反映ブランチ: `main`
- 反映確認に使ったコミット識別情報: 完了報告時点の `origin/main` commit hashを提示する
- CI確認の要否判断: 必須。大きなコード変更かつDB/RLS/RPCを含む危険変更のため
- CI結果 / 未確認理由: GitHub Actions `Docs` workflowのsuccessを確認する。ローカルでは非本番DB検証と軽量確認を先行実施した

## 変更ファイル一覧

- `supabase/migrations/20260422090000_create_trials_core_tables.sql`: `trials`, `trial_ingredients` DDLとindexを追加
- `supabase/migrations/20260422091000_add_trials_ingredients_access_policies.sql`: RLS、helper、policy、grant/revokeを追加
- `supabase/migrations/20260422092000_add_save_trial_with_ingredients_rpc.sql`: `save_trial_with_ingredients` RPCを追加
- `supabase/migrations/20260422093000_add_soft_delete_trial_rpc.sql`: `soft_delete_trial` RPCを追加
- `supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.sql`: 再実行可能な非本番DB/RLS/RPC検証SQLを追加し、RPC編集、direct update/delete/upsert、cross-owner編集/削除拒否を補完
- `supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.md`: 実行結果メモを追加
- `src/lib/trials/data-access.ts`: Trials取得、詳細、保存、論理削除、研究ライン別試行統計を追加
- `src/lib/trials/data-access.test.ts`: JST日付変換、RPC呼び出し、AppError分類、直接write API非提供を確認
- `src/components/trials/trial-form-client.tsx`: 新規/編集フォームを追加
- `src/components/trials/trial-detail-client.tsx`: 詳細/編集導線/アーカイブ導線を追加
- `src/components/trials/trial-history-client.tsx`: 最小履歴一覧を追加
- `src/app/trials/new/page.tsx`, `src/app/trials/edit/page.tsx`, `src/app/trials/detail/page.tsx`, `src/app/trials/history/page.tsx`: placeholderから実画面へ接続
- `src/components/research-lines/research-line-detail-client.tsx`: L2に試行一覧、loading/empty/error、新規試行導線を追加
- `src/components/research-lines/research-lines-list-client.tsx`: L1に試行数 / 最終試行日を表示
- `src/components/research-lines/research-lines-list-client.test.tsx`: L1試行統計表示のmockを追加
- `docs/app-lld.md`, `docs/supabase-data-access-error-contract.md`: JST日付とRPC error mapping前提を明文化

## 整合確認の証拠

- 新しい解釈が存在する検索:
  - `rg -n "CHAI_TRIAL|Asia/Tokyo|save_trial_with_ingredients|soft_delete_trial|TrialFormClient|TrialDetailClient|TrialHistoryClient" docs src supabase`
- 旧解釈が消えた検索:
  - `rg -n "ProtectedFoundationPage title=\"試行" src/app/trials`
- docs-only / 影響差分の確認:
  - `git diff -- docs/app-lld.md docs/supabase-data-access-error-contract.md`
  - `git diff -- src/lib/trials/data-access.ts src/components/trials src/components/research-lines src/app/trials`

## 実行コマンドと結果

| コマンド                                                                                                                                                                                                 | 用途                               | 結果                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `git status --short --branch`                                                                                                                                                                            | 未完了編集確認                     | 成功。未追跡のTrials関連ファイルを確認                                                          |
| `git fetch origin main --prune`                                                                                                                                                                          | 最新 `origin/main` 取得            | 成功。開始時 `HEAD` / `origin/main` は `95a2338b6ba41483cd290675db088028bc8055cb`               |
| `npx prettier --write ...`                                                                                                                                                                               | 変更ファイル整形                   | 成功                                                                                            |
| `npm run test -- src/lib/trials/data-access.test.ts src/components/research-lines/research-lines-list-client.test.tsx`                                                                                   | 関連unit/component test            | 成功。2 files / 8 tests passed                                                                  |
| `npm run test`                                                                                                                                                                                           | 全unit/component test              | 成功。5 files / 26 tests passed                                                                 |
| `npm run typecheck`                                                                                                                                                                                      | 型確認                             | 成功                                                                                            |
| `npx eslint ...`                                                                                                                                                                                         | 変更ファイル中心lint               | 成功                                                                                            |
| `npm run check:docs`                                                                                                                                                                                     | 運用文書確認                       | 成功。Operational docs check passed                                                             |
| `npm install --no-save --no-package-lock @electric-sql/pglite`                                                                                                                                           | one-shot PGlite検証runtimeの準備    | 成功。`package.json` / `package-lock.json` は保存変更なし                                       |
| `node supabase/verification/scripts/run-pglite-verification.mjs --query "select sort_order, check_key, passed, expected, observed, sqlstate, hint from pg_temp.trials_minimum_slice_verification_results order by sort_order" ...` | 非本番DB/RLS/RPC検証               | 成功。21 checksすべてpass。詳細は `supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.md` |
| `rg -n -g '!docs/**' -g '!README.md' 'SUPABASE_SERVICE_ROLE_KEY\|service_role\|DB_CONNECTION\|DATABASE_URL\|OPENAI_API_KEY\|R2_\|STORAGE_' .`                                                            | secret / service role混入確認      | 0件                                                                                             |
| `rg -n -g '!docs/**' -g '!README.md' 'from\\([''\\\"]trials[''\\\"]\\)\\.(insert\|update\|upsert\|delete)\|from\\([''\\\"]trial_ingredients[''\\\"]\\)\\.(insert\|update\|upsert\|delete)' .`            | Trials系direct table write混入確認 | 0件                                                                                             |
| `rg --files -g '!docs/**' -g '!README.md' \| rg '(^\|/)(pages/api\|app/api\|functions)(/\|$)'`                                                                                                           | API Routes / Functions混入確認     | 0件                                                                                             |
| `rg --files -g '!docs/**' -g '!README.md' \| rg '\\[[^/]+\\]'`                                                                                                                                           | 動的route混入確認                  | 0件                                                                                             |
| `rg -n -g '!docs/**' -g '!README.md' -g '!package-lock.json' -g '!supabase/verification/**' 'public_slug\|share_token\|visibility\|follow\|comment\|reaction\|photo\|storage\|AI提案\|compare\|graph' .` | v1対象外導線の混入確認             | 0件                                                                                             |

## 完了判断

- 完了扱いにできる理由:
  - Research Line詳細から、その研究ライン配下のTrials一覧と新規作成へ到達できる
  - `/trials/new/` と `/trials/edit/?id=...` で最小必須項目を入力し、`save_trial_with_ingredients` RPC経由で保存する
  - `/trials/detail/?id=...` で詳細確認、編集、`soft_delete_trial` RPC経由のアーカイブができる
  - `/trials/history/` で最新順の最小履歴を確認できる
  - UIからSupabase Clientを直接呼ばず、Trials系table writeを直接行わない
  - `brewed_at` はJST日付にそろえ、RPC hintはData AccessでAppErrorへ分類する
  - one-shot local PGlite非本番runtimeで、Trial最小縦切りのRLS / grant / RPC境界21 checksがすべてpassした
- worklogに記録した成立済み事項:
  - DB/RLS/RPC危険変更の対象、権限境界、grant/revoke、非本番検証結果
  - 軽量ローカル検証とscope混入確認
- あえて未解消として残した事項:
  - `clone_trial`、スター、下書き、日付範囲検索、T3フィルタは今回広げていない
  - 実Supabase projectへの同一SQL再実行は、DB接続情報とCLI/psqlがないため未実施
  - Playwright、full buildは低負荷方針に従い未実施

## 大きなコード変更 / 危険変更でのみ必須の追加項目

- 適用フェーズ / 適用範囲: v1 M3相当のTrials最小縦切り。ただしM4以降の複製、スター、下書き、履歴フィルタは対象外
- 影響レイヤー: UI / Data Access / DB/RLS/RPC / Docs / Test

## 採用方針

- 採用した方針:
  - 研究ライン配下で、試行の一覧、作成、詳細、編集、アーカイブだけを最小導線としてつなぐ
  - DBは `trials` と `trial_ingredients` を追加し、直接writeを許可せずRPCに保存/論理削除を集約する
  - `brewed_at` はM0 Q-05の安全側仮決定どおりJSTカレンダー日で扱う
  - RPCは `CHAI_TRIAL_*` hintを返し、Data AccessがAppErrorへ変換する
  - L1の試行数 / 最終試行日は、未削除試行の軽量selectで出せる範囲だけ表示する
- 優先軸: 現行フェーズ整合、安全性、単純性、監査可能性、低負荷検証
- 根拠文書:
  - `docs/mvp-scope-contract.md`
  - `docs/app-rdd.md`
  - `docs/app-lld.md`
  - `docs/app-design.md`
  - `docs/screen-acceptance-criteria.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/deployment-contract.md`
  - `docs/m0-decision-matrix.md`
- 退けた代替案:
  - 動的routeを追加する案は静的export契約と衝突するため退けた
  - UIまたはData Accessから `trials` / `trial_ingredients` を直接insert/update/deleteする案は契約違反のため退けた
  - `clone_trial`、スター、下書き、日付範囲検索まで同時に入れる案は今回の「最小記録・編集・アーカイブ」から広がるため退けた
  - completed recipe / recipe app寄りの入力項目追加は、試行ログ中心のv1スコープから外れるため退けた

## 変更内容

- 追加:
  - Trials core table migration
  - Trials / trial_ingredients RLS and select-only table grants
  - `save_trial_with_ingredients` RPC
  - `soft_delete_trial` RPC
  - Trials Data Access
  - T1/T2/T3最小UI
  - DB/RLS/RPC verification SQL
- 更新:
  - L2研究ライン詳細に配下Trials一覧と新規試行導線を追加
  - L1研究ライン一覧に試行数 / 最終試行日を追加
  - `brewed_at` とRPC error mappingの契約文書を更新
- 削除: なし
- 更新した文書:
  - `docs/app-lld.md`
  - `docs/supabase-data-access-error-contract.md`
  - `supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.md`
  - `docs/worklogs/2026-04-22-trials-minimum-slice.md`

## 正本ファイルの証拠抜粋

- `docs/mvp-scope-contract.md`: MVP-03は試行作成・編集・論理削除を含み、試行本体と材料行は定義済みRPCに集約する
- `docs/app-lld.md`: `save_trial_with_ingredients` は試行本体と材料行を1トランザクションで保存し、材料行は全置換する
- `docs/db-migration-rls-policy.md`: `trials` / `trial_ingredients` はselectのみ直接許可し、insert/update/deleteはRPCへ集約する
- `docs/supabase-data-access-error-contract.md`: Data AccessはAppResult/AppErrorに正規化し、Supabase生エラーをUIへ出さない
- `docs/deployment-contract.md`: `/trials/detail?id=...`、`/trials/edit?id=...` の固定route + query parameter方式を許可する

## 未実施検証 / 停止条件

| 未実施項目                                       | 理由                                                                         | 代替確認                                                                                                                                      | 残リスク                                                   | 次に止める条件                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| 実Supabase projectでの同一SQL再実行              | repo/envには公開Supabase URL/anon keyのみがあり、DB接続文字列、Supabase CLI、`psql` がないため | one-shot local PGlite非本番runtimeで `supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.sql` を実行し21 checks pass | Supabase実runtime固有のgrant/RLS/RPC差分は残る             | 実Supabase project接続、本番deploy、M4以降のRPC依存機能を完了扱いにする前 |
| Playwright / viewport確認                        | 今回は重いE2Eを常用しない指示があるため                                      | component/unit test、typecheck、target eslint、固定route/dynamic route検索                                                                    | 390x844 / 1280x800での視覚崩れは未確認                     | M7画面受け入れ確認時                                                   |
| full build                                       | 低負荷方針に従い今回は実施しない                                             | typecheck、target eslint、API Routes / dynamic route検索                                                                                      | Next static export固有の差異は残る                         | M8 static build確認、deploy経路変更時                                  |
| GitHub Actions CI                                | push前のため未確認                                                           | ローカル軽量確認を先行                                                                                                                        | リモートCI固有の失敗は残る                                 | push後にCIを確認し、失敗した場合は修正する                             |
| `clone_trial` / trial_stars / draft / T3 filters | 今回の依頼は最小記録・編集・アーカイブで、比較・複製などを広げない前提のため | v1スコープ上の後続タスクとして未実装を明記                                                                                                    | v1全体完了条件はまだ満たさない                             | M4/M5/M6を完了扱いにする前                                             |

## 人間確認

- 質問: なし
- 回答: N/A

## DB / RLS / RPC 専用追記事項

- 対象単位:
  - `public.trials`
  - `public.trial_ingredients`
  - `public.is_own_active_trial(uuid)`
  - `public.save_trial_with_ingredients(jsonb)`
  - `public.soft_delete_trial(uuid)`
- 参照したSQL / 手順書 / 証跡ファイル:
  - `supabase/migrations/20260422090000_create_trials_core_tables.sql`
  - `supabase/migrations/20260422091000_add_trials_ingredients_access_policies.sql`
  - `supabase/migrations/20260422092000_add_save_trial_with_ingredients_rpc.sql`
  - `supabase/migrations/20260422093000_add_soft_delete_trial_rpc.sql`
  - `supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.sql`
- N/Aにした検証観点と理由:
  - `trial_stars`: 今回はスター導線を広げないため未作成。M4相当で別途扱う
  - `clone_trial`: 今回は複製導線を広げないため未作成。M4相当で別途扱う
- 権限境界 / role:
  - `anon`: `trials`, `trial_ingredients` へのtable grantなし。RPC executeなし
  - `authenticated`: `trials`, `trial_ingredients` はselectのみ。Trials系RPCはexecuteのみ
  - `PUBLIC`: Trials helper/RPCのexecuteをrevoke
- RLS / policy matrix:
  - `trials_select_own_active`: `authenticated` selectのみ。`user_id = auth.uid()` かつ `deleted_at IS NULL`
  - `trial_ingredients_select_own_active_trial`: `authenticated` selectのみ。親 `trials` が本人未削除であることを `is_own_active_trial(trial_id)` で確認
- grant / revoke:
  - `REVOKE ALL ON public.trials, public.trial_ingredients FROM public, anon, authenticated`
  - `GRANT SELECT ON public.trials, public.trial_ingredients TO authenticated`
  - `REVOKE ALL ON FUNCTION ... FROM public`
  - `GRANT EXECUTE ON FUNCTION ... TO authenticated`
- direct CRUD拒否確認:
  - アプリコード検索で `trials` / `trial_ingredients` の直接insert/update/upsert/deleteは0件
  - SQL検証で `trials` / `trial_ingredients` の直接insert/update/delete/upsertがすべて `42501` で拒否されることを確認
- `security definer` hardening:
  - `is_own_active_trial`, `save_trial_with_ingredients`, `soft_delete_trial` は `security definer`
  - `set search_path = public, pg_temp`
  - RPC内部で `auth.uid()` と所有者を照合
  - PUBLIC execute revoke、authenticated execute grant
- AppError分類 / 失敗時挙動:
  - `CHAI_TRIAL_AUTH_REQUIRED` → `AUTH_REQUIRED`
  - `CHAI_TRIAL_FORBIDDEN` → `FORBIDDEN`
  - `CHAI_TRIAL_NOT_FOUND` → `NOT_FOUND`
  - `CHAI_TRIAL_VALIDATION` → `VALIDATION_ERROR`
  - `CHAI_TRIAL_CONFLICT` → `CONFLICT`
  - 未知のSupabase/PostgREST失敗は `SERVER_ERROR` または既存SQLSTATE分類へ正規化
