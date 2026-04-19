-- M2 DB slice verification template
-- This file is not a migration.
-- Use only against local or separated non-production.
-- Replace placeholder values before execution and keep the used SQL path in worklog / PR evidence.
-- Expected-failure write probes should be wrapped in BEGIN / ROLLBACK.

-- Metadata
SELECT
  '<SLICE_ID>' AS slice_id,
  '<TARGET_UNIT>' AS target_unit,
  CURRENT_TIMESTAMP AS executed_at;

-- Read-only object checks
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('<TABLE_NAME_1>', '<TABLE_NAME_2>');

SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('<TABLE_NAME_1>', '<TABLE_NAME_2>');

SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('<TABLE_NAME_1>', '<TABLE_NAME_2>');

SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('<FUNCTION_NAME_1>', '<FUNCTION_NAME_2>');

-- Actor A expected-success probe
BEGIN;
-- Set Actor A context here according to the chosen non-production verification method.
-- <ACTOR_A_SUCCESS_SQL>
ROLLBACK;

-- Actor B expected-rejection probe
BEGIN;
-- Set Actor B context here.
-- <ACTOR_B_REJECTION_SQL>
ROLLBACK;

-- anon expected-rejection probe
BEGIN;
-- Set anon context here.
-- <ANON_REJECTION_SQL>
ROLLBACK;

-- trim save / trim duplicate probe
BEGIN;
-- Run only when the slice has trim persistence or trim-based uniqueness.
-- <TRIM_SAVE_SQL>
-- <TRIM_DUPLICATE_SQL>
ROLLBACK;

-- deleted_at normal-read exclusion probe
BEGIN;
-- Run only when the slice owns deleted_at or depends on active-trial filtering.
-- <DELETED_FILTER_SQL>
ROLLBACK;

-- direct CRUD rejection probe
BEGIN;
-- Run only when the slice must reject direct application writes.
-- <DIRECT_INSERT_REJECTION_SQL>
-- <DIRECT_UPDATE_REJECTION_SQL>
-- <DIRECT_DELETE_REJECTION_SQL>
ROLLBACK;

-- Expected-success read path
BEGIN;
-- <EXPECTED_READ_PATH_SQL>
ROLLBACK;

-- Notes
-- 1. Replace unused sections with comments that explain N/A in the worklog.
-- 2. Save a slice-specific copy under supabase/verification/runs/ when you need supplemental evidence.
-- 3. Do not move this file under supabase/migrations/.
