# Worklog: research_lines Data Access contract implementation

## 確認対象

- 今回の判断根拠: `ローカル作業ツリー`
- 公開 repo / 既定ブランチ確認: `origin/main` の最新確認コミットは `4ec6ee49cbc010e2c0c4a87cf49a7ae1aca3fbb7`。`HEAD` はそこから verification 補完 2 commit 先行で、差分は `docs/worklogs/2026-04-21-m2-02-research-lines-verification-closure.md` と `supabase/verification/**` に限られていたため、今回の作業は main 上の `research_lines` DB slice に対するアプリ側 Data Access 接続として開始した
- 作業名: 依頼文上の `M2-03: research_lines Data Access 契約実装`。現行 `docs/implementation-plan-v1.md` 上では `M2-10 研究ラインData Access` 相当として扱う
- 日付: 2026-04-21
- 変更分類: Data Access / Docs / Test
- 完了運用分類: 大きなコード変更
- 分類理由: 認可境界に関わる Data Access 追加、AppError 分類、contract test、契約文書更新、GitHub反映、CI要否判断が必要な変更だから
- 変更対象:
  - `src/lib/research-lines/data-access.ts`
  - `src/lib/research-lines/data-access.test.ts`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/worklogs/2026-04-21-m2-10-research-lines-data-access.md`
- 危険変更workflow該当: あり。認可境界に関わる Data Access 変更と AppError 分類を含む
- 人間確認: 不要。v1スコープ変更、Production、secret、本番データ、不可逆操作には触れていない

## 正本

- 正本ファイル:
  - `AGENTS.md`
  - `docs/app-lld.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/implementation-plan-v1.md`
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`
- 正本で固定した定義 / 正式項目 / 停止条件:
  - `research_lines` は owner の direct `insert / update` を許可するが physical `delete` は許可しない
  - `title` は trim 後保存で、DBも `title = btrim(title)` を強制する
  - active duplicate は `user_id + btrim(title)` の partial unique で拒否し、archive 後は同じ trim 後タイトルを再利用できる
  - 通常一覧では `archived_at IS NULL` を基本とし、新規試行選択用一覧でも archived line を返さない
  - 実Supabase local / preview での同一 probe 再実行は未完了のまま残っているため、それを完了扱いの根拠にしない
- 正本を先に修正した確認: migration / verification evidence / 契約文書を再読してDB意味を固定し、今回の正本更新は `docs/supabase-data-access-error-contract.md` のみ先に行ってから実装と test へ進めた

## GitHub反映状況

- GitHubに反映済み: 未実施。commit / push 後に最終反映状況を確定する
- 反映ブランチ: `codex/m2-02-research-lines-verification-closure`
- 反映確認に使ったコミット識別情報: commit / push 後に記入
- CI確認の要否判断: 必須。大きなコード変更かつ認可境界の Data Access 追加だから
- CI結果 / 未確認理由: repo の workflow は `.github/workflows/docs.yml` のみで、push 対象は `main` の docs 系 path に限定されている。現在の branch push では code CI を確認できないため、local の `lint` / `typecheck` / `test` / `build` / `check:docs` を代替確認として採用する

## 変更ファイル一覧

- `src/lib/research-lines/data-access.ts`: `research_lines` の owner-only list/detail/create/update/archive を `AppResult/AppError` 契約で追加
- `src/lib/research-lines/data-access.test.ts`: trim、validation、duplicate、archive reuse、default list 条件、auth、permission、no delete API を検証する contract test を追加
- `docs/supabase-data-access-error-contract.md`: `research_lines` Data Access の既定一覧条件、title normalize、archive後再利用、detail、no delete API を追記
- `docs/worklogs/2026-04-21-m2-10-research-lines-data-access.md`: 今回の正式記録

## 整合確認の証拠

- 新しい解釈が存在する検索:
  - `rg -n "listResearchLines|listActiveResearchLines|getResearchLineById|archiveResearchLine|delete API" src docs`
- 旧解釈が消えた検索:
  - `rg -n "research_lines の physical delete API" docs/supabase-data-access-error-contract.md`
- docs-only / 影響差分の確認:
  - `git diff -- src/lib/research-lines/data-access.ts src/lib/research-lines/data-access.test.ts docs/supabase-data-access-error-contract.md docs/worklogs/2026-04-21-m2-10-research-lines-data-access.md`

