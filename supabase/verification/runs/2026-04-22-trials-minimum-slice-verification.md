# Trials minimum slice verification summary

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
- slice probes: `supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.sql`
- actor切替:
  - Actor A / Actor B: `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '<actor-uuid>', false);`
  - anon: `RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub', '', false);`

## Rerun command

If `@electric-sql/pglite` is not available in `node_modules`, prepare the temporary local runtime first:

```powershell
npm install --no-save --no-package-lock @electric-sql/pglite
```

```powershell
node supabase/verification/scripts/run-pglite-verification.mjs `
  --query "select sort_order, check_key, passed, expected, observed, sqlstate, hint from pg_temp.trials_minimum_slice_verification_results order by sort_order" `
  supabase/verification/sql/local-db-auth-harness.sql `
  supabase/migrations/20260420103000_create_research_lines_table.sql `
  supabase/migrations/20260420104000_add_research_lines_access_policies.sql `
  supabase/migrations/20260422090000_create_trials_core_tables.sql `
  supabase/migrations/20260422091000_add_trials_ingredients_access_policies.sql `
  supabase/migrations/20260422092000_add_save_trial_with_ingredients_rpc.sql `
  supabase/migrations/20260422093000_add_soft_delete_trial_rpc.sql `
  supabase/verification/runs/2026-04-22-trials-minimum-slice-verification.sql
```

## Result

| sort_order | check_key | result | observed |
|---:|---|---|---|
| 1 | `tables_exist_with_rls` | pass | `trial_ingredients relrowsecurity=t; trials relrowsecurity=t` |
| 2 | `policy_matrix` | pass | `trial_ingredients.trial_ingredients_select_own_active_trial cmd=SELECT authenticated_only=true; trials.trials_select_own_active cmd=SELECT authenticated_only=true` |
| 3 | `grant_matrix` | pass | `trial_ingredients:authenticated:SELECT; trials:authenticated:SELECT` |
| 4 | `function_grants` | pass | `is_own_active_trial:authenticated:EXECUTE; save_trial_with_ingredients:authenticated:EXECUTE; soft_delete_trial:authenticated:EXECUTE` |
| 10 | `actor_a_rpc_save_success` | pass | `visible_trials=1; visible_ingredients=1` |
| 11 | `actor_a_rpc_edit_success` | pass | `visible_trials=1; visible_ingredients=1; title=Actor A trial edited; rating=5; ingredient_names=Darjeeling` |
| 20 | `direct_trials_insert_rejected` | pass | `42501: permission denied for table trials` |
| 21 | `direct_trial_ingredients_delete_rejected` | pass | `42501: permission denied for table trial_ingredients` |
| 22 | `direct_trials_update_rejected` | pass | `42501: permission denied for table trials` |
| 23 | `direct_trials_delete_rejected` | pass | `42501: permission denied for table trials` |
| 24 | `direct_trials_upsert_rejected` | pass | `42501: permission denied for table trials` |
| 25 | `direct_trial_ingredients_insert_rejected` | pass | `42501: permission denied for table trial_ingredients` |
| 26 | `direct_trial_ingredients_update_rejected` | pass | `42501: permission denied for table trial_ingredients` |
| 27 | `direct_trial_ingredients_upsert_rejected` | pass | `42501: permission denied for table trial_ingredients` |
| 30 | `actor_b_select_isolated` | pass | `visible_trials=0; visible_ingredients=0` |
| 31 | `actor_b_cross_owner_rpc_rejected` | pass | `P0001: trial research line not found`, hint `CHAI_TRIAL_NOT_FOUND` |
| 32 | `actor_b_cross_owner_edit_rejected` | pass | `P0001: trial not found`, hint `CHAI_TRIAL_NOT_FOUND` |
| 33 | `actor_b_cross_owner_soft_delete_rejected` | pass | `P0001: trial not found`, hint `CHAI_TRIAL_NOT_FOUND` |
| 40 | `anon_trials_select_rejected` | pass | `42501: permission denied for table trials` |
| 50 | `soft_delete_hides_trial` | pass | `visible_trials=0` |
| 51 | `soft_delete_idempotency_rejected` | pass | `P0001: trial already archived`, hint `CHAI_TRIAL_CONFLICT` |

## Boundary conclusion

- Owner read, RPC save, RPC edit, and RPC soft delete passed.
- Direct insert / update / delete / upsert on `trials` and `trial_ingredients` were rejected.
- Cross-owner select, save, edit, and soft delete were rejected or hidden.
- `authenticated` select-only grants and RLS policies are consistent for this slice.

## Remaining risk

This run used the local PGlite non-production harness, not a live Supabase project connection. Re-run the same SQL against a separated Supabase project before treating live Supabase runtime behavior as closed.
