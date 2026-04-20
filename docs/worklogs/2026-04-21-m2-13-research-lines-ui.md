# Worklog: M2-13 research_lines UI

## 確認対象

- 今回の判断根拠: `ローカル作業ツリー`
- 公開 repo / 既定ブランチ確認: 作業開始時に `git fetch origin main` を実行し、`HEAD` と `origin/main` が `4ec6ee49cbc010e2c0c4a87cf49a7ae1aca3fbb7` で一致していることを確認した
- 作業名: `M2-13 research_lines UI`
- 日付: 2026-04-21
- 変更分類: UI / Auth / Docs / Test
- 完了運用分類: 大きなコード変更
- 分類理由: 認証済み画面の実行時挙動、Data Access呼び出し、保存/アーカイブ操作、画面状態、component testを追加するため
- 変更対象:
  - `src/app/research-lines/page.tsx`
  - `src/app/research-lines/detail/page.tsx`
  - `src/components/research-lines/research-lines-list-client.tsx`
  - `src/components/research-lines/research-line-detail-client.tsx`
  - `src/components/research-lines/research-lines-list-client.test.tsx`
  - `src/components/layout/page-shell.tsx`
  - `src/components/ui/text-area.tsx`
- 先行差分の取り込み:
  - `origin/main` に未反映だった `origin/codex/m2-02-research-lines-verification-closure` から、`research_lines` verification closure と Data Access commit を cherry-pick した
  - 取り込み commit: `a813853`, `bda77c2`, `5cb6c52`, `bed53d8`
- 危険変更workflow該当: なし。今回新規に DB / RLS / RPC / Data Access 契約を変更していない。取り込んだ Data Access 差分は既存 `docs/worklogs/2026-04-21-m2-10-research-lines-data-access.md` に監査記録あり
- 人間確認: 不要。v1スコープ変更、Production、secret、本番データ、不可逆操作には触れていない

## 正本

- 正本ファイル:
  - `AGENTS.md`
  - `docs/mvp-scope-contract.md`
  - `docs/app-lld.md`
  - `docs/app-design.md`
  - `docs/screen-acceptance-criteria.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/deployment-contract.md`
  - `docs/implementation-plan-v1.md`
- 正本で固定した定義 / 正式項目 / 停止条件:
  - `research_lines` は一覧、作成、編集、アーカイブを v1 で扱う
  - 通常一覧は `archived_at IS NULL` の active list を基本にする
  - 保存は既存 Data Access 経由にし、UIからSupabase Clientを直接呼ばない
  - 研究ラインの物理削除APIやUIは作らない
  - ID付き画面は `/research-lines/detail/?id=<research_line_id>` の固定ルート + query parameter 方式にする
  - モバイル1カラム、ラベル明示、loading / empty / error / save failure / archive confirmation を持つ
- 正本を先に修正した確認: 既存正本に今回のUI要件が含まれているため、正本文書本文は変更せず、実装後に本worklogへ証跡を残す

## GitHub反映状況

- GitHubに反映済み: push前。完了前に `main` へ push し、最終報告で反映 branch と最終 commit hash を示す
- 反映ブランチ: `main`
- 反映確認に使ったコミット識別情報: push後に最終報告で示す
- CI確認の要否判断: 必須。大きなコード変更であり、かつ本worklog追加により `main` push の docs workflow 対象になるため
- CI結果 / 未確認理由: push後に確認する。コード側のCI workflowは現状存在しないため、ローカル軽量確認を代替確認にする

## 変更ファイル一覧

- `src/app/research-lines/page.tsx`: 研究ライン一覧 client UIへ接続
- `src/app/research-lines/detail/page.tsx`: query parameter detail/edit UIへ接続
- `src/components/research-lines/research-lines-list-client.tsx`: active list、作成、空/loading/error、archive確認、archive後除外を実装
- `src/components/research-lines/research-line-detail-client.tsx`: detail取得、編集、duplicate/validation/generic error、archive確認を実装
- `src/components/research-lines/research-lines-list-client.test.tsx`: active list、duplicate error表示、archive後除外を軽量確認
- `src/components/layout/page-shell.tsx`: desktopでも認証済み主要画面へ移動できる header nav を追加
- `src/components/ui/text-area.tsx`: ラベル付き textarea UI を追加
- `docs/worklogs/2026-04-21-m2-13-research-lines-ui.md`: 今回の正式記録

