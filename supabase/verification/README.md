# DB Verification Assets

このディレクトリには、M2以降のDB sliceで再利用する非本番検証資産を置きます。M2番号の正は `docs/implementation-plan-v1.md` とし、`M2-01 = 検証/証跡土台整理`、`M2-02 = research_lines の最初の end-to-end DB slice` と読みます。ここにあるものは、実migrationではなく、手順書とテンプレートです。

## 使い方

1. 対象sliceを決める。
2. `m2-db-verification-checklist.md` で適用する検証観点とN/A理由を埋める。
3. `sql/local-db-auth-harness.sql` で local actor 切替の前提を作る。
4. `sql/m2-db-slice-verification-template.sql` を参照し、対象slice向けの検証SQLを作る。
5. 非本番で実行する。
6. 正式証跡としてPR本文またはworklogへ結果、未実施、残リスク、次の停止条件を残す。
7. 必要なら `runs/` 配下へ補助証跡を置き、worklogから参照する。
8. M2-01完了後に次に着手する実装タスクは M2-02 `research_lines` sliceであり、このディレクトリの資産はその初回sliceから再利用する。

## M2-02で固定するローカル検証方法

- 非本番検証の既定は、local PostgreSQL互換 harness上で SQL を実行する方法にする。
- actor切替の正本は `sql/local-db-auth-harness.sql` とし、A/B/anon は SQL セッション内で切り替える。
- Actor A / Actor B: `RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '<actor-uuid>', false);`
- anon: `RESET ROLE; SET ROLE anon; SELECT set_config('request.jwt.claim.sub', '', false);`
- 実際に使った runtime は、sliceごとの `runs/` 補助証跡とworklogへ残す。local PostgreSQL、PGlite など runtime差は許容するが、actor切替SQLは変えない。

## このディレクトリで固定すること

- 実行順
- 前提条件
- 常時必須の検証観点
- 条件付きで適用する検証観点
- 未実施項目の残し方
- 停止条件の残し方

## このディレクトリで固定しないこと

- 実テーブル名が確定した後のDDL
- 実RLS policy本文
- 実grant/revoke
- 実helper / 実RPC
- 実Supabase接続情報
