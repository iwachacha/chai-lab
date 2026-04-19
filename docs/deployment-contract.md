# チャイ研究アプリ Deployment Contract

**作成日:** 2026-04-19

この文書は、チャイ研究アプリv1をCloudflare Pagesへ静的Next.jsアプリとしてデプロイするための契約を定義する。v1ではNext.js API Routes、Cloudflare Pages Functions、SSRを使用しない。

**運用注記:** 判断主体は `docs/agent-relationship-governance.md` を優先する。M1の静的骨格、固定ルート、env境界、Auth Callback実装はAIが自律的に進める。実Production URL、外部Supabase project、secret、Preview/Production接続、本番deployに触れる直前だけ、AIが推奨案を1つに絞って依頼者へ確認する。

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
- `/auth/callback/`

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

Auth Callback実装では、実装方式の揺れによる認証事故を避けるため、次を満たす。

1. URLクエリの `code` がある場合は、ブラウザ上でSupabase Clientのセッション交換処理を行う。
2. URL fragmentに `access_token`、`refresh_token`、`error` などが含まれる場合も、ブラウザ上でセッション確定または失敗表示に正規化する。
3. `error`、`error_description`、`error_code` がある場合は、Supabaseの生エラーやtokenを表示せず、ユーザー向けの再ログイン導線を表示する。
4. セッション確定後、`code`、token、error情報をURLに残さない。`history.replaceState` などでcallback URLを掃除してから、ホームまたは許可済みの内部遷移先へ移動する。
5. 遷移先指定を扱う場合は、アプリ内の固定ルートだけを許可し、外部URLや任意URLへのopen redirectを許可しない。
6. 認証処理中はローディング状態を表示し、失敗時は認証画面へ戻れる導線を残す。

成功時の既定遷移先はホームとする。初回ログイン後に研究ラインがない場合の研究ライン作成誘導は、callbackページではなくホームまたは認証後ガード側で判定する。

## 7. Preview環境

Preview環境を使う場合は、Productionとは別のSupabaseプロジェクトまたは明確に分離されたテストデータを使用する。ProductionデータをPreview UIの検証に使わない。

Preview環境でMagic Linkを確認する場合は、Supabase Authの許可リダイレクトURLに対象Previewの `/auth/callback/` を追加する。設定追加はPRまたは作業記録に残す。

Production用Supabaseプロジェクトには、Preview URLや広すぎるワイルドカードを安易に登録しない。Preview確認が必要な場合は、分離されたPreview用SupabaseプロジェクトにPreview URLを登録することを基本とする。Production URLを登録または変更する直前だけ、依頼者への限定的人間確認を行う。

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