## 整合確認の証拠

- 新しい解釈が存在する検索:
  - `rg -n "ResearchLinesListClient|ResearchLineDetailClient|archiveResearchLine|listActiveResearchLines|詳細と編集" src`
- 旧解釈が消えた検索:
  - `rg -n "ProtectedFoundationPage title=\"研究ライン\"" src/app/research-lines`
- docs-only / 影響差分の確認:
  - `git diff -- src/app/research-lines/page.tsx src/app/research-lines/detail/page.tsx src/components/research-lines src/components/layout/page-shell.tsx src/components/ui/text-area.tsx`

## 実行コマンドと結果

| コマンド | 用途 | 結果 |
|---|---|---|
| `git fetch origin main` | 最新 `origin/main` 確認 | 成功。開始時 `HEAD` / `origin/main` は `4ec6ee49cbc010e2c0c4a87cf49a7ae1aca3fbb7` |
| `git cherry-pick e7e2cd3 292e528 00baebd e911913` | 未反映 Data Access / verification 証跡の安全な取り込み | 成功。`main` が4 commit先行 |
| `npx prettier --write ...` | 変更ファイル整形 | 成功 |
| `npm run test -- src/components/research-lines/research-lines-list-client.test.tsx src/lib/research-lines/data-access.test.ts` | 変更ファイル中心の unit / component test | 成功。2 files / 12 tests passed |
| `npm run typecheck` | 型整合確認 | 成功 |
| `npx eslint src/components/research-lines/research-lines-list-client.tsx src/components/research-lines/research-line-detail-client.tsx src/components/research-lines/research-lines-list-client.test.tsx src/components/ui/text-area.tsx src/components/layout/page-shell.tsx src/app/research-lines/page.tsx src/app/research-lines/detail/page.tsx` | 変更範囲 lint | 成功 |
| `rg -n -g '!docs/**' -g '!README.md' 'SUPABASE_SERVICE_ROLE_KEY\|service_role\|DB_CONNECTION\|DATABASE_URL\|OPENAI_API_KEY\|R2_\|STORAGE_' .` | secret / service role混入確認 | 0件 |
| `rg -n -g '!docs/**' -g '!README.md' 'from\\([''\\\"]trials[''\\\"]\\)\\.(insert\|update\|upsert\|delete)\|from\\([''\\\"]trial_ingredients[''\\\"]\\)\\.(insert\|update\|upsert\|delete)' .` | trial系 direct write 混入確認 | 0件 |
| `rg --files -g '!docs/**' -g '!README.md' \| rg '(^\|/)(pages/api\|app/api\|functions)(/\|$)'` | API Routes / Functions 混入確認 | 0件 |
| `rg --files -g '!docs/**' -g '!README.md' \| rg '\\[[^/]+\\]'` | 静的export禁止の動的route混入確認 | 0件 |
| `rg -n -g '!docs/**' -g '!README.md' -g '!package-lock.json' -g '!supabase/verification/sql/m2-db-slice-verification-template.sql' 'public_slug\|share_token\|visibility\|follow\|comment\|reaction\|photo\|storage\|AI提案\|compare\|graph' .` | v1対象外導線の混入確認 | 0件 |
| `npm run check:docs` | worklog追加後の運用文書確認 | 成功。Operational docs check passed |

## 完了判断

- 完了扱いにできる理由:
  - 認証済み `/research-lines/` で active list、作成、空状態、loading、error、各itemからの詳細/編集導線、archive確認が見える
  - `/research-lines/detail/?id=...` で既存 line の title / description 編集と archive確認ができる
  - 保存と archive は既存 `research_lines` Data Access 経由で、UIからSupabase Clientやdelete APIを追加していない
  - validation / duplicate / generic error をUI上で分け、保存失敗時に入力を保持する
- worklogに記録した成立済み事項:
  - `origin/main` 最新確認と未マージ Data Access 差分の取り込み
  - UI / Auth / Data Access接続 / Test の変更範囲
  - 実施した軽量検証と heavy 検証を避けた理由
