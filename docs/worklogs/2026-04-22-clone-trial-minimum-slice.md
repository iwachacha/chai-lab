# clone_trial minimum slice worklog

## 確認対象

- 今回の判断根拠: `ローカル作業ツリー`
- 公開 repo / 既定ブランチ確認: push後に確認する
- 作業名: M4 clone_trial minimum vertical slice
- 日付: 2026-04-22
- 変更分類: DB/RLS/RPC / Data Access / UI / Docs / Test
- 完了運用分類: 大きなコード変更
- 分類理由: migration、`security definer` RPC、grant、認可境界Data Access、Trial詳細UI、verificationを横断するため
- 変更対象: `clone_trial` RPC、Trials Data Access、Trial詳細の複製導線、clone verification、関連docs
- 危険変更workflow該当: あり
- 人間確認: 不要

## 正本

- 正本ファイル:
  - `docs/mvp-scope-contract.md`
  - `docs/app-lld.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/screen-acceptance-criteria.md`
  - `supabase/migrations/20260422100000_add_clone_trial_rpc.sql`
  - `supabase/verification/runs/2026-04-22-clone-trial-verification.sql`
- 正本で固定した定義 / 正式項目 / 停止条件:
  - clone は本人の active Trial だけを対象にする
  - clone 結果は新しい Trial として作成し、`parent_trial_id` に元Trial IDを保存する
  - cross-owner / missing / soft-deleted source / archived research line source は `CHAI_TRIAL_NOT_FOUND` に統一する
  - `trials` / `trial_ingredients` の直接書き込みは追加しない
  - `trial_stars` には着手しない
- 正本を先に修正した確認:
  - migrationとverification SQLを先に追加し、PGliteで成功確認後にData Access / UIへ接続した

## GitHub反映状況

- GitHubに反映済み: はい
- 反映ブランチ: `main`
- 反映確認に使ったコミット識別情報: `f550af4c8249cd993898365cd04f308857fd3061` (`Implement clone trial vertical slice`)
- CI確認の要否判断: 大きなコード変更かつ依頼者がActions確認を求めているため、push後に確認する
- CI結果 / 未確認理由: GitHub connectorで `f550af4c8249cd993898365cd04f308857fd3061` の workflow runs と combined statuses を確認し、どちらも空。確認可能なActionsは見つからなかったため、ローカル検証結果を正式な完了根拠とする

## 変更ファイル一覧

- `supabase/migrations/20260422100000_add_clone_trial_rpc.sql`
- `supabase/verification/runs/2026-04-22-clone-trial-verification.sql`
- `supabase/verification/runs/2026-04-22-clone-trial-verification.md`
- `src/lib/trials/data-access.ts`
- `src/lib/trials/data-access.test.ts`
- `src/components/trials/trial-detail-client.tsx`
- `docs/app-lld.md`
- `docs/supabase-data-access-error-contract.md`
- `docs/worklogs/2026-04-22-clone-trial-minimum-slice.md`

## 整合確認の証拠

- 新しい解釈が存在する検索:
  - `rg -n "clone_trial|cloneTrial|CHAI_TRIAL_NOT_FOUND|parent_trial_id" src supabase docs`
- 旧解釈が消えた検索:
  - `docs/supabase-data-access-error-contract.md` の `clone_trial` 失敗分類から cross-owner `FORBIDDEN` と archived `CONFLICT` を外し、`NOT_FOUND` 統一へ更新
- docs-only / 影響差分の確認:
  - `docs/app-lld.md` と `docs/supabase-data-access-error-contract.md` に clone仕様、非本番verification、存在漏洩しない失敗表現を記録

## 実行コマンドと結果