## 実行コマンドと結果

| コマンド                                                                                                                                                                                         | 用途                                                         | 結果                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------- |
| `npm run test -- src/lib/research-lines/data-access.test.ts`                                                                                                                                     | `research_lines` Data Access の contract test を先に局所確認 | 成功。9 tests passed                               |
| `npm run typecheck`                                                                                                                                                                              | 追加した Data Access / test の型整合確認                     | 成功                                               |
| `npm run lint`                                                                                                                                                                                   | ESLint 整合確認                                              | 成功                                               |
| `npm run check:docs`                                                                                                                                                                             | 契約文書 / worklog 整合確認                                  | 成功                                               |
| `npm run test`                                                                                                                                                                                   | 既存 unit test を含む全体回帰確認                            | 成功。3 files / 18 tests passed                    |
| `npm run build`                                                                                                                                                                                  | 静的 build と route 生成確認                                 | 成功。`/research-lines` と既存固定ルートを静的生成 |
| `rg -n 'from\\([''\\\"]trials[''\\\"]\\)\\.(insert\|update\|upsert\|delete)\|from\\([''\\\"]trial_ingredients[''\\\"]\\)\\.(insert\|update\|upsert\|delete)' src tests supabase scripts`         | `trials` / `trial_ingredients` direct write 混入確認         | 0件                                                |
| `rg -n 'SUPABASE_SERVICE_ROLE_KEY\|service_role\|DB_CONNECTION\|DATABASE_URL\|OPENAI_API_KEY\|R2_\|STORAGE_' src tests supabase scripts .env.example`                                            | secret / `service_role` 混入確認                             | 0件                                                |
| `rg -n -g '!supabase/verification/sql/m2-db-slice-verification-template.sql' 'public_slug\|share_token\|visibility\|follow\|comment\|reaction\|photo\|AI提案\|graph' src tests supabase scripts` | v1 scope 逸脱語の確認                                        | 0件                                                |

## 完了判断

- 完了扱いにできる理由:
  - `research_lines` の owner-only list / detail / create / update / archive が `AppResult` / `AppError` 契約で実装され、trim / duplicate / archive reuse / default list / no delete を test と文書で固定できたため
  - DB migration / verification evidence で確定済みの意味を変えず、app 側 normalize は title trim のみに限定し、その関係を契約文書へ明記できたため
  - local の `lint` / `typecheck` / `test` / `build` / `check:docs` が成功し、trial 系 direct write や secret / scope 逸脱の混入も確認できたため
- worklogに記録した成立済み事項:
  - `origin/main` との差分を確認したうえで、今回の branch には verification 補完だけが先行していたこと
  - `research_lines` Data Access の既定一覧条件、詳細取得、title trim normalize、duplicate / validation / auth / permission / unexpected の分類
  - delete API 非提供、archive後再利用、archived line の通常一覧除外と詳細参照許可
  - local 検証結果と CI 未提供時の代替確認
- あえて未解消として残した事項:
  - 実Supabase local / 分離Preview での同一 probe SQL 未再実行
  - L1 / L2 UI への接続

## 大きなコード変更 / 危険変更でのみ必須の追加項目

- 適用フェーズ / 適用範囲: v1 `research_lines` Data Access。依頼文の `M2-03` を、現行計画上の `M2-10` 相当タスクとして処理
- 影響レイヤー: Data Access / Docs / Test

## 採用方針

- 採用した方針:
  - DB migration と verification evidence が定義した意味を変更せず、アプリ側では title trim と auth / error / default filter だけを閉じ込める
  - `research_lines` は table direct write が契約上許可されているため、別 RPC や別 helper を追加せず既存 Supabase client 境界で実装する
  - duplicate / validation / auth / permission / unexpected は既存 `AppError` へ落とし込み、生の PostgREST message は UI 契約へ持ち込まない
  - archive 後再利用は DB unique 契約に従い、クライアント側の独自 duplicate cache で妨げない
