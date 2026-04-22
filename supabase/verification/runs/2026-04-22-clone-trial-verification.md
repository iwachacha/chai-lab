# clone_trial verification summary

## Non-production verification method

- runtime: one-shot local `@electric-sql/pglite`
- bootstrap SQL: `supabase/verification/sql/local-db-auth-harness.sql`
- applied migrations:
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
  - `supabase/migrations/20260422090000_create_trials_core_tables.sql`
  - `supabase/migrations/20260422091000_add_trials_ingredients_access_policies.sql`
  - `supabase/migrations/20260422092000_add_save_trial_with_ingredients_rpc.sql`
  - `supabase/migrations/20260422093000_add_soft_delete_trial_rpc.sql`
  - `supabase/migrations/20260422100000_add_clone_trial_rpc.sql`
- slice probes: `supabase/verification/runs/2026-04-22-clone-trial-verification.sql`
- actor切替:
  - Actor A / Actor B: `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '<actor-uuid>', false);`
  - anon: `RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub', '', false);`

## Rerun command

```powershell
node supabase/verification/scripts/run-pglite-verification.mjs `
  --query "select sort_order, check_key, passed, expected, observed, sqlstate, hint from pg_temp.clone_trial_verification_results order by sort_order" `
  supabase/verification/sql/local-db-auth-harness.sql `
  supabase/migrations/20260420103000_create_research_lines_table.sql `
  supabase/migrations/20260420104000_add_research_lines_access_policies.sql `
  supabase/migrations/20260422090000_create_trials_core_tables.sql `
  supabase/migrations/20260422091000_add_trials_ingredients_access_policies.sql `
  supabase/migrations/20260422092000_add_save_trial_with_ingredients_rpc.sql `
  supabase/migrations/20260422093000_add_soft_delete_trial_rpc.sql `
  supabase/migrations/20260422100000_add_clone_trial_rpc.sql `
  supabase/verification/runs/2026-04-22-clone-trial-verification.sql
```

## Result

| sort_order | check_key | result | observed |
|---:|---|---|---|
| 1 | `tables_exist_with_rls` | pass | `trial_ingredients relrowsecurity=t; trials relrowsecurity=t` |
| 2 | `policy_matrix` | pass | `trial_ingredients.trial_ingredients_select_own_active_trial cmd=SELECT authenticated_only=true; trials.trials_select_own_active cmd=SELECT authenticated_only=true` |
| 3 | `grant_matrix` | pass | `trial_ingredients:authenticated:SELECT; trials:authenticated:SELECT` |
| 4 | `function_grants` | pass | `clone_trial:authenticated:EXECUTE; is_own_active_trial:authenticated:EXECUTE; save_trial_with_ingredients:authenticated:EXECUTE; soft_delete_trial:authenticated:EXECUTE` |
| 10 | `owner_active_clone_success` | pass | owner clone created a new active trial with `parent_trial_id` set |
| 11 | `ingredients_copied` | pass | cloned ingredient count `2`, names `アッサム,牛乳` |
| 12 | `cloned_detail_and_list_visible` | pass | clone row and its ingredients remain visible through normal active select |
| 20 | `direct_trials_insert_rejected` | pass | `42501: permission denied for table trials` |
| 21 | `direct_trials_update_rejected` | pass | `42501: permission denied for table trials` |
| 22 | `direct_trial_ingredients_delete_rejected` | pass | `42501: permission denied for table trial_ingredients` |
| 30 | `actor_b_select_isolated` | pass | Actor B sees 0 Actor A trials and 0 Actor A ingredients |
| 31 | `actor_b_cross_owner_clone_rejected` | pass | `P0001`, hint `CHAI_TRIAL_NOT_FOUND` |
| 32 | `missing_clone_rejected` | pass | `P0001`, hint `CHAI_TRIAL_NOT_FOUND` |
| 33 | `archived_line_clone_rejected` | pass | `P0001`, hint `CHAI_TRIAL_NOT_FOUND` |
| 34 | `archived_source_clone_rejected` | pass | `P0001`, hint `CHAI_TRIAL_NOT_FOUND` |
| 35 | `archived_source_hidden_clone_remains_active` | pass | archived source hidden, clone remains visible |
| 40 | `anon_clone_rejected` | pass | `42501: permission denied for function clone_trial` |

## Boundary conclusion

- Owner can clone only an active Trial in an active research line.
- The clone is a new Trial row, with new system-managed identity and timestamps, `parent_trial_id` pointing to the source, and copied ingredient rows.
- Cross-owner, missing, soft-deleted source, and archived research line source failures are normalized to `CHAI_TRIAL_NOT_FOUND`.
- Trial table direct writes remain rejected, and `trials` / `trial_ingredients` table grants remain select-only for `authenticated`.
- `clone_trial` execute is granted only to `authenticated`.

## Remaining risk

This run used the local PGlite non-production harness, not a live Supabase project connection. Re-run the same SQL against a separated Supabase project before treating live Supabase runtime behavior as closed.
