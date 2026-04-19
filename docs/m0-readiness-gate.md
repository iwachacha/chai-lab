# M0 Readiness Gate

**作成日:** 2026-04-19  
**目的:** M0完了とM1以降への着手可否を判定するためのゲート一覧

## 1. 判定ルール

M0は、実装本体を始めるマイルストーンではない。M0完了とは、M1以降へ進んでもよい最低限の環境、検証、レビュー、記録の方針が決まっている状態を指す。

M1へ進む条件は次のとおりである。

- G0-ENV、G0-AUTH、G0-RLS-VERIFY、G0-REVIEW、G0-TESTOPS、G0-LOGGINGが完了している。
- G0-DOMAINは、すべてのドメイン仕様が確定していなくてもよいが、各未確定事項の判断期限と停止範囲が承認されている。
- G0-BACKUPは、実際のbackup/export確認がM8までに実施される前提で、担当、証跡、期限が決まっている。

M2以降のDB/RLS/RPCは、G0-ENV、G0-RLS-VERIFY、G0-REVIEWが未完了なら着手不可である。

## 2. ゲート一覧

| ゲートID | ゲート名 | 内容 | 根拠文書 | 完了条件 | 証跡 | 承認要否 | 未完了時に停止するマイルストーン/タスク |
|---|---|---|---|---|---|---|---|
| G0-ENV | Supabase環境分離確認 | local/preview/productionのSupabase接続先と、ProductionデータをPreviewで使わない方針を決める | `deployment-contract.md` 7、`app-rdd.md` 6.2、`implementation-plan-v1-revised.md` Q-01 | local、preview、productionの接続先方針があり、previewがproductionデータを使わない。フロントenvに許可値以外を置かない方針がある | 環境一覧、project ownerの承認、禁止envチェック方針 | 必須 | M1 env/Auth、M2 DB/RLS、M7 E2E、M8 deploy |
| G0-AUTH | Auth Redirect確認 | Magic Link Redirect URLとcallback方式を確認する | `deployment-contract.md` 6、`screen-acceptance-criteria.md` 11 | localは `http://localhost:3000/auth/callback/`、previewはCloudflare Pages Previewの `/auth/callback/`、productionは `NEXT_PUBLIC_APP_ORIGIN` + `/auth/callback/` を使う方針がある。サーバーcallbackを作らない | 環境別Redirect URL一覧、未確定URLの期限 | 必須 | M1-04、M7 E2E、M8-02 |
| G0-RLS-VERIFY | RLS/RPC検証方式確定 | A/B分離、direct CRUD拒否、grant/policy確認、RPC検証を何で実施し、どこに記録するか決める | `db-migration-rls-policy.md` 6、`codex-execution-rules.md` 10、`implementation-plan-v1-revised.md` M2-10 | 4業務テーブルのRLS有効化、policy、grant/revoke、anon拒否、A/B分離、direct CRUD拒否の検証手順と記録形式が決まっている。RPC検証の最低項目が決まっている | 検証チェックリスト、A/Bユーザー方針、証跡保存先 | 必須 | M2-00以降、M3/M4 RPC |
| G0-REVIEW | human review gate運用確定 | migration、RLS policy、grant/revoke、security definer、RPC、認可境界Data Accessのレビュー運用を決める | `db-migration-rls-policy.md` 7、`implementation-plan-v1-revised.md` 6章 | レビュー対象、事前資料、承認者役割、承認記録保存先、差し戻し時の停止範囲が決まっている | レビュー運用表、承認者または役割、記録先 | 必須 | M2以降のDB/RLS/RPC/security definer、認可境界Data Access |
| G0-DOMAIN | 未確定ドメイン仕様の判断 | 研究ライン名正規化、`brewed_at`、RPCエラー、clone UXを決めるか、期限付きで停止範囲を承認する | `app-lld.md`、`screen-acceptance-criteria.md`、`supabase-data-access-error-contract.md`、`m0-decision-pack.md` | 各項目について、採用案または判断期限、判断者、未解消時の停止範囲が明記されている | `docs/m0-open-questions.md` と承認記録 | 必須。M1前は延期承認でも可 | D-04未決ならM2-05/M2-12、D-05未決ならM3/M5、D-06未決ならM3/M4、D-07未決ならM4 |
| G0-BACKUP | バックアップ/エクスポート方針確認 | Supabase backup状況と手動export手順をいつ誰が確認するか決める | `app-rdd.md` 6.2、`app-design.md` S1、`implementation-plan-v1-revised.md` M8-03 | ユーザー向けexport UIを作らないこと、運用側backup/export確認の担当、期限、証跡形式が決まっている | 担当者、確認期限、記録先 | 必須。実確認はM8までで可 | M8-03、M8-04、本番deploy |
| G0-TESTOPS | テスト実行/未実施記録方式確定 | npm scripts、CI/手動境界、未実施記録テンプレートを決める | `tech-stack.md` 6、`codex-execution-rules.md` 10/12、`screen-acceptance-criteria.md` 2/11 | M1で固定するscripts候補、M7で必須の検証種別、未実施時の記録項目が決まっている | テスト運用表、未実施記録テンプレート | 必須 | M7完了、M8 deploy、PR完了報告 |
| G0-LOGGING | 作業記録保存先確定 | human review、未実施検証、残リスク、作業結果の保存先を決める。あわせて外部Analyticsなし、ログ禁止項目を確認する | `codex-execution-rules.md` 12、`supabase-data-access-error-contract.md` 15、`app-lld.md` 8 | 正式証跡をPR本文、docs内worklog、またはその併用のどれにするか決まっている。チャットのみを正式証跡にしない。材料名、メモ、認証情報、生エラーをログへ出さない方針が確認済み | 記録先、ログ禁止項目チェック、承認記録 | 必須 | M2以降のレビュー必須タスク、M7/M8証跡確認 |

