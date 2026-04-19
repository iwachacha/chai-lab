# Worklog: M2-00 DB change split review

## 対象

- 作業名: M2-00 DB変更分割計画レビュー
- 日付: 2026-04-20
- 変更分類: Docs / DB / RLS / Test / Data Access
- 完了運用分類: 軽微変更
- 分類理由: 実装コード、migration、実環境接続は変更しておらず、M2の危険領域へ入る前の分割計画、停止条件、証跡方針の文書化に限定したため。
- 適用フェーズ / 適用範囲: v1 M2-00
- 変更対象: `docs/implementation-plan-v1.md`, `docs/worklogs/2026-04-20-m2-00-db-change-split-review.md`
- 危険変更workflow該当: あり。対象はM2のDB/RLS/RPC危険変更計画レビューであり、実DB変更そのものは未着手
- 人間確認: 不要。実Supabase project、Production URL、secret、Preview/Production接続、本番deployには触れていない

## 採用方針

- 採用した方針: M2のDB変更を水平分割ではなく、`research_lines` を最初の閉じたDB sliceにする縦切り順へ見直した。`trials` / `trial_ingredients` / `trial_stars` はDDL、helper、RLS/policy、grant/revoke、検証を依存順に段階化し、未検証のままUIやRPCへ進まない停止条件を明文化した。
- 優先軸: 安全性、監査可能性、可逆性、変更容易性
- 根拠文書: `AGENTS.md`, `docs/INDEX.md`, `docs/agent-relationship-governance.md`, `docs/agent-workflow.md`, `docs/codex-execution-rules.md`, `docs/mvp-scope-contract.md`, `docs/app-rdd.md`, `docs/app-lld.md`, `docs/db-migration-rls-policy.md`, `docs/supabase-data-access-error-contract.md`, `docs/deployment-contract.md`, `docs/implementation-plan-v1.md`, `docs/m0-readiness-gate.md`, `docs/m0-decision-matrix.md`, `docs/screen-acceptance-criteria.md`, `docs/templates/worklog.md`
- 退けた代替案: 4テーブルDDLを先にまとめ、その後にRLS/policy/grant/revokeを一括で入れる案は、失敗時の切り戻し範囲が広く、`research_lines` を最初の安全な閉じた単位にできないため退けた。grepだけでdirect CRUD拒否を確認する案は、DB grant/revokeと負の検証が欠けるため退けた。

## 変更内容

- 追加: M2-00として、変更単位、検証単位、停止条件、証跡単位を揃えるレビュー結果の正式記録。
- 更新: `docs/implementation-plan-v1.md` のM2セクションを、`research_lines` 先行の縦切り順、4テーブル横断検証、Data Access/UI完了まで含むゲートに更新。
- 削除: なし。
- 更新した文書: `docs/implementation-plan-v1.md`, `docs/worklogs/2026-04-20-m2-00-db-change-split-review.md`

## 検証

| 種別 | 実施内容 | 結果 |
|---|---|---|
| 参照整合 | 必須文書一式とM1実装状態を読んで、M2に影響する前提と齟齬を確認 | 成功 |
| ローカル検証 | `npm run check:docs` | 成功 |
| 動作確認 | `git status`、`rg --files`、M1の固定ルート/Auth/Data Access実装、`supabase/` 未作成、業務データ接続未着手を確認 | 成功 |
| 機械確認 | `rg -n "from\\(|rpc\\(" src tests` | 該当なし。現時点で業務テーブルの直接CRUDやRPC呼び出し実装は未着手 |
| 実装テスト | 対象外。docs-onlyの計画レビューであり、DB/RLS/RPC実装は未着手 | 対象外 |
| push / CI | 軽微変更のため未実施 | 未実施 |

## 未実施検証

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| A/Bユーザー、anon、trim、deleted、direct CRUD、RPCの実検証 | 実DB変更と非本番検証環境にまだ入っていないため | 検証観点と停止条件をM2-01/M2-09へ分解して先に固定 | 実装時に検証漏れが起きる余地は残る | M2-02以降で実検証項目が1つでも未定義または未記録のままなら停止 |
| `research_lines` / `trials` / `trial_ingredients` / `trial_stars` のmigration実行 | 今回は計画レビュー限定で、実装開始は禁止されているため | 現行文書とM1コードから依存関係を棚卸しした | 実装時にmigration粒度が再び粗くなる可能性 | 1 migrationに複数論理変更を混ぜる案が出た時点で停止 |

## 停止条件

- AI自己監査結果: 計画レビューとして通過。実装前に、M2-01の検証/証跡土台、M2-02の`research_lines`閉単位、M2-09の横断検証、M2-11の自己監査記録を必須ゲートにした。
- 残る停止条件: 実DB変更未着手、非本番検証未実施、`supabase/` migration基盤未作成、A/B/anon/direct CRUDの実検証未実施。
- 次に止める条件: `research_lines` をDDLだけで完了扱いにする案、`trials` / `trial_ingredients` のdirect CRUD拒否をgrepだけで済ませる案、`deleted_at` 除外をData Accessだけに寄せる案、RPCをM2でまとめて着手する案。

## 完了判断

- 完了扱いにできる理由: 今回の役割であるM2-00レビューとして、作業分割、依存関係、完了条件、停止条件、検証、証跡方針、最初の実装単位を文書へ反映できたため。
- 大きなコード変更の場合のCI結果: 対象外。
- 軽微変更の場合にpush/CI監視を省略した理由: docs-onlyの計画レビューで、現時点ではローカルdocsチェックを完了条件にするため。
- 後続で見直す条件: 非本番DB検証方式が実repo構成やSupabase local運用と衝突する場合、または`research_lines` を最初の閉単位にできない新しい文書根拠が出た場合。
