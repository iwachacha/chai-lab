# M0 Open Questions

**作成日:** 2026-04-19  
**目的:** M0で人間判断が必要な未確定事項を短く抜き出す

## Q-01 Supabase環境分離 / Auth Redirect / テストデータ

- 質問: local、preview、productionのSupabase projectをどう分離し、各環境の `/auth/callback/` URLとテストデータ運用をどう決めるか。
- 背景: `deployment-contract.md` はPreviewでProductionデータを使わないこと、Auth Redirectを環境ごとに登録することを要求している。
- 推奨案: localはSupabase localまたは開発project、previewはProductionとは別project、productionは本番projectに分離する。テストデータはsynthetic専用ユーザーで作り、Productionへ投入しない。
- 代替案: local/previewで同じ非本番projectを使う。ただしデータ混在リスクがある。ProductionをPreviewで使う案は禁止。
- 判断者: project owner / human reviewer
- 判断期限: M0完了前。M1 Auth/env設定前。
- 未解消時の停止範囲: M1のSupabase Auth/env、M2 DB/RLS、M7 E2E、M8 deploy。

## Q-02 RLS/RPC検証方式と証跡

- 質問: RLS/RPC検証をSQL、手動確認、テストコード、CIのどれで実施し、検証結果をどこへ残すか。
- 背景: v1では全4業務テーブルのA/B分離、direct CRUD拒否、anon拒否、RPC重要仕様確認がM2/M3/M4の停止条件である。
- 推奨案: M2では再実行可能なSQLまたはSupabase local手順とチェックリストで検証し、結果を作業記録に残す。M7で再実行する。
- 代替案: 初期からCI自動化する。安全性は高いがM0/M1の準備負荷が大きい。
- 判断者: human reviewer
- 判断期限: M0完了前。M2-00前。
- 未解消時の停止範囲: M2-00以降、M3/M4 RPC。

## Q-03 human review gate運用

- 質問: migration、RLS policy、grant/revoke、security definer、RPC、認可境界Data Accessのレビュー承認者、事前資料、承認記録保存先、差し戻し時の停止範囲をどう運用するか。
- 背景: `db-migration-rls-policy.md` はDB/RLS/security definer変更の人間レビューを必須としている。
- 推奨案: PR本文を正式承認記録とし、PR前作業はdocs内の軽量worklogで補完する。承認なしのDB/RLS/RPC変更は完了扱いにしない。
- 代替案: docs内worklogだけを正式記録にする。PRとの対応が追いにくくなる。
- 判断者: project owner / human reviewer
- 判断期限: M0完了前。
- 未解消時の停止範囲: M2以降のDB/RLS/RPC/security definer、認可境界Data Access。

## Q-04 研究ライン名重複の正規化範囲

- 質問: 研究ライン名の重複判定は、前後空白trimのみでよいか。大文字小文字、全角半角、Unicode正規化まで同一視するか。
- 背景: 文書では同一ユーザー内の未アーカイブ研究ライン名重複不可とあるが、正規化範囲は未確定。
- 推奨案: v1では前後空白trim後の完全一致だけを重複扱いにする。
- 代替案: 大文字小文字まで同一視する。全角半角やUnicodeまで扱う案はv1には重い。
- 判断者: project owner
- 判断期限: M2-05 index/constraint、M2-12 Research Line Data Access前。
- 未解消時の停止範囲: M2-05、M2-12、M2-13。

## Q-05 `brewed_at` のタイムゾーン、表示、検索境界

- 質問: T1の「日付」をどのtimezoneで保存・表示し、T3の日付範囲検索境界をどう作るか。
- 背景: DBは `timestamptz`、UIは「日付」、履歴は日付範囲絞り込みであり、timezone未決だと検索結果がずれる。
- 推奨案: v1では日本語UI前提としてJSTカレンダー日で扱い、検索はJSTの開始以上・翌日開始未満で行う。
- 代替案: ブラウザlocal timezoneで扱う。ユーザー環境には自然だが、timezone変更やE2Eでずれやすい。
- 判断者: project owner / human reviewer
- 判断期限: M3 T1日付入力前、M5 T3日付絞り込み前。
- 未解消時の停止範囲: M3-05、M5-01、M5-02。