## 3. G0-RLS-VERIFYの最低検証項目

M2で「検証済み」と呼ぶには、少なくとも次を証跡に残す。

| 対象 | 最低検証 |
|---|---|
| `research_lines` | Aが自分の作成/編集に成功。AはBの行を参照/更新/削除できない。delete不可。anon拒否。 |
| `trials` | Aは自分のselectのみ成功。insert/update/delete/upsertは直接失敗。Bの行不可。anon拒否。 |
| `trial_ingredients` | 親trial所有者だけselect可能。insert/update/delete/upsertは直接失敗。Bの材料行不可。anon拒否。 |
| `trial_stars` | 本人の未削除trialだけinsert/delete可能。Bのtrial、削除済みtrial不可。update/upsert不可。anon拒否。 |
| `save_trial_with_ingredients` | RPC経由でのみ保存成功。部分保存なし。未知キー/材料0件/他ユーザー対象を拒否。 |
| `clone_trial` | 材料行をコピーし、スターをコピーしない。他ユーザー/削除済み/アーカイブ済みを拒否。 |
| `soft_delete_trial` | 本人の未削除試行だけ論理削除。物理削除なし。一覧/詳細から除外。 |

## 4. G0-REVIEWの事前資料テンプレート

レビュー必須変更では、次を承認前資料に含める。

| 資料 | 必須内容 |
|---|---|
| 変更目的 | v1スコープ根拠、対象外機能を含まない説明 |
| 影響範囲 | テーブル、カラム、index、policy、function、RPC、Data Access |
| RLS/policy matrix | role、操作、`USING`、`WITH CHECK`、拒否条件 |
| grant/revoke一覧 | anon/authenticated/PUBLICの許可・拒否 |
| security definer確認 | auth.uid、所有者確認、search_path、PUBLIC revoke、grant |
| RPC仕様 | 入力、認可、戻り値、失敗時挙動、AppError分類 |
| 検証結果 | A/B分離、direct CRUD、anon拒否、RPC重要仕様 |
| 未実施 | 理由、代替確認、残リスク、次の確認者 |
| rollback/修正方針 | 問題発生時の戻し方、修正migration方針 |

## 5. M1へ進める条件

M1へ進めるのは、次が満たされた場合だけである。

1. G0-ENVとG0-AUTHにより、Supabase接続先とAuth Redirect方針が決まっている。
2. G0-RLS-VERIFYにより、M2で使うRLS/RPC検証方式と証跡形式が決まっている。
3. G0-REVIEWにより、DB/RLS/RPC/security definerのhuman review運用が決まっている。
4. G0-TESTOPSにより、テストコマンド方針と未実施記録形式が決まっている。
5. G0-LOGGINGにより、作業記録と承認記録の保存先が決まっている。
6. G0-DOMAINの未確定仕様は、判断期限と停止範囲が承認されている。
7. G0-BACKUPは、M8までの確認担当と証跡形式が決まっている。

上記が満たされていない場合、M1へ進まず、M0の確認を継続する。

## 6. M2以降へ進める追加条件

M2以降へ進むには、M1完了に加えて次を満たす。

- G0-ENVの非本番Supabase環境が実際に使える。
- G0-RLS-VERIFYの検証手順がM2で実行可能である。
- G0-REVIEWの承認記録先が運用されている。
- D-04の研究ライン名重複方針が解消済みである。
- M2-00のDB変更分割計画レビューが通過している。

M3以降へ進むには、該当RPCのD-05/D-06、M4 clone UIへ進むにはD-07の判断が必要である。
