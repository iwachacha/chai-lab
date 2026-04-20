# M2-02 research_lines verification summary

## 非本番検証方法

- runtime: one-shot local `@electric-sql/pglite`
- fixed rerun command:

```powershell
npx -y -p @electric-sql/pglite node `
  supabase/verification/scripts/run-pglite-verification.mjs `
  --query "select sort_order, check_key, passed, expected, observed, sqlstate from pg_temp.research_lines_verification_results order by sort_order" `
  supabase/verification/sql/local-db-auth-harness.sql `
  supabase/migrations/20260420103000_create_research_lines_table.sql `
  supabase/migrations/20260420104000_add_research_lines_access_policies.sql `
  supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql
```

- actor切替:
  - Actor A / Actor B: `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '<actor-uuid>', false);`
  - anon: `RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub', '', false);`
- bootstrap SQL: `supabase/verification/sql/local-db-auth-harness.sql`
- applied migrations:
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
- slice probes: `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.sql`

## 検証結果

| sort_order | check_key | 結果 | 観測値 |
|---|---|---|---|
| 1 | `table_exists_with_rls` | pass | `schema=public table=research_lines relrowsecurity=t` |
| 2 | `policy_matrix` | pass | `policy_names=research_lines_insert_own,research_lines_select_own,research_lines_update_own; authenticated_only=t` |
| 3 | `grant_matrix` | pass | `authenticated:INSERT,SELECT,UPDATE` |
| 10 | `actor_a_success_path` | pass | `visible_rows=2; active_rows=1` |
| 11 | `archive_reuse_after_archive` | pass | `total_rows=2; active_rows=1` |
| 20 | `actor_b_select_isolated` | pass | `visible_rows=0` |
| 21 | `actor_b_update_isolated` | pass | `affected_rows=0` |
| 22 | `actor_b_cross_owner_insert_rejected` | pass | `42501: new row violates row-level security policy for table "research_lines"` |
| 30 | `anon_select_rejected` | pass | `42501: permission denied for table research_lines` |
| 31 | `anon_insert_rejected` | pass | `42501: permission denied for table research_lines` |
| 40 | `trim_boundary_rejected` | pass | `23514: new row for relation "research_lines" violates check constraint "research_lines_title_check"` |
| 41 | `title_length_rejected` | pass | `23514: new row for relation "research_lines" violates check constraint "research_lines_title_check"` |
| 42 | `active_duplicate_rejected` | pass | `23505: duplicate key value violates unique constraint "idx_research_lines_active_title"` |
| 43 | `physical_delete_rejected` | pass | `42501: permission denied for table research_lines` |
| 90 | `deleted_filter_not_applicable` | pass | `N/A recorded intentionally for this slice` |
| 91 | `direct_crud_not_applicable_except_delete` | pass | `Owner insert/update covered by success path, physical delete covered separately` |

## N/A

- `deleted_at IS NULL` 通常取得除外: `research_lines` は `deleted_at` を持たず、active trial前提にも依存しないため N/A
- direct CRUD全面拒否: `research_lines` は owner の direct `insert / update` を許可するため N/A。ただし physical delete不可は検証済み

## 補足

- この summary は `supabase/verification/scripts/run-pglite-verification.mjs` の出力を転記した補助証跡です。
- 正式証跡は `docs/worklogs/2026-04-21-m2-02-research-lines-verification-closure.md` を参照します。
