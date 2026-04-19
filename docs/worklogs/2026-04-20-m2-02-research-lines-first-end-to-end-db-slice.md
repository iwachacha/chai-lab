# Worklog: M2-02 research_lines first end-to-end DB slice

## 確認対象

- 今回の判断根拠: `公開 repo / 既定ブランチ`
- 作業開始時点の基準コミット: `0bb3268b0a413a3b260eacb2b60eb3885e0a4f33`
- 公開 repo / 既定ブランチ確認: `origin/main` を基準に開始し、`research_lines` 実装本体は `529eb0efae3bd27e4c4c6f97c9538238569439ab` で GitHub 反映を確認してから本記録を追加
- 作業名: `M2-02 research_lines first end-to-end DB slice`
- 対象単位: `research_lines` DDL / index / RLS / policy / grant / verification assets
- N/Aにした検証観点と理由:
  - `deleted_at IS NULL` 通常取得除外: `research_lines` は `deleted_at` を持たず、active trial前提にも依存しないため
  - direct CRUD全面拒否: v1契約で `research_lines` の owner `insert` / `update` は直接許可されるため。ただし physical delete不可は検証対象として実施
- 日付: 2026-04-20
- 変更分類: DB / RLS / Docs / Test
- 完了運用分類: 大きなコード変更
- 分類理由: 実migration追加、RLS/policy/grant追加、非本番検証方式の固定、A/B/anon検証、GitHub反映、CI確認が必要な変更だから
- 適用フェーズ / 適用範囲: v1 M2-02 `research_lines`
- 変更対象:
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
  - `supabase/verification/README.md`
  - `supabase/verification/m2-db-verification-checklist.md`
  - `supabase/verification/sql/local-db-auth-harness.sql`
  - `supabase/verification/sql/m2-db-slice-verification-template.sql`
  - `supabase/verification/runs/2026-04-20-m2-02-research-lines-verification.sql`
  - `supabase/verification/runs/2026-04-20-m2-02-research-lines-verification.md`
- 参照したSQL / 手順書 / 証跡ファイル:
  - `supabase/verification/sql/local-db-auth-harness.sql`
  - `supabase/verification/runs/2026-04-20-m2-02-research-lines-verification.sql`
  - `supabase/verification/runs/2026-04-20-m2-02-research-lines-verification.md`
- 危険変更workflow該当: あり。migration、RLS、policy、grant/revokeを含む
- 人間確認: 不要。v1スコープ変更、Production、secret、本番データには触れていない

## 正本

- 正本ファイル:
  - `docs/implementation-plan-v1.md`
  - `docs/app-lld.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/agent-workflow.md`
  - `docs/codex-execution-rules.md`
  - `supabase/README.md`
  - `supabase/migrations/README.md`
  - `supabase/verification/README.md`
- 正本で固定した定義 / 正式項目 / 停止条件:
  - M2-02 は `research_lines` の最初の end-to-end DB slice とし、DDLだけで完了扱いにしない
  - `research_lines` は `id`, `user_id`, `title`, `description`, `created_at`, `updated_at`, `archived_at` を持つ
  - `title` は `btrim(title)` と長さ 1〜80 をDB制約で担保し、未アーカイブ重複は `user_id + btrim(title)` の partial unique で拒否する
  - owner は `select / insert / update` 可、delete policyは作らない
  - anon に業務データを見せず、owner以外に `research_lines` を触らせない
  - actor A/B/anon 切替方法未固定のまま M2-02 に進まない
- 正本を先に修正した確認: 今回のDB仕様自体は既存正本に一致していたため、先に正本の再読と範囲固定を行い、設計変更なしで migration / verification assets 実装へ進んだ。M2-01で未固定だった local actor切替方法だけを `supabase/verification/` 配下の再利用資産に落としてから実sliceへ進めた

## GitHub反映状況

- GitHubに反映済み: あり。`research_lines` 実装本体は `529eb0efae3bd27e4c4c6f97c9538238569439ab` で `origin/main` への反映を確認してから本worklogを追加
- 反映ブランチ: `main`
- 反映確認に使ったコミット識別情報: `529eb0efae3bd27e4c4c6f97c9538238569439ab`
- CI確認の要否判断: 必須。危険変更workflow対象であり、push後の docs workflow を無視しない
- CI結果 / 未確認理由: 本worklog追加後の最終pushに対する結果を最終報告で確認する

## 変更ファイル一覧

