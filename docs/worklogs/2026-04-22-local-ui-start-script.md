# Worklog: Local UI start script

## 確認対象

- 今回の判断根拠: `ローカル作業ツリー`
- 公開 repo / 既定ブランチ確認: 作業開始時に `main...origin/main` で差分なしを確認した
- 作業名: `Local UI start script`
- 日付: 2026-04-22
- 変更分類: Deploy / Test / Docs
- 完了運用分類: 軽微変更
- 分類理由: 既存のNext.js dev serverを起動する補助スクリプト1件と作業記録のみで、アプリ挙動、DB/RLS/RPC、Auth契約、CI設定を変更しないため
- 変更対象: ローカルUI起動手順
- 危険変更workflow該当: なし
- 人間確認: 不要。Production、secret、本番データ、外部契約、不可逆操作には触れていない

## 正本

- 正本ファイル:
  - `AGENTS.md`
  - `docs/codex-execution-rules.md`
  - `docs/agent-workflow.md`
  - `docs/deployment-contract.md`
  - `package.json`
  - `scripts/start-local-ui.ps1`
- 正本で固定した定義 / 正式項目 / 停止条件:
  - 開発時の起動は既存の `npm run dev` と Next.js dev serverを使う
  - ローカルUIの入口は `/auth/`
  - v1の静的export契約、Auth Redirect契約、公開Supabase env境界は変更しない
- 正本を先に修正した確認:
  - 起動コマンド群は `scripts/start-local-ui.ps1` に集約した

## GitHub反映状況

- GitHubに反映済み: push後に完了報告で提示する
- 反映ブランチ: `main`
- 反映確認に使ったコミット識別情報: 完了報告時点の `origin/main` commit hashを提示する
- CI確認の要否判断: 不要。大きなコード変更ではなく、CI/workflow、`scripts/check-operational-docs.mjs`、deploy/release経路は変更していないため
- CI結果 / 未確認理由: CI未確認。代替確認としてローカル起動、HTTP 200確認、`npm run check:docs` を実施した

## 変更ファイル一覧

- `scripts/start-local-ui.ps1`: 依存関係確認、空きポート選定、Next dev server起動、起動待ち、ブラウザ起動をまとめたPowerShellスクリプトを追加
- `docs/worklogs/2026-04-22-local-ui-start-script.md`: 軽微変更の作業記録を追加

## 整合確認の証拠

- 新しい解釈が存在する検索:
  - `rg -n "start-local-ui|NEXT_PUBLIC_APP_ORIGIN|npm run dev" scripts docs/worklogs`
- 旧解釈が消えた検索:
  - N/A。既存の起動方法を置き換えず、補助ファイルを追加したため
- docs-only / 影響差分の確認:
  - `git status --short --branch`
  - `git diff -- scripts/start-local-ui.ps1 docs/worklogs/2026-04-22-local-ui-start-script.md`

## 実行コマンドと結果

| コマンド | 用途 | 結果 |
|---|---|---|
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-local-ui.ps1 -NoBrowser` | 既存サーバー検出と新規起動経路の確認 | 成功 |
| `Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:3000/auth/` | 起動後の認証画面HTTP確認 | 成功。`200` / title `chai-lab` |
| `npm run check:docs` | scripts追加後の運用文書確認 | 成功。Operational docs check passed |

## 完了判断

- 完了扱いにできる理由:
  - 起動用コマンド群が `scripts/start-local-ui.ps1` に1ファイルとしてまとまっている
  - 既存サーバー検出、新規起動、`/auth/` への到達確認が通っている
  - アプリ実装、DB/RLS/RPC、Auth契約、CI設定を変更していない
- worklogに記録した成立済み事項:
  - ローカル起動確認、HTTP確認、docs check結果
- あえて未解消として残した事項:
  - 実際のMagic Link配送とログイン後データ操作は、Supabase project設定とメール配送に依存するためこの起動スクリプトでは完了扱いにしない
