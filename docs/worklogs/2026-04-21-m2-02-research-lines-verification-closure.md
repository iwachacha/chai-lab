# Worklog: M2-02 research_lines verification closure

## 確認対象

- 今回の判断根拠: `公開 repo / 既定ブランチ`
- 作業開始時点の基準コミット: `8b583f2`
- 公開 repo / 既定ブランチ確認: latest confirmed anchor は `8b583f2`。作業開始時点の `origin/main` head は `4ec6ee4` で、`0bb3268` / `529eb0e` / `a92faff` / `4ec6ee4` により M2-02 叩き台は既に公開済みだった。今回はその状態を基準に、`research_lines` slice の verification checklist 未充足と再実行手順の曖昧さを閉じる補完を行った
- 作業名: `M2-02 research_lines verification closure`
- 日付: 2026-04-21
- 変更分類: DB / RLS / Docs / Test
- 完了運用分類: 大きなコード変更
- 分類理由: migration自体は既存実装を維持したまま、M2-02 の完了条件である non-production verification target、actor切替手順、slice-specific checklist、再実行可能な補助証跡を更新したため
- 変更対象:
  - `supabase/verification/README.md`
  - `supabase/verification/m2-db-verification-checklist.md`
  - `supabase/verification/scripts/run-pglite-verification.mjs`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`
  - `docs/worklogs/2026-04-21-m2-02-research-lines-verification-closure.md`
- 危険変更workflow該当: あり。対象単位は DB / RLS slice の完了証跡と検証手順であり、migration / policy / grant の成立確認に直接関わる
- 人間確認: 不要。v1スコープ変更、Production、secret、本番データには触れていない

## 正本

- 正本ファイル:
  - `AGENTS.md`
  - `docs/implementation-plan-v1.md`
  - `docs/app-lld.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/agent-workflow.md`
  - `docs/codex-execution-rules.md`
- 正本で固定した定義 / 正式項目 / 停止条件:
  - M2-02 は `research_lines` の最初の end-to-end DB slice であり、DDLだけで完了扱いにしない
  - `research_lines` slice の実migrationは `20260420103000_create_research_lines_table.sql` と `20260420104000_add_research_lines_access_policies.sql` の2本で閉じる
  - M2-02の必須観点は trim保存境界、trim後重複禁止、archive後再利用、A/B分離、anon拒否、physical delete不可、本人select / insert / update成功
  - M2-02へは非本番検証先と actor A / B / anon 切替方法が固定されるまで進まない
- 正本を先に修正した確認: 正本の解釈は既に一致していたため今回の差分では変更していない。`AGENTS.md` と上記正本を再読し、解釈が変わらないことを確認したうえで、関連文書 / 補助証跡 / worklog の順で更新した

## GitHub反映状況

- GitHubに反映済み: あり。verification 資産本体は `e7e2cd3` で `origin/codex/m2-02-research-lines-verification-closure` への反映を確認した
- 反映ブランチ: `codex/m2-02-research-lines-verification-closure`
- 反映確認に使ったコミット識別情報: `e7e2cd3`
- CI確認の要否判断: 不要。今回の差分は app runtime、workflow、package script、deploy経路を変えず、local verification command と `npm run check:docs` で成立確認できるため
- CI結果 / 未確認理由: 未確認。上記要否判断による

## 変更ファイル一覧

- `supabase/verification/README.md`: `research_lines` slice で固定する non-production verification target と rerun command を追加
- `supabase/verification/m2-db-verification-checklist.md`: `research_lines` slice 向けに対象情報、N/A理由、実施済みチェックを埋めた
- `supabase/verification/scripts/run-pglite-verification.mjs`: local `@electric-sql/pglite` 上で harness / migration / probe SQL を順に実行する runner を追加
- `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql`: expected-failure を途中停止なしで記録できる structured probe SQL を追加
- `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`: fixed rerun command と実行結果を補助証跡として追加
- `docs/worklogs/2026-04-21-m2-02-research-lines-verification-closure.md`: 今回の completion delta を正式記録として追加

## 適用フェーズ / 影響レイヤー

- 適用フェーズ / 適用範囲: v1 M2-02 `research_lines` verification closure
- 影響レイヤー: DB/RLS/RPC, Docs, Test

## 採用方針

- 採用した方針:
  - 既存の `research_lines` migration pair は変更せず、M2-02 の不足があった verification 資産だけを補完する
  - 実際に使う non-production verification target は local one-shot `@electric-sql/pglite` に固定し、repo内の runner script から再実行可能にする
  - checklist は汎用テンプレートのまま残さず、M2-02 `research_lines` slice の current application を埋めて証跡化する
  - expected-failure を structured result table へ記録する probe SQL にして、trim / A-B / anon / delete / N/A理由を一度の実行結果で追えるようにする
- 優先軸: 現行フェーズ整合、安全性、監査可能性、単純性、可逆性
- 根拠文書:
  - `docs/implementation-plan-v1.md`
  - `docs/app-lld.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/agent-workflow.md`
  - `docs/codex-execution-rules.md`
- 退けた代替案:
  - 既存 migration を作り直す案は、DB仕様自体の変更が不要で review面積だけ増やすため退けた
  - `Supabase CLI` / Docker 前提で local target を固定する案は、現環境に `psql` と `supabase` CLI がなく再実行性をむしろ下げるため退けた
  - blank template の checklist を維持したまま worklog だけで埋める案は、ユーザー要求の「`m2-db-verification-checklist.md` を今回の slice 向けに埋める」を満たさないため退けた

## 変更内容

- 追加:
  - `supabase/verification/scripts/run-pglite-verification.mjs`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`
  - `docs/worklogs/2026-04-21-m2-02-research-lines-verification-closure.md`