| コマンド | 用途 | 結果 |
|---|---|---|
| `node supabase/verification/scripts/run-pglite-verification.mjs --query "select sort_order, check_key, passed, expected, observed, sqlstate, hint from pg_temp.clone_trial_verification_results order by sort_order" ... supabase/verification/runs/2026-04-22-clone-trial-verification.sql` | clone_trial DB/RLS/RPC verification | pass。全17 probeが `passed: true` |
| `npm run test -- src/lib/trials/data-access.test.ts` | Trials Data Access対象test | pass。1 file / 7 tests |
| `npm run test` | 変更範囲を含むVitest全体 | pass。5 files / 28 tests |
| `npm run typecheck` | TypeScript確認 | pass |
| `npm run lint` | ESLint確認 | pass |
| `npm run check:docs` | docs整合確認 | pass。Operational docs check passed (37 markdown files) |
| `rg -n -g "!docs/**" -g "!README.md" "SUPABASE_SERVICE_ROLE_KEY\|service_role\|DB_CONNECTION\|DATABASE_URL\|OPENAI_API_KEY\|R2_\|STORAGE_" .` | secret / service role混入確認 | pass。該当なし |
| `rg -n -g "!docs/**" -g "!README.md" 'from\([''"]trials[''"]\)\.(insert\|update\|upsert\|delete)\|from\([''"]trial_ingredients[''"]\)\.(insert\|update\|upsert\|delete)' .` | Trials direct table write検索 | pass。該当なし |
| `rg --files -g "!docs/**" -g "!README.md" \| rg "(^\|/)(pages/api\|app/api\|functions)(/\|$)"` | API Routes / Functions混入確認 | pass。該当なし |
| `rg --files -g "!docs/**" -g "!README.md" \| rg "\[[^/]+\]"` | 動的route混入確認 | pass。該当なし |
| `rg -n -g "!docs/**" -g "!README.md" "public_slug\|share_token\|visibility\|follow\|comment\|reaction\|photo\|storage\|AI提案\|compare\|graph" .` | v1対象外キーワード検索 | false positiveのみ。`package-lock.json` の依存名と verification template comment に限定 |
| `git diff --check` | whitespace確認 | pass。CRLF warningのみ |
| `git push origin main` | GitHub反映 | pass。`492fbfa..f550af4 main -> main` |
| GitHub connector `_fetch_commit_workflow_runs` / `_get_commit_combined_status` | Actions / status確認 | workflow runs `[]`、statuses `[]` |

## 完了判断

- 完了扱いにできる理由:
  - owner active clone、材料行コピー、`parent_trial_id` 保存、非owner / missing / archived source拒否、direct table write拒否、select-only grant、function grantをPGliteで確認済み
  - Data Accessは `clone_trial` RPC呼び出しだけを追加し、`trials` / `trial_ingredients` のdirect writeを追加していない
  - Trial詳細UIから複製して編集画面へ遷移できる導線を追加した
- worklogに記録した成立済み事項:
  - `parent_trial_id` を派生元参照の最小構造として使う
  - `trial_stars` は今回非対象
  - cross-owner / archived / missing の失敗表現を `NOT_FOUND` へ統一
- あえて未解消として残した事項:
  - 実Supabase project runtime差は未確認。実環境接続時に同じverification SQLを再実行する
  - Playwright / full build は今回の依頼で不要と判断し未実施

## 大きなコード変更 / 危険変更でのみ必須の追加項目

- 適用フェーズ / 適用範囲: M4最初の危険変更、`clone_trial` 最小縦切り
- 影響レイヤー: DB/RLS/RPC、Data Access、UI、Docs、Test

## 採用方針

- 採用した方針:
  - 既存 `trials.parent_trial_id` を派生元参照として使用し、追加schemaは作らない
  - cloneは即DB作成し、成功後に `/trials/edit/?id=<new_id>` へ遷移する
  - `source_trial_id` は本人の未削除Trialかつ未アーカイブ研究ライン配下に限定する
  - cross-owner / missing / soft-deleted source / archived line source は `CHAI_TRIAL_NOT_FOUND` に統一する
- 優先軸:
  - 現行フェーズ整合、安全性、単純性、監査可能性
- 根拠文書:
  - `docs/mvp-scope-contract.md`
  - `docs/app-lld.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/screen-acceptance-criteria.md`
  - `docs/implementation-plan-v1.md`