- 優先軸: 現行フェーズ整合、安全性、単純性、監査可能性、可逆性
- 根拠文書:
  - `docs/app-lld.md`
  - `docs/db-migration-rls-policy.md`
  - `docs/supabase-data-access-error-contract.md`
  - `docs/implementation-plan-v1.md`
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`
- 退けた代替案:
  - duplicate 判定を一覧取得やクライアント内キャッシュで先回りする案は、archive 後再利用とDB unique契約を崩すため退けた
  - description まで trim / blank-to-null normalize する案は、DB契約にない意味変更を増やすため退けた
  - `research_lines` に対して RPC を追加する案は、owner direct `insert / update` が許可済みの slice を不必要に複雑化するため退けた

## 変更内容

- 追加:
  - `research_lines` Data Access 本体
  - `research_lines` contract test
- 更新:
  - `docs/supabase-data-access-error-contract.md`
  - 本worklog
- 削除: なし
- 更新した文書:
  - `docs/supabase-data-access-error-contract.md`

## 正本ファイルの証拠抜粋

- `supabase/migrations/20260420103000_create_research_lines_table.sql`: `title = btrim(title)` の check と `where archived_at is null` の unique index がある
- `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`: `authenticated` に `select / insert / update` だけを grant し、delete policy を作っていない
- `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`: trim境界、active duplicate 拒否、archive後再利用、physical delete拒否、owner success、A/B分離、anon拒否が pass
- `docs/implementation-plan-v1.md`: `M2-10` で trim保存、trim後重複、archived_at通常除外、new trial選択用active list を Data Access 責務へ閉じ込めると定義している

## 未実施検証 / 停止条件

| 未実施項目                                              | 理由                                                             | 代替確認                                                                                                                               | 残リスク                                                   | 次に止める条件                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 実Supabase local / 分離Previewでの同一 probe SQL 再実行 | 現時点でも `pglite` harness 以外の fixed local target がないため | main 上の migration / verification evidence を読み、Data Access test で trim / duplicate / archive / default list / no delete を閉じた | 実Supabase runtime 固有の差異はまだゼロとは言えない        | remote依存の後続作業で同一 probe を再実行できない場合は止める                  |
| L1/L2 UI接続                                            | 今回の目的が UI 拡張ではなく Data Access 契約固定だから          | Data Access 単体と docs で owner-only contract を固定した                                                                              | UI 実装時に default list / detail 使い分けを誤る余地は残る | UI が archived line を通常一覧へ出す、または delete 導線を追加する時点で止める |

## DB / RLS / RPC 専用追記事項

- 対象単位: `research_lines` Data Access 境界と AppError 分類
- 参照したSQL / 手順書 / 証跡ファイル:
  - `supabase/migrations/20260420103000_create_research_lines_table.sql`
  - `supabase/migrations/20260420104000_add_research_lines_access_policies.sql`
  - `supabase/verification/runs/2026-04-21-m2-02-research-lines-verification.md`
  - `docs/supabase-data-access-error-contract.md`
- N/Aにした検証観点と理由:
  - `security definer` hardening: `research_lines` Data Access は RPC / helper を追加していないため N/A
  - direct CRUD全面拒否: v1契約で owner の direct `insert / update` は許可されるため N/A。ただし physical delete API は提供していない
- 権限境界 / role:
  - `authenticated`: `research_lines` の owner-only `select / insert / update`
  - `anon`: Data Access では `AUTH_REQUIRED` で遮断し、DB側も grantなし
- RLS / policy matrix:
  - `SELECT`: `user_id = auth.uid()`
  - `INSERT`: `WITH CHECK (user_id = auth.uid())`
  - `UPDATE`: `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
  - `DELETE`: policyなし
- grant / revoke:
  - `REVOKE ALL ON TABLE public.research_lines FROM public, anon, authenticated`
  - `GRANT SELECT, INSERT, UPDATE ON TABLE public.research_lines TO authenticated`
- direct CRUD拒否確認:
  - `trials` / `trial_ingredients` への direct write は今回も追加していない
  - `research_lines` の physical delete API は未提供
- `security definer` hardening:
  - N/A
- AppError分類 / 失敗時挙動:
  - local validation と DB `23514` / `22P02` は `VALIDATION_ERROR`
  - DB `23505` は `CONFLICT`
  - DB `42501` は `FORBIDDEN`
  - `PGRST116` は `NOT_FOUND`
  - セッションなしは `AUTH_REQUIRED`
  - 通信断は `NETWORK_ERROR`
  - 上記以外は `SERVER_ERROR` または `UNKNOWN_ERROR`