- 更新:
  - `supabase/verification/README.md`
  - `supabase/verification/m2-db-verification-checklist.md`
- 削除: なし
- 更新した文書: `supabase/verification/README.md`, `supabase/verification/m2-db-verification-checklist.md`
- 既存migrationの対象単位:
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`: `research_lines` の table DDL、trim保存制約、active unique index を追加する論理変更
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`: `research_lines` の RLS enable、owner policy、grant/revoke を追加する論理変更

## 正本ファイルの証拠抜粋

- `docs/implementation-plan-v1.md`: M2-02 は `research_lines` の DDL、trim保存制約、未アーカイブ一意制約、RLS enable、本人select / insert / update policy、delete非許可、grant/revoke、trim重複とarchive後挙動の検証を1単位として扱う
- `docs/app-lld.md`: `research_lines` は `title = btrim(title)` をDB制約で担保し、owner の `select / insert / update` だけを許可し、物理削除は行わない
- `docs/db-migration-rls-policy.md`: `research_lines` は owner 判定を `user_id = auth.uid()` に置き、anon に業務データを許可せず、delete policyを作らない

## 整合確認の証拠

- 新しい解釈が存在する検索:
  - `rg -n "run-pglite-verification|2026-04-21-m2-02-research-lines-verification|one-shot local|research_lines slice" supabase docs -g "*.md" -g "*.sql" -g "*.mjs"`
- 旧解釈が消えた検索:
  - `rg -n "対象単位:$|sliceの目的:$|非本番検証先:$|Actor切替方法:$" supabase/verification/m2-db-verification-checklist.md`
- docs-only / 影響差分の確認:
  - `git diff -- supabase/verification/README.md supabase/verification/m2-db-verification-checklist.md supabase/verification/scripts/run-pglite-verification.mjs supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md docs/worklogs/2026-04-21-m2-02-research-lines-verification-closure.md`

## 実行コマンドと結果

| コマンド | 用途 | 結果 |
|---|---|---|
| `npx -y -p @electric-sql/pglite node supabase/verification/scripts/run-pglite-verification.mjs --query "select sort_order, check_key, passed, expected, observed, sqlstate from pg_temp.research_lines_verification_results order by sort_order" supabase/verification/sql/local-db-auth-harness.sql supabase/migrations/20260420103000_create_research_lines_table.sql supabase/migrations/20260420104000_add_research_lines_access_policies.sql supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql` | fixed local targetで `research_lines` slice を再実行し、構造確認 / owner success / A-B分離 / anon拒否 / trim境界 / duplicate / delete / N/Aを一括確認 | 成功。16 checks すべて pass。詳細は `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md` |
| `npm run check:docs` | markdown / worklog / verification asset 整合確認 | 成功 |
| `git push -u origin codex/m2-02-research-lines-verification-closure` | verification 資産 commit の GitHub反映確認 | 成功。`e7e2cd3` を `origin/codex/m2-02-research-lines-verification-closure` で確認 |