- 退けた代替案:
  - JSONBで派生元を残す案は、構造化された比較・派生追跡を壊すため不採用
  - clone専用tableや系譜graphを作る案は、v1の最小派生元リンクを超えるため不採用
  - archived / cross-owner / missing を別AppErrorに分ける案は、存在漏洩につながるため不採用
  - `trial_stars` を同時に実装する案は、今回の明示範囲外のため不採用

## 変更内容

- 追加:
  - `clone_trial(source_trial_id uuid)` RPC
  - clone専用PGlite verification SQL / summary
  - Trials Data Access `cloneTrial`
  - Trial詳細UIの「複製して編集」導線
- 更新:
  - Data Access unit test
  - clone仕様とerror contract docs
- 削除:
  - なし
- 更新した文書:
  - `docs/app-lld.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/worklogs/2026-04-22-clone-trial-minimum-slice.md`

## 正本ファイルの証拠抜粋

- `docs/mvp-scope-contract.md`: MVP-05 は「自分の過去試行を複製し、新しい試行の `parent_trial_id` に元試行IDを保存できる」
- `docs/app-lld.md`: `clone_trial` は材料行をコピーし、新しい試行の `parent_trial_id` に元試行IDを設定し、`trial_stars` はコピーしない
- `docs/supabase-data-access-error-contract.md`: cross-owner / archived / missing は `CHAI_TRIAL_NOT_FOUND` に統一する

## 未実施検証 / 停止条件

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| 実Supabase projectでのverification | 実環境接続は今回のローカル危険変更範囲外 | PGlite one-shot harnessで同一SQLを実行 | Supabase runtime固有差 | 実Supabase接続やdeploy完了扱いにする前 |
| Playwright | 依頼で重い常駐検証不要、今回は既存詳細画面への小さな導線追加 | typecheck / lint / UI差分レビュー | 実ブラウザの見た目崩れ | M7 E2E完了扱いにする前 |
| full build | 依頼でfull build不要、static/deploy経路は変更なし | typecheck / lint | Next build固有差 | deploy前またはM8 static build時 |

## 人間確認

- 質問: なし
- 回答: なし

## DB / RLS / RPC 専用追記事項

- 対象単位:
  - `public.clone_trial(uuid)`
- 参照したSQL / 手順書 / 証跡ファイル:
  - `supabase/migrations/20260422100000_add_clone_trial_rpc.sql`
  - `supabase/verification/runs/2026-04-22-clone-trial-verification.sql`
  - `supabase/verification/runs/2026-04-22-clone-trial-verification.md`
- N/Aにした検証観点と理由:
  - `trial_stars`: 今回は明示的に着手しないためN/A
  - star非コピー: star table未導入かつ今回非対象のため、RPCが `trial_stars` を参照しないことを差分で確認する
- 権限境界 / role:
  - `authenticated`: `clone_trial` execute可、`trials` / `trial_ingredients` はselect-only
  - `anon` / `public`: `clone_trial` execute不可、Trial系table grantなし
- RLS / policy matrix:
  - `trials`: `trials_select_own_active` のみ
  - `trial_ingredients`: `trial_ingredients_select_own_active_trial` のみ
  - clone writeはtable policyを増やさず、`security definer` RPC内部のowner確認に閉じる
- grant / revoke:
  - `revoke all on function public.clone_trial(uuid) from public`
  - `grant execute on function public.clone_trial(uuid) to authenticated`
- direct CRUD拒否確認:
  - PGlite verificationで `trials` insert/update と `trial_ingredients` delete が `42501` 拒否
  - Supabase client経由の `trials` / `trial_ingredients` direct write検索は該当なし
- `security definer` hardening:
  - `security definer`
  - `set search_path = public, pg_temp`
  - `auth.uid()` 必須
  - owner active Trial + active research line確認
  - PUBLIC revoke / authenticated grant
- AppError分類 / 失敗時挙動:
  - `CHAI_TRIAL_AUTH_REQUIRED` -> `AUTH_REQUIRED`
  - `CHAI_TRIAL_VALIDATION` -> `VALIDATION_ERROR`
  - `CHAI_TRIAL_NOT_FOUND` -> `NOT_FOUND`
  - cross-owner / missing / soft-deleted source / archived line sourceは `CHAI_TRIAL_NOT_FOUND`
