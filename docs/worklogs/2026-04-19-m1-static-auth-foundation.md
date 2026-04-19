# Worklog: M1 static auth foundation

## 対象

- 作業名: M1 static auth foundation
- 日付: 2026-04-19
- 変更分類: UI / Data Access / Auth / Deploy / Test / Docs
- 適用フェーズ / 適用範囲: v1 M1
- 変更対象: 静的Next.js骨格、固定ルート、Auth Callback、Supabase public client境界、AppResult/AppError、最小UI、npm scripts
- 危険変更workflow該当: あり。Auth Redirect、env境界、静的export制約に該当
- 人間確認: 不要。実Supabase project、Production URL、secret、Preview/Production接続には触れていない

## 採用方針

- 採用した方針: M1の許可範囲に限定し、Next.js静的export、固定ルート、ブラウザSupabase public client、Magic Link送信、`/auth/callback/` のquery code / fragment処理、URL cleanup、AppResult/AppError契約、最小UI基盤を実装した。
- 優先軸: v1整合、安全性、単純性、監査可能性
- 根拠文書: `docs/mvp-scope-contract.md`, `docs/implementation-plan-v1.md`, `docs/m0-readiness-gate.md`, `docs/deployment-contract.md`, `docs/supabase-data-access-error-contract.md`, `docs/screen-acceptance-criteria.md`, `docs/agent-workflow.md`
- 退けた代替案: DB/RLS/RPCへ進む案は、M1完了前かつ検証環境未確定のため退けた。Next.js API Routes / SSR / Server Actionsでcallbackを処理する案は静的export契約に反するため退けた。Radix UI追加はM1最小UIでは不要なため退けた。

## 変更内容

- 追加: Next.js / React / TypeScript / Tailwind / Supabase JS / Zod / Vitest / Playwright / ESLint / Prettier のM1基盤。
- 追加: `.nvmrc`, `.env.example`, `next.config.mjs`, `tsconfig.json`, ESLint/Vitest/Playwright/PostCSS設定。
- 追加: 固定ルート `/`, `/auth/`, `/auth/callback/`, `/home/`, `/research-lines/`, `/research-lines/detail/`, `/trials/new/`, `/trials/edit/`, `/trials/detail/`, `/trials/history/`, `/settings/`。
- 追加: `AppResult` / `AppError`、Supabase public client境界、Auth Data Access、callback URL正規化、open redirect防止、認証状態hook。
- 追加: A1認証画面、Auth Callback画面、未認証ガード、ログアウト、最小共通UI。
- 追加: callback URL / メール検証のunit test、A1入力検証のPlaywright test。
- 更新: `package.json` scripts、Node engines、npm lockfile。
- 更新した文書: このworklogのみ。

## 検証

| 種別 | 実施内容 | 結果 |
|---|---|---|
| 参照整合 | `npm run check:docs` | 成功 |
| format | `npm run format:check` | 成功 |
| lint | `npm run lint` | 成功 |
| typecheck | `npm run typecheck` | 成功 |
| unit | `npm run test` | 成功。2 files / 9 tests |
| e2e | `npm run test:e2e` | 成功。Chromium mobile 390x844 / desktop 1280x800でA1入力検証 |
| build | `npm run build` | 成功。静的route 13件生成、`/auth/callback` 生成確認 |
| scope/security search | secret、direct CRUD、API Routes / Functions、動的ルート、v1対象外キーワード検索 | 検出なし |
| diff hygiene | `git diff --check` | 成功。CRLF変換警告のみ |

## 未実施検証

| 未実施項目 | 理由 | 代替確認 | 残リスク | 次に止める条件 |
|---|---|---|---|---|
| 実Supabase projectでのMagic Link送信、code交換、fragment session確定 | Q-01の実環境接続、Redirect URL、secret/anon key設定に触れるためM1では実施しない | Auth Data Accessの型検査、callback URL unit test、静的callback route生成、A1入力検証E2E | 実Supabase設定不備はまだ検出できない | 実Supabase project、Production URL、Preview/Production接続を設定する直前 |
| 業務データの未認証ガードE2E | DB/RLSとテストユーザーが未作成で、M1では業務データ接続をしないため | AuthGate実装、固定route生成、secret/direct CRUD/API route検索 | 実セッション注入後の画面遷移は未確認 | M2以降で認証後画面をData Accessへ接続する前 |
| DB/RLS/RPC検証 | M1範囲外。DB migrationを作成していない | direct CRUD検索でアプリ側に試行系直接書き込みがないことを確認 | RLS安全性は未検証 | M2のDB/RLS基盤へ着手する前 |

## 停止条件

- AI自己監査結果: M1範囲では通過。静的export、固定ルート、env境界、Auth Callback、open redirect防止、URL cleanup、禁止secret未混入を確認した。
- 残る停止条件: 実Supabase接続、Production/Preview URL登録、secret、M2 DB/RLS/RPC変更、本番deploy。
- 次に止める条件: 実環境接続やDB/RLS/RPCへ入る場合、`docs/agent-workflow.md` の危険変更workflowとM2自己監査資料がそろわない限り完了扱いにしない。

## 完了判断

- 完了扱いにできる理由: M1の静的アプリ骨格、Auth Callback、public env境界、AppResult/AppError、最小UI、npm scripts固定が実装され、実行可能なformat/lint/typecheck/unit/e2e/build/docsチェックが通ったため。
- 後続で見直す条件: Supabase実環境接続時、M2 DB/RLS/RPC作成時、Auth Redirect URL登録時、Production deploy前。