- `supabase/migrations/20260420103000_create_research_lines_table.sql`: `research_lines` の table / constraint / index を追加する初回DDL
- `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`: `research_lines` の RLS enable、policy、grant/revoke を追加する access control 変更
- `supabase/verification/README.md`: M2-02で固定した local actor切替方法と記録先を追加
- `supabase/verification/m2-db-verification-checklist.md`: trim境界の確認項目と actor切替方法の記録欄を追加
- `supabase/verification/sql/local-db-auth-harness.sql`: local actor A/B/anon 切替の bootstrap SQL を追加
- `supabase/verification/sql/m2-db-slice-verification-template.sql`: local harness前提の actor切替コメントと trim境界コメントへ更新
- `supabase/verification/runs/2026-04-20-m2-02-research-lines-verification.sql`: `research_lines` slice の probe SQL
- `supabase/verification/runs/2026-04-20-m2-02-research-lines-verification.md`: 実行結果の補助証跡

## 採用方針

- 採用した方針:
  - `research_lines` を 2 migration に分け、DDL / index と access control を論理分離した
  - policy は `TO authenticated` に限定し、grant と role scope を一致させた
  - 非本番検証は local PostgreSQL互換 harness で再実行可能な SQL に固定し、A/B/anon は `SET ROLE` + `set_config('request.jwt.claim.sub', ...)` で切り替えた
  - `research_lines` は owner の direct `insert` / `update` を許可しつつ、trim境界、active unique、archive再利用、physical delete不可をDBで閉じた
- 優先軸: 現行フェーズ整合、安全性、単純性、監査可能性、可逆性
- 根拠文書:
  - `docs/implementation-plan-v1.md`
  - `docs/app-lld.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/agent-workflow.md`
  - `docs/codex-execution-rules.md`
- 退けた代替案:
  - `research_lines` と後続 table をまとめて作る案は、M2-02の閉じた slice 条件と `1 migration = 1 logical change` を崩すため退けた
  - policy を `PUBLIC` 相当で広く作り grant だけで止める案は、最小権限が弱くなるため退けた
  - Supabase local / Docker 前提に固定する案は、現環境に CLI / Docker がないため、M2-01未解消の停止条件を閉じられず退けた

## 変更内容

- 追加:
  - `research_lines` table migration
  - `research_lines` RLS / policy / grant migration
  - local auth harness SQL
  - `research_lines` slice probe SQL
  - `research_lines` slice verification summary
- 更新:
  - `supabase/verification` README
  - M2 verification checklist
  - M2 verification SQL template
- 削除: なし
- 更新した文書: `supabase/verification/README.md`, `supabase/verification/m2-db-verification-checklist.md`

## 正本ファイルの証拠抜粋

- `docs/implementation-plan-v1.md`: M2-02 は `research_lines` の DDL、trim保存制約、未アーカイブ一意制約、RLS enable、owner policy、delete非許可、grant/revoke、trim重複とarchive後挙動の検証を1単位として扱う
- `docs/app-lld.md`: `research_lines` は `title = btrim(title)` と長さ制約を持ち、物理削除は行わず、owner の `select / insert / update` だけを許可する
- `docs/db-migration-rls-policy.md`: `research_lines` は owner 判定を `user_id = auth.uid()` に置き、anon に業務データを許可せず、delete policyを作らない
- `docs/supabase-data-access-error-contract.md`: 通常一覧は `archived_at IS NULL` を基本とし、アーカイブは `archived_at` 更新で表す

## 整合確認の証拠

- 新しい解釈が存在する検索:
  - `rg -n "M2-02|actor切替方法|trim前提|research_lines" docs supabase -g "*.md" -g "*.sql"`
- 旧解釈が消えた検索:
  - `rg -n "trim保存が契約に含まれるsliceでは、前後空白付き入力の保存値を確認した" supabase/verification`
- docs-only / 影響差分の確認:
  - `git diff --name-only`
  - `git diff --cached --stat`
  - `rg -n 'public_slug|share_token|visibility|follow|reaction|photo|AI提案|compare|graph' src tests supabase/migrations scripts`
  - `rg -n 'from\\(''trials''\\)\\.(insert|update|upsert|delete)|from\\(\"\"trials\"\"\\)\\.(insert|update|upsert|delete)|from\\(''trial_ingredients''\\)\\.(insert|update|upsert|delete)|from\\(\"\"trial_ingredients\"\"\\)\\.(insert|update|upsert|delete)' src tests supabase scripts`

## 実行コマンドと結果

