# Worklog: lightweight change ops separation

## 確認対象

- 今回の判断根拠: `ローカル作業ツリー`
- 公開 repo / 既定ブランチ確認: `origin = https://github.com/iwachacha/chai-lab.git`, `main`
- 作業名: 軽微変更の記録密度を最小セットへ分離
- 日付: 2026-04-21
- 変更分類: Docs
- 完了運用分類: 軽微変更
- 分類理由: 運用文書とtemplateの整理だけを行い、実装コード、DB / RLS / RPC、Auth Redirect、env境界、deploy経路の実体変更には触れていないため
- 変更対象: `AGENTS.md`, `docs/agent-relationship-governance.md`, `docs/agent-workflow.md`, `docs/codex-execution-rules.md`, `docs/templates/worklog.md`, `.github/pull_request_template.md`, `docs/worklogs/2026-04-21-lightweight-change-ops-separation.md`
- 危険変更workflow該当: なし。危険変更そのものではなく、危険変更workflowの説明整理のみ
- 人間確認: 不要

## 正本

- 正本ファイル: `AGENTS.md`, `docs/agent-workflow.md`, `docs/templates/worklog.md`
- 正本で固定した定義 / 正式項目 / 停止条件: 軽微変更は `全変更共通の必須項目` だけを最小セットとして記録し、大きなコード変更または危険変更でだけ追加項目を必須にする。変更がある場合の GitHub反映必須、CI要否判断の記録、危険変更workflow、DB / RLS / RPC と Deploy / Auth の停止条件は維持する
- 正本を先に修正した確認: `AGENTS.md` と `docs/agent-workflow.md` を先に更新し、その後に `docs/agent-relationship-governance.md`, `docs/codex-execution-rules.md`, `docs/templates/worklog.md`, `.github/pull_request_template.md` を追従させた

## GitHub反映状況

- GitHubに反映済み: このworklogを含む変更は `main` へのpush確認を完了条件とする
- 反映ブランチ: `main`
- 反映確認に使ったコミット識別情報: push後の最終コミットを正とする
- CI確認の要否判断: 不要。docs-only の運用文書更新であり、`.github/workflows/**`、`scripts/check-operational-docs.mjs`、`package.json` の検証コマンド、deploy / release経路を変更していないため
- CI結果 / 未確認理由: 未確認。要否判断どおり省略し、ローカルの `npm run check:docs` を完了条件に含める

## 変更ファイル一覧

- `AGENTS.md`
- `docs/agent-relationship-governance.md`
- `docs/agent-workflow.md`
- `docs/codex-execution-rules.md`
- `docs/templates/worklog.md`
- `.github/pull_request_template.md`
- `docs/worklogs/2026-04-21-lightweight-change-ops-separation.md`

## 整合確認の証拠

- 新しい解釈が存在する検索: `rg -n --glob '!docs/worklogs/**' --glob '!node_modules/**' --glob '!.git/**' '全変更共通の必須項目|大きなコード変更 / 危険変更でのみ必須の追加項目|危険変更workflowは、変更そのものが|軽微変更の完了条件は次とする' AGENTS.md docs .github`
- 旧解釈が消えた検索: `rg -n --glob '!docs/worklogs/**' --glob '!node_modules/**' --glob '!.git/**' '変更規模の分類と完了条件|Codexの最終報告には、次をこの順で含める|記録する項目:' AGENTS.md docs .github`
- docs-only / 影響差分の確認: `git diff -- AGENTS.md docs/agent-relationship-governance.md docs/agent-workflow.md docs/codex-execution-rules.md docs/templates/worklog.md .github/pull_request_template.md docs/worklogs/2026-04-21-lightweight-change-ops-separation.md`

## 実行コマンドと結果

| コマンド | 用途 | 結果 |
|---|---|---|
| `git remote get-url origin` | 公開 repo の確認 | 成功。`https://github.com/iwachacha/chai-lab.git` |
| `git branch --show-current` | 反映対象ブランチの確認 | 成功。`main` |
| `git rev-parse HEAD` | 作業開始時点のローカル基準確認 | 成功。`a92faff303e6f4df682abd4d9a4459597af52afe` |
| `rg -n --glob '!docs/worklogs/**' --glob '!node_modules/**' --glob '!.git/**' '全変更共通の必須項目|大きなコード変更 / 危険変更でのみ必須の追加項目|危険変更workflowは、変更そのものが|軽微変更の完了条件は次とする' AGENTS.md docs .github` | 新しい運用表現の残存確認 | 成功 |
| `rg -n --glob '!docs/worklogs/**' --glob '!node_modules/**' --glob '!.git/**' '変更規模の分類と完了条件|Codexの最終報告には、次をこの順で含める|記録する項目:' AGENTS.md docs .github` | 旧解釈の残存確認 | 該当なしを確認 |
| `npm run check:docs` | 運用文書と導線の整合確認 | 成功。`Operational docs check passed (32 markdown files).` |

## 完了判断

- 完了扱いにできる理由: 現行の正本とtemplateで、軽微変更は最小記録、大きなコード変更と危険変更は追加記録という切り分けを明文化しつつ、GitHub反映必須、CI毎回必須ではない方針、危険変更workflow、DB / RLS / RPC と Deploy / Auth の安全柵を維持できる構成へ収束したため
- worklogに記録した成立済み事項: 軽微変更の最小必須記録、危険変更 / 大きなコード変更の追加記録、DB / RLS / RPC 専用追記事項、軽微変更向けの簡潔な完了報告構成、`npm run check:docs` 成功を正本へ反映した
- あえて未解消として残した事項: `docs/worklogs/**` に残る旧運用の重い記述や旧判断は履歴として残し、現行の根拠は更新した正本とtemplateを参照する