## Q-06 RPC別エラー識別子とAppError分類

- 質問: `save_trial_with_ingredients`、`clone_trial`、`soft_delete_trial` の失敗条件を、どのSQLSTATEまたは内部識別子で返し、どのAppErrorへマッピングするか。
- 背景: AppError分類は文書にあるが、RPC実装時の安定した識別子は未確定である。
- 推奨案: RPCは安定した内部エラー識別子を返し、Data Accessで `AUTH_REQUIRED`、`FORBIDDEN`、`NOT_FOUND`、`VALIDATION_ERROR`、`CONFLICT`、`SERVER_ERROR` へ明示マッピングする。UIには識別子やSQLを表示しない。
- 代替案: PostgreSQL標準SQLSTATEだけで分類する。業務エラーの粒度が不足する可能性がある。
- 判断者: human reviewer
- 判断期限: 各RPC設計レビュー前。
- 未解消時の停止範囲: M3/M4 RPC migration、Trial Data Access、T1/T2 UI接続。

## Q-07 `clone_trial` 即DB作成後の編集/放置試行

- 質問: `clone_trial` が即DBに新規試行を作った後、ユーザーが編集せず閉じた場合、その複製試行をそのまま残すか、どう扱うか。
- 背景: 文書上、`clone_trial` は新しい試行IDを返すRPCであり、form-only cloneではない。
- 推奨案: 現行設計どおり即DB作成を維持し、不要な複製は通常の論理削除で扱う。自動削除や未保存cloneはv1では導入しない。
- 代替案: clone後に未保存状態として扱う。RPC契約と衝突し、v1の責務が増える。
- 判断者: project owner
- 判断期限: M4 clone UI前。
- 未解消時の停止範囲: M4-01のUI接続、M4-04、clone E2E。

## Q-08 Supabaseバックアップ状況と手動エクスポート手順

- 質問: Supabaseのbackup状況と手動export手順を、誰がいつどこに記録するか。
- 背景: ユーザー向けexport UIはv1非対象だが、運用側のbackup/export確認は `app-rdd.md` で必要とされている。
- 推奨案: M8までにSupabase planのbackup可否と手動export手順を確認し、作業記録に残す。UIは作らない。
- 代替案: 本番後に確認する。DB事故時の復旧手順がないため非推奨。
- 判断者: project owner
- 判断期限: M8完了前。本番deploy前。
- 未解消時の停止範囲: M8-03、M8-04、本番deploy。

## Q-09 CI/手動テストコマンドと未実施記録形式

- 質問: npm scripts、CI必須範囲、手動確認範囲、未実施記録形式をどう固定するか。
- 背景: 技術スタックはテスト種別を定義しているが、現時点では実際の `package.json` scriptsが未作成である。
- 推奨案: M1の最初の実装PRで `lint`、`typecheck`、`test`、`test:e2e`、`build` 相当を固定し、RLS/RPCはM2の検証方式に従う。未実施は「項目、理由、代替確認、残リスク、次の確認者/期限」で記録する。
- 代替案: すべてを初期からCI必須化する。安全性は高いが初期負荷が大きい。
- 判断者: human reviewer
- 判断期限: M0完了前。scripts名自体はM1初回実装PRで確定。
- 未解消時の停止範囲: M7完了、M8 deploy、PR完了報告。

## Q-10 作業記録と承認記録の保存先

- 質問: human review、未実施検証、残リスク、承認記録をPR本文、docs内worklog、または両方のどこへ残すか。
- 背景: チャットだけでは後続エージェントが参照できず、レビュー証跡にならない。
- 推奨案: PR本文を正式記録とし、PR前やAI単独作業はdocs内の軽量worklogで補完する。
- 代替案: docs内worklogだけを正本にする。PRとの対応が追いにくい。
- 判断者: project owner
- 判断期限: M0完了前。
- 未解消時の停止範囲: M2以降のレビュー必須タスク、M7/M8証跡確認。
