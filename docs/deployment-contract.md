# チャイ研究アプリ Deployment Contract

**作成日:** 2026-04-19

この文書は、チャイ研究アプリv1をCloudflare Pagesへ静的Next.jsアプリとしてデプロイするための契約を定義する。v1ではNext.js API Routes、Cloudflare Pages Functions、SSRを使用しない。

## 1. 基本方針

v1のフロントエンドは、静的にビルドされたNext.jsアプリとして配信する。データ操作はブラウザ上のSupabase Clientから行い、認可はSupabase PostgreSQLのRLSで担保する。

以下はv1では使用しない。

- Next.js API Routes
- Next.js Server Actions
- SSR
- Cloudflare Pages Functions
- Cloudflare Workers
- サーバー側セッション管理
- `service_role` キー

## 2. Next.js静的出力

`next.config` では静的出力を前提にする。

```js
const nextConfig = {
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
```

ビルド成果物は `out` ディレクトリとする。

## 3. ルーティング制約

静的exportでは、任意IDを持つファイルシステム動的ルートをv1で使用しない。

禁止:

- `/trials/[id]`
- `/research-lines/[id]`
- `/users/[id]`

許可:

- `/trials/detail?id=<trial_id>`
- `/research-lines/detail?id=<research_line_id>`
- `/trials/edit?id=<trial_id>`
- `/auth/callback`

IDを含む画面は、静的ページを表示した後、クライアント側でクエリパラメータを読み取り、Supabaseから本人データを取得する。存在しないID、他ユーザーのID、論理削除済みIDは、内部IDを出さずに表示不可状態にする。

## 4. Cloudflare Pages設定

Cloudflare Pagesの設定は以下を基本とする。

| 項目 | 設定 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `out` |
| Production branch | `main` |
| Node.js version | `.nvmrc` と `package.json` の `engines.node` で固定したLTS系を使用する |

静的exportで生成されない任意パスへの直リンクを前提にしない。必要な画面は、静的に生成される固定パスとして用意する。

最初の実装PRでは、npmを前提に `package-lock.json` を管理し、Node.jsのメジャーバージョンを `.nvmrc`、`package.json`、Cloudflare Pages設定で一致させる。パッケージマネージャーの混在は認めない。

## 5. 環境変数

フロントエンドで使用してよい環境変数は以下に限定する。

| 変数 | 用途 | 公開可否 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | 公開可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 公開可 |
| `NEXT_PUBLIC_APP_ORIGIN` | アプリの公開オリジン | 公開可 |

禁止:

- `SUPABASE_SERVICE_ROLE_KEY`
- DB接続文字列
- 外部AI APIキー
- Storage/R2キー
- GitHubトークン

## 6. Supabase Auth Redirect

Magic Linkのリダイレクト先は静的ページとして用意する。

| 環境 | Redirect URL |
|---|---|
| local | `http://localhost:3000/auth/callback/` |
| preview | Cloudflare Pages Previewの `/auth/callback/` |
| production | `NEXT_PUBLIC_APP_ORIGIN` の `/auth/callback/` |

`/auth/callback/` はブラウザ上でSupabaseセッションを確定し、認証成功後にホームへ遷移する。サーバー側callbackは作らない。

## 7. Preview環境

Preview環境を使う場合は、Productionとは別のSupabaseプロジェクトまたは明確に分離されたテストデータを使用する。ProductionデータをPreview UIの検証に使わない。

Preview環境でMagic Linkを確認する場合は、Supabase Authの許可リダイレクトURLにPreview URLを追加する。設定追加はPRまたは作業記録に残す。

## 8. デプロイ前チェック

デプロイ前に以下を確認する。

1. `next.config` が静的export前提である。
2. `out` が生成される。
3. npm lockfileとNode.jsバージョン固定が一致している。
4. API Routes、Server Actions、Pages Functionsが存在しない。
5. `service_role` キーがフロントエンド環境変数に含まれていない。
6. Supabase Auth Redirect URLが対象環境に登録されている。
7. `/auth/callback/` が静的ページとして生成される。
8. ID付き画面がクエリパラメータ方式で動作する。
9. 未認証時に業務画面から認証画面へ誘導される。
10. RLSにより他ユーザーのIDを指定してもデータが表示されない。

## 9. 変更ルール

SSR、API Routes、Cloudflare Pages Functions、Workers、サーバー側セッション管理が必要になった場合は、v1の前提を変更するため、実装前に以下を更新する。

1. 本書。
2. 技術スタック。
3. 詳細設計書。
4. Supabase Data Access & Error Contract。
5. Codex Execution Rules。

明示的な設計判断なしに、静的配信からフルスタック構成へ移行してはならない。