| コマンド | 用途 | 結果 |
|---|---|---|
| `npm run check:docs` | docs / worklog / verification asset整合確認 | 成功 |
| `rg -n 'SUPABASE_SERVICE_ROLE_KEY\|service_role\|DB_CONNECTION\|DATABASE_URL\|OPENAI_API_KEY\|R2_\|STORAGE_' src tests supabase/migrations scripts .env.example` | secret / service_role混入確認 | 0件 |
| `rg -n 'public_slug\|share_token\|visibility\|follow\|reaction\|photo\|AI提案\|compare\|graph' src tests supabase/migrations scripts` | scope逸脱語確認 | 0件 |
| `rg -n 'from\\(''trials''\\)\\.(insert\|update\|upsert\|delete)\|from\\(\"\"trials\"\"\\)\\.(insert\|update\|upsert\|delete)\|from\\(''trial_ingredients''\\)\\.(insert\|update\|upsert\|delete)\|from\\(\"\"trial_ingredients\"\"\\)\\.(insert\|update\|upsert\|delete)' src tests supabase scripts` | trials系 direct write混入確認 | 0件 |
| `node -` inline script loading `local-db-auth-harness.sql` + 2 migrations + `2026-04-20-m2-02-research-lines-verification.sql` | local actor切替 / object check / owner success / B拒否 / anon拒否 / trim / duplicate / delete 境界検証 | 成功。詳細は `supabase/verification/runs/2026-04-20-m2-02-research-lines-verification.md` |
| `git push origin main` | GitHub反映 | 成功。`529eb0efae3bd27e4c4c6f97c9538238569439ab` を `origin/main` で確認 |

## 未実施検証

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| Supabase local / 実Preview projectへの migration 適用 | 現環境に `supabase` CLI / Docker がなく、実Supabase projectには触れない方針だから | local PostgreSQL互換 harness上で actor切替、RLS、grant、constraint、expected failureを実行した | `auth.users` と `gen_random_uuid()` を local harnessでstub化しているため、実Supabase runtimeとの差異が残る | 実Supabase localまたは分離Previewを使える段階で同じ probe SQL を再実行できない場合は、後続の remote接続前タスクを止める |
| Research Lines Data Access / UI接続 | M2-10以降の後続タスクであり、今回の scope外だから | DB sliceとして owner success / reject path / archive境界を閉じた | Data Access側で trim / archive条件を崩す実装余地はまだ残る | M2-10以降で DB制約と異なる trim / archive条件が出た時点で停止 |

## 停止条件

- AI自己監査結果:
  - 設計妥当性: `research_lines` のみで閉じ、trials系、public/share、future schemaを混入させていない
  - 権限境界: owner select / insert / updateのみ許可、Actor B hidden / cross-owner insert拒否、anon grantなし、delete不可を確認
  - 影響範囲: table `research_lines`、index 2本 + PK、policy 3本、grant/revoke、verification assets
  - 代替案比較: local harness + SQL probe を採用し、広い policy や multi-table migration を退けた
  - テスト条件: owner success、A/B分離、anon拒否、trim境界、duplicate拒否、archive後再利用、physical delete不可を実施
- 残る停止条件:
  - `research_lines` の Data Access / UI接続は未着手
  - 実Supabase local / 分離Previewでの再実行は未実施
  - M2全体としては `trials` / `trial_ingredients` / `trial_stars` が未実装
- 次に止める条件:
  - `research_lines` と異なる trim / archive解釈を Data Access / UI へ持ち込む場合
  - 実Supabase runtimeで再検証が必要な局面で、local harness結果だけを根拠に remote依存タスクを完了扱いにする場合
  - `research_lines` sliceを根拠に trials系 helper / RPC / direct CRUDへ広げる場合

## 完了判断

- どの矛盾をどう解消したか:
  - M2-01時点で未固定だった actor A/B/anon 切替方法を `local-db-auth-harness.sql` と `supabase/verification/README.md` へ固定した
  - `research_lines` slice は DDLだけで終わらせず、policy / grant / reject path / archive再利用まで1つの閉じた単位で証跡化した
  - trim保存契約とDB raw write境界の解釈ずれは、checklistを「trim境界の確認」へ更新し、`research_lines` では未trim raw write拒否として証拠化した
- 完了扱いにできる理由:
  - `research_lines` の table定義、制約、RLS、policy、grant、verification assets、GitHub反映がそろい、owner success / B拒否 / anon拒否 / trim / duplicate / archive / delete 不可の証跡まで閉じたため
- worklogに記録した成立済み事項:
  - `research_lines` slice の logical split
  - local actor切替方法
  - verification asset配置
  - GitHub反映済み実装 commit
  - 未実施と残リスク
- あえて未解消として残した事項:
  - 実Supabase runtimeでの再実行
  - Data Access / UI接続
  - M2後続3テーブル
- 後続で見直す条件:
  - 実Supabase local / 分離Previewで同じ probe SQL を回せる環境が整ったとき
  - M2-10以降で trim / archive / error contract の境界を Data Accessへ落とすとき
