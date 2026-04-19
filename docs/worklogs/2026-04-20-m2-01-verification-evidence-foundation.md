# Worklog: M2-01 verification and evidence foundation

## 対象

- 作業名: M2-01 検証/証跡土台整理
- 対象単位: M2-01 reusable non-production DB verification foundation
- 日付: 2026-04-20
- 変更分類: Docs / DB / RLS / Test
- 完了運用分類: 軽微変更
- 分類理由: `supabase/` 配下の非危険な土台、検証手順、SQLテンプレート、worklog記録様式の整備だけを行い、実テーブル、実RLS、実grant/revoke、実helper、実RPCには触れていないため
- 適用フェーズ / 適用範囲: v1 M2-01
- 変更対象: `supabase/README.md`, `supabase/migrations/README.md`, `supabase/verification/README.md`, `supabase/verification/m2-db-verification-checklist.md`, `supabase/verification/sql/m2-db-slice-verification-template.sql`, `supabase/verification/runs/README.md`, `docs/templates/worklog.md`, `docs/worklogs/2026-04-20-m2-01-verification-evidence-foundation.md`
- 参照したSQL / 手順書 / 証跡ファイル: `supabase/verification/m2-db-verification-checklist.md`, `supabase/verification/sql/m2-db-slice-verification-template.sql`, `supabase/verification/runs/README.md`
- 危険変更workflow該当: あり。対象はDB/RLS危険変更へ入る前の検証/証跡土台整理であり、実変更は未着手
- 人間確認: 不要。実Supabase project、Production URL、secret、Preview/Production接続、本番deployには触れていない

## 採用方針

- 採用した方針: `supabase/` 配下に、migration用の空ディレクトリ導線と、非本番で再利用する検証資産を分離して置いた。検証観点は「常時必須」と「条件付き必須」に分け、sliceごとにN/A理由を残す運用にした。正式証跡は引き続きworklogまたはPR本文とし、`supabase/verification/` は補助証跡参照先として扱う。
- 優先軸: 安全性、監査可能性、再利用性、変更容易性
- 根拠文書: `docs/implementation-plan-v1.md`, `docs/db-migration-rls-policy.md`, `docs/agent-workflow.md`, `docs/templates/worklog.md`, `docs/worklogs/2026-04-20-m2-00-db-change-split-review.md`
- 退けた代替案: M2-02の`research_lines`実装に必要なDDLやRLS雛形を先回りして置く案は、今回の禁止事項に当たるため退けた。チャットだけを証跡にしてworklogは据え置く案は、参照したSQLや補助証跡ファイルが後追いできないため退けた。

## 変更内容

- 追加: `supabase/` のREADME、`migrations/` のREADME、`verification/` のREADME、DB slice再利用用チェックリスト、検証SQLテンプレート、補助証跡ディレクトリREADME。
- 更新: `docs/templates/worklog.md` に対象単位と参照ファイル欄を追加。
- 削除: なし。
- 更新した文書: `docs/templates/worklog.md`, `docs/worklogs/2026-04-20-m2-01-verification-evidence-foundation.md`

## 検証

| 種別 | 実施内容 | 結果 |
|---|---|---|
| 参照整合 | M2-00 worklog、implementation plan、DB/RLS policy、agent workflow、worklog templateを再確認 | 成功 |
| ローカル検証 | `npm run check:docs` | 成功 |
| 動作確認 | `supabase/` 配下がmigrationとverificationで分離され、実migrationや実RLS本文を含まないことを差分確認。`git diff --check` はLF→CRLF warningのみで終了コード0 | 成功 |
| 実装テスト | 対象外。今回は非危険な検証土台整備のみ | 対象外 |
| push / CI | 軽微変更のため未実施 | 未実施 |

## 未実施検証

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| A/B、anon、trim、deleted、direct CRUDの実DB検証 | 今回は検証土台の固定のみで、実DB変更も非本番接続も未着手のため | チェックリストとSQLテンプレートで実施順と記録項目を固定 | 実施時に検証者が環境準備で止まる可能性 | M2-02以降で適用観点またはN/A理由が空欄のままなら停止 |
| direct CRUD負テストの実行 | `trials` / `trial_ingredients` の実権限変更がまだ存在しないため | checklistで「grepだけでは不十分」とDB権限読み戻し併用を固定 | 実sliceで負テストが後送りになる可能性 | M2-07または対象sliceでSQL負テスト、grant/revoke確認、コード検索の3点が揃わない場合は停止 |

## 停止条件

- AI自己監査結果: M2-01の土台整理として通過。以後のsliceで、対象単位、参照SQL、未実施理由、残リスク、次に止める条件を必須証跡にした。
- 残る停止条件: 実DB変更未着手、非本番検証環境未固定、A/B/anonの実行方法未実証、実migration未作成。
- 次に止める条件: 実sliceでN/A理由なしに検証観点を飛ばす、`supabase/verification/` のテンプレートを参照せず記録項目が欠ける、補助証跡と正式証跡の紐付けがない。

## 完了判断

- 完了扱いにできる理由: `supabase/` の非危険な土台、再利用可能な検証手順/チェックリスト、検証SQLテンプレート、補助証跡置き場、worklogの固定項目を揃えたため
- 大きなコード変更の場合のCI結果: 対象外。
- 軽微変更の場合にpush/CI監視を省略した理由: docs主体の土台整備であり、ローカルdocsチェックを完了条件にするため
- 後続で見直す条件: 非本番検証方式がSupabase local運用と衝突する場合、または補助証跡の置き場を別パスへ移す必要が出た場合