## 未実施検証 / 停止条件

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| 実Supabase local / 分離Previewへの同一 probe SQL 再実行 | 現環境に `psql` と `supabase` CLI がなく、今回の固定 target は local one-shot `@electric-sql/pglite` だから | scratch runtime上で harness、migration、RLS、grant/revoke、expected failures を一括実行した | `auth.users` と `gen_random_uuid()` は harness stub のため、実Supabase runtimeとの差分余地が残る | 実Supabase runtimeを使う後続 task で同じ probe SQL を再実行できない場合は、その remote依存 task を止める |
| `research_lines` Data Access / UI接続 | M2-10以降の後続 task であり今回の scope外だから | DB slice として owner success / reject path / archive reuse / delete不可まで閉じた | Data Access側で trim / archive 条件を崩す余地は残る | M2-10以降で DB制約と異なる trim / archive 解釈が出た時点で止める |
| M2全体の `trials` / `trial_ingredients` / `trial_stars` | M2-02の対象外だから | `research_lines` slice の前提と検証方式を固定した | M2全体完了ではない | 後続 table で A/B分離・anon拒否・必要な direct CRUD境界が閉じない場合は M3へ進めない |

## DB / RLS / RPC 専用追記事項

- 対象単位: `research_lines` DDL / active unique / RLS / grant / verification closure
- 参照したSQL / 手順書 / 証跡ファイル:
  - `supabase/verification/README.md`
  - `supabase/verification/m2-db-verification-checklist.md`
  - `supabase/verification/sql/local-db-auth-harness.sql`
  - `supabase/verification/scripts/run-pglite-verification.mjs`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`
- N/Aにした検証観点と理由:
  - `deleted_at IS NULL` 通常取得除外: `research_lines` は `deleted_at` を持たず、active trial前提にも依存しないため
  - direct CRUD全面拒否: owner direct `insert / update` は v1契約で許可されるため。ただし physical delete不可は実施
- 権限境界 / role:
  - `authenticated`: `SELECT`, `INSERT`, `UPDATE`
  - `anon`: grantなし
  - `public`: grantなし
- RLS / policy matrix:
  - `SELECT`: `user_id = auth.uid()`
  - `INSERT`: `WITH CHECK (user_id = auth.uid())`
  - `UPDATE`: `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
  - `DELETE`: policyなし
- grant / revoke:
  - `REVOKE ALL ON TABLE public.research_lines FROM public, anon, authenticated`
  - `GRANT SELECT, INSERT, UPDATE ON TABLE public.research_lines TO authenticated`
- direct CRUD拒否確認:
  - owner direct `insert / update` は許可されるため全面拒否は N/A
  - `DELETE` は `42501` で拒否されることを structured probeで確認した
- `security definer` hardening:
  - N/A。M2-02 `research_lines` slice では helper / RPC / `security definer` を追加していない
- AppError分類 / 失敗時挙動:
  - N/A。Data Access / UI接続は scope外であり、今回の証跡は DB SQLSTATE と permission boundary の確認に限定した

## 完了判断

- どの矛盾をどう解消したか:
  - `m2-db-verification-checklist.md` がまだ汎用テンプレートのままだった点を、`research_lines` current application 付き checklist に更新して解消した
  - non-production verification target が補助証跡ごとに暗黙だった点を、`@electric-sql/pglite` + checked-in runner script + fixed command にして解消した
  - expected failure の再実行が手作業前提だった点を、structured probe SQL と result table で一度の実行から追える形に変えた
- 完了扱いにできる理由:
  - `research_lines` slice について、既存 migration pair、filled checklist、fixed local target、actor切替方法、structured verification SQL、補助証跡、未実施項目、停止条件がそろい、M2-02 の DB slice証跡として閉じたため
- worklogに記録した成立済み事項:
  - latest confirmed anchor `8b583f2` を基準に current public `main` を監査したこと
  - `research_lines` migration pair の論理変更説明
  - local `@electric-sql/pglite` target と actor切替手順
  - trim / duplicate / archive / A-B / anon / delete / owner success の実行結果
  - N/A理由、未実施、残リスク、次に止める条件
- あえて未解消として残した事項:
  - 実Supabase local / 分離Previewでの再実行
  - M2後続 table と Data Access / UI接続
