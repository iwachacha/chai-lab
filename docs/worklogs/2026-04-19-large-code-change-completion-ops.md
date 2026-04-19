# Worklog: Large Code Change Completion Ops

## 対象

- 作業名: 大きなコード変更時の完了条件運用の明文化
- 日付: 2026-04-19
- 変更分類: Docs
- 完了運用分類: 軽微変更
- 分類理由: docs-onlyの運用文書とテンプレート修正で、実装コードや実行時挙動を変更しないため。ただし入口、workflow、template更新のため `npm run check:docs` は実施する。
- 適用フェーズ / 適用範囲: 恒久運用文書
- 変更対象: `AGENTS.md`, `docs/agent-workflow.md`, `docs/codex-execution-rules.md`, `docs/templates/worklog.md`, `.github/pull_request_template.md`
- 危険変更workflow該当: なし
- 人間確認: 不要

## 採用方針

- 採用した方針: 大きなコード変更と軽微変更の分類、push/CIまで含む完了条件は `docs/agent-workflow.md` に集約し、`docs/codex-execution-rules.md` とテンプレートは参照と証跡欄に留める。
- 優先軸: 監査可能性、単純性、継続運用性
- 根拠文書: `AGENTS.md`, `docs/agent-workflow.md`, `docs/codex-execution-rules.md`, `docs/templates/worklog.md`
- 退けた代替案: AGENTSや複数文書へ同じ完了条件を重複記載する案は、保守時の衝突が増えるため退けた。全変更にpush/CI監視を強制する案は、小さなdocs-only修正まで重くなるため退けた。

## 変更内容

- 追加: 変更規模の分類、軽微変更の扱い、大きなコード変更の完了条件、UTF-8文書読み取り方法。
- 更新: Codex実行ルールからworkflow上の分類へ参照、作業記録とPRテンプレートへ分類・push/CI欄を追加。
- 削除: なし。
- 更新した文書: `AGENTS.md`, `docs/agent-workflow.md`, `docs/codex-execution-rules.md`, `docs/templates/worklog.md`, `.github/pull_request_template.md`

## 検証

| 種別 | 実施内容 | 結果 |
|---|---|---|
| 参照整合 | 更新箇所を差分確認し、主ルールが `docs/agent-workflow.md` に寄っていることを確認 | 成功 |
| ローカル検証 | `npm run check:docs` | 成功 |
| 動作確認 | 実装コード変更なし。文書上で分類、動作確認、push/CI、CI失敗時対応、未完了時の扱いが追えることを確認 | 成功 |
| 実装テスト | 対象外。docs-only変更のため実装テストは実施しない | 対象外 |
| push / CI | 軽微変更のためpush/CI監視は必須対象外 | 未実施 |

## 未実施検証

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| push後CI確認 | 今回の作業はdocs-onlyの軽微変更で、実装コードや実行時挙動を変更していないため | `npm run check:docs` と差分確認 | PR作成後のCI結果はこの作業記録時点では未確認 | PR化またはpush後にCIが失敗した場合 |

## 停止条件

- AI自己監査結果: 危険変更workflow対象外。運用文書変更として参照整合とdocsチェックを確認。
- 残る停止条件: なし。
- 次に止める条件: PR化またはpush後にdocs CIが失敗した場合。

## 完了判断

- 完了扱いにできる理由: 大きなコード変更時の完了条件と軽微変更の除外条件がworkflowに明文化され、テンプレートで証跡を残せる。docs-only変更として `npm run check:docs` が成功している。
- 大きなコード変更の場合のCI結果: 対象外。
- 軽微変更の場合にpush/CI監視を省略した理由: 実装コードや実行時挙動を変更しておらず、既存ルール上必要なdocsチェックで確認できるため。
- 後続で見直す条件: 実装コード変更を伴うPR運用が始まり、CI監視や再push手順をより細かく自動化する必要が出た場合。
