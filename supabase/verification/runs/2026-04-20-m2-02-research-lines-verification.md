# M2-02 research_lines verification summary

## 非本番検証方法

- runtime: local PostgreSQL-compatible harness on `@electric-sql/pglite` (one-shot local execution, repo dependencyには追加していない)
- actor切替:
  - Actor A / Actor B: `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '<actor-uuid>', false);`
  - anon: `RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub', '', false);`
- bootstrap SQL: `supabase/verification/sql/local-db-auth-harness.sql`
- applied migrations:
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
- slice probes: `supabase/verification/runs/2026-04-20-m2-02-research-lines-verification.sql`

## 構造確認

- `research_lines` は `public` schema に作成され、`relrowsecurity = true`
- index:
  - `research_lines_pkey`
  - `idx_research_lines_user_id`
  - `idx_research_lines_active_title`
- policy:
  - `research_lines_select_own` / `SELECT` / role `authenticated`
  - `research_lines_insert_own` / `INSERT` / role `authenticated`
  - `research_lines_update_own` / `UPDATE` / role `authenticated`
- table grant:
  - `authenticated`: `SELECT`, `INSERT`, `UPDATE`
  - `anon`: なし
  - `public`: なし

## 成功ケース

- Actor A は自分の row を insert / select / update できた
- Actor A は `archived_at` を設定した後、同じ `title` を未アーカイブ row として再作成できた
- archive 後の集計は `title = 'Masala baseline'`, `total_rows = 2`, `active_rows = 1`

## 拒否ケース

- Actor B の select は `actor_b_visible_rows = 0`
- Actor B の update は `RETURNING` が 0 rows
- Actor B が `user_id = Actor A` で insert すると `42501`, `new row violates row-level security policy for table "research_lines"`
- anon select は `42501`, `permission denied for table research_lines`
- anon insert は `42501`, `permission denied for table research_lines`
- 前後空白付き title insert は `23514`, `research_lines_title_check`
- 81文字 title insert は `23514`, `research_lines_title_check`
- 未アーカイブ重複 title insert は `23505`, `idx_research_lines_active_title`
- physical delete は `42501`, `permission denied for table research_lines`

## N/A

- `deleted_at IS NULL` 通常取得除外: `research_lines` は `deleted_at` を持たず、active trial前提にも依存しないため N/A
- direct CRUD拒否: `research_lines` は v1契約で owner の direct `insert` / `update` を許可するため、全面拒否は N/A。ただし direct `delete` 不可は検証済み