- あえて未解消として残した事項:
  - 試行テーブル未接続のため、L1カードの試行数 / 最終試行日は今回出していない
  - Supabase実接続、local Supabase、Playwright、full build は低負荷方針に従い未実施

## 大きなコード変更 / 危険変更でのみ必須の追加項目

- 適用フェーズ / 適用範囲: v1 M2-13 `research_lines` UI
- 影響レイヤー: UI / Auth / Docs / Test

## 採用方針

- 採用した方針:
  - 新規 route や API を増やさず、既存 `/research-lines/` と `/research-lines/detail/?id=...` を実画面化する
  - 作成は一覧上、編集と詳細は detail query route 上に置き、list item から自然に到達させる
  - archiveは確認パネルを挟み、成功後は active list から除外する
  - UI状態管理はReact state/effectに留め、追加ライブラリや過剰な抽象化を避ける
- 優先軸: 現行フェーズ整合、安全性、単純性、監査可能性、低負荷検証
- 根拠文書:
  - `docs/mvp-scope-contract.md`
  - `docs/app-lld.md`
  - `docs/app-design.md`
  - `docs/screen-acceptance-criteria.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/deployment-contract.md`
  - `docs/implementation-plan-v1.md`
- 退けた代替案:
  - 研究ライン作成/編集用の新規固定routeを増やす案は、今回の目的に対して導線と検証が増えるため退けた
  - UIからSupabaseを直接呼ぶ案は、Data Access契約違反のため退けた
  - archiveを native confirm だけで済ませる案は、既存試行が残る説明を表示しにくいため退けた
  - 試行数 / 最終試行日を仮表示する案は、現在の `main` に trials table / Data Access がないため退けた

## 変更内容

- 追加:
  - 研究ライン一覧 client UI
  - 研究ライン詳細 / 編集 client UI
  - ラベル付き textarea
  - 研究ライン一覧 component test
- 更新:
  - `/research-lines/` と `/research-lines/detail/` の実画面接続
  - desktop header nav
- 削除: なし
- 更新した文書:
  - `docs/worklogs/2026-04-21-m2-13-research-lines-ui.md`

## 正本ファイルの証拠抜粋

- `docs/mvp-scope-contract.md`: MVP-02 は研究ライン作成・編集・アーカイブを含み、物理削除はv1で実装しない
- `docs/screen-acceptance-criteria.md`: L1 は作成・編集・アーカイブ、active list、空/loading/error、archive確認を求める
- `docs/supabase-data-access-error-contract.md`: Research Lines の通常一覧は `archived_at IS NULL`、作成/編集は validation / conflict / forbidden を扱う
- `docs/deployment-contract.md`: ID付き画面は固定route + query parameter方式を使う

## 未実施検証 / 停止条件

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| `supabase start` / Docker / local DB検証 | 今回は低スペック環境前提で重いDB検証を避ける指示があるため | 既存 Data Access test、RLS worklog、UI component test、scope検索 | 実Supabase runtime固有の通信やRLS差異は残る | 実環境接続やM3以降のDB依存UIを完了扱いにする場合 |
| Playwright / E2E | 今回は重いE2Eを常用しない指示があるため | component testで主要UI状態、typecheck、eslintで代替 | 実ブラウザでの390x844/1280x800視覚崩れは未確認 | リリース前M7画面受け入れ確認時 |
| full build | 今回は毎回のfull buildを避ける指示があり、静的route追加ではなく既存固定routeの中身変更に留まるため | typecheck、target lint、fixed route / dynamic route検索 | Next static export時の細部差異は残る | deploy経路変更、route追加、M8 static build確認時 |
| L1の試行数 / 最終試行日表示 | 現在の `main` に trials table / trials Data Access がなく、仮値を出すと誤解を生むため | 研究ライン本体の active list と detail/edit/archiveを先に閉じた | 完全なL1受け入れ基準には後続の trials 接続が必要 | trials Data Access導入後にL1を完了扱いにする場合 |

## 人間確認

- 質問: なし
- 回答: N/A
