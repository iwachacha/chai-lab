# M2 DB Slice Verification Checklist

このチェックリストは、`research_lines`、`trials`、`trial_ingredients`、`trial_stars` などのDB sliceごとに使い回す前提です。チェックリスト単体を正式証跡にせず、PR本文またはworklogへ結果を転記します。M2-02の初回 `research_lines` sliceでは、このファイル自体に適用結果を埋めて残します。

## 0. 対象情報

- 対象単位: `M2-02 research_lines`
- sliceの目的: `research_lines` の table DDL、trim保存制約、未アーカイブ一意制約、RLS、policy、grant/revoke、reject path、補助証跡を1つの閉じた DB slice として完了させる
- 対象オブジェクト: `public.research_lines`、`idx_research_lines_user_id`、`idx_research_lines_active_title`、`research_lines_select_own`、`research_lines_insert_own`、`research_lines_update_own`
- 適用する検証観点: A/Bユーザー分離、anon拒否、trim正規化境界 / trim後重複、想定経路の成功、未実施項目の記録、停止条件の記録
- N/Aにする検証観点と理由:
  - `deleted_at IS NULL` 前提の通常取得除外: `research_lines` は `deleted_at` を持たず、active trial前提にも依存しないため
  - direct CRUD全面拒否: v1契約で `research_lines` owner の direct `insert / update` は許可されるため。ただし physical delete不可は別観点として実施
- 非本番検証先: `npx -y -p @electric-sql/pglite node supabase/verification/scripts/run-pglite-verification.mjs ...` で起動する one-shot local `@electric-sql/pglite`
- Actor A / Actor B / anon の準備状況: `supabase/verification/sql/local-db-auth-harness.sql` で `auth.users` stub、`auth.uid()`、`authenticated` / `anon` role を作成済み。Actor A = `11111111-1111-1111-1111-111111111111`、Actor B = `22222222-2222-2222-2222-222222222222`
- Actor切替方法:
  - Actor A / Actor B: `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '<actor-uuid>', false);`
  - anon: `RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub', '', false);`
- 参照する手順書: `supabase/verification/README.md`
- 参照するSQL:
  - `supabase/verification/sql/local-db-auth-harness.sql`
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql`
- 補助証跡ファイル:
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`
- 正式証跡の記録先:
  - `docs/worklogs/2026-04-21-m2-02-research-lines-verification-closure.md`

## 1. 検証観点の適用マトリクス

| 観点 | 必須タイミング | N/Aにできる条件 |
|---|---|---|
| A/Bユーザー分離 | すべてのDB slice | なし |
| anon拒否 | すべてのDB slice | なし |
| trim正規化境界 / trim前提の重複確認 | trim後保存値、trim後unique、未trim値拒否など、trim前提入力契約を持つslice | trim保存契約もtrim後unique契約も未trim値拒否契約も持たない |
| `deleted_at IS NULL` 前提の通常取得除外 | `deleted_at` を持つslice、またはactive trial前提で参照・集計するslice | `deleted_at` を持たず、active trial前提にも依存しない |
| direct CRUD拒否 | v1契約で直接書き込みを禁止するslice。少なくとも `trials` と `trial_ingredients` | v1契約で直接table writeが許可されている。例: `research_lines` の insert/update、`trial_stars` の insert/delete |
| 想定経路の成功 | すべてのDB slice | なし |
| 未実施項目の記録 | すべてのDB slice | なし |
| 停止条件の記録 | すべてのDB slice | なし |

## 2. 実施前チェック

- [x] 実行先はlocalまたは分離された非本番であり、Productionではない
- [x] 対象sliceの範囲が1論理変更に閉じている
- [x] worklogまたはPR本文の記録先を先に決めた
- [x] 適用する検証観点とN/A理由を空欄のままにしていない
- [x] 参照するSQL / 手順書 / 補助証跡ファイルの場所を記録した
- [x] direct CRUD拒否は全面適用しないが、`research_lines` で必要な physical delete拒否を別観点として確認する前提にした

## 3. 実施順序

### 3.1 構造確認

- [x] 対象オブジェクトが想定どおり存在する
- [x] migrationが1論理変更に閉じている
- [x] policy / grant / helper / function / indexの対象範囲を列挙できる

### 3.2 Actor A 正常系

- [x] Actor Aで想定経路が成功する
- [x] 成功時にどの条件を満たしたかをworklogへ書ける

### 3.3 Actor B 拒否

- [x] Actor Bで他人データの参照または操作が拒否される
- [x] 0件 / 権限拒否 / 想定エラーのどれを期待値にするかを記録した

### 3.4 anon 拒否

- [x] anonで業務テーブルまたは対象経路が拒否される
- [x] anonの期待値を記録した

### 3.5 trim 保存 / trim重複

- [x] trim前提契約を持つsliceでは、前後空白付き生入力に対する境界を記録した
- [x] 前後空白付き生入力の挙動が、保存値への正規化かDB拒否のどちらかで確認できた
- [x] trim後重複禁止が契約に含まれるsliceでは、重複拒否を確認した
- [x] archive後の同名再利用ができることを確認した

### 3.6 `deleted_at IS NULL` 前提の通常取得除外

- [x] 該当しないため N/A理由を残した: `research_lines` は `deleted_at` を持たず、active trial前提にも依存しない

### 3.7 direct CRUD拒否

- [x] 該当しないため N/A理由を残した: owner direct `insert / update` は v1契約で許可される
- [x] `research_lines` で必要な境界として、grant/revokeの読み戻しと physical delete拒否を確認した

### 3.8 未実施項目と停止条件

- [x] 未実施項目を空欄で残していない
- [x] 未実施ごとに理由、代替確認、残リスク、次に止める条件を書いた
- [x] 未実施がある場合、どの後続タスクを止めるかを書いた

## 4. 停止条件として明示すること

次のどれかが残る場合は、そのsliceを完了扱いにしません。

- A/B分離未検証
- anon拒否未検証
- 適用されるtrim検証未実施
- 適用される`deleted_at IS NULL`通常取得除外未実施
- 適用されるdirect CRUD拒否未実施
- 未実施項目の理由、代替確認、残リスク、次に止める条件が未記録
- 参照したSQL / 手順書 / 補助証跡ファイルが追えない

## 5. worklog / PR本文へ必ず残す項目

- 対象単位
- 実施した検証
- 未実施検証
- 実施できなかった理由
- 残リスク
- 次に止める条件
- 参照したSQL / 手順書 / 補助証跡ファイル

## 6. 補足

- `research_lines` はdirect CRUD全面拒否の対象ではありません。v1契約で本人のinsert / updateは直接許可されます。ただし、物理delete不可、trim前提の生入力拒否または正規化、trim / 重複 / archive挙動は検証対象です。
- `trials` と `trial_ingredients` はdirect CRUD拒否が必須です。将来のRPC導線を先回り実装せず、DB権限と負の検証で止めます。
- `trial_stars` は本人未削除trialへの直接insert / deleteを許可するため、direct CRUD拒否の代わりに「許可された直接操作の境界」を確認します。
