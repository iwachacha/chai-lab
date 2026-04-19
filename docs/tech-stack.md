# チャイ研究アプリ 技術スタック

**作成日:** 2026-04-18
**改訂方針:** v1では候補を広げず、実装再現性と保守性を優先して採用技術を固定する。

## 1. v1採用技術スタック

v1では以下を標準スタックとして採用する。

| 領域 | 採用 |
|---|---|
| フロントエンド | Next.js 静的アプリ + React + TypeScript |
| ホスティング | Cloudflare Pages |
| 認証 / DB | Supabase Auth + PostgreSQL + RLS |
| データアクセス | Supabase JavaScript Client |
| サーバー側処理 | 必要最小限のPostgres RPC |
| フォーム | React Hook Form + Zod |
| データ取得 | TanStack Query |
| スタイル | Tailwind CSS |
| UI部品 | Headless UI または Radix UIの必要最小限 |
| テスト | Vitest、React Testing Library、Playwright |
| 整形 / 静的解析 | ESLint、Prettier、TypeScript strict |

## 2. v1で採用しないもの

以下はv1では採用しない。

- GraphQL
- Redux Toolkit
- React Flow
- D3.js
- Cypress
- Storybook
- Dexie.js
- Workbox
- Supabase Realtime
- Supabase Storage
- Cloudflare R2
- 外部AI API

これらは機能的に有用な場合があるが、v1の目的である非公開研究ログの記録、複製、履歴、スターには不要である。

## 3. 採用理由

### 3.1 Next.js 静的アプリ + Cloudflare Pages

v1ではSSRやサーバーAPIを前提にしない。静的アプリとしてCloudflare Pagesへデプロイし、データ操作はSupabase ClientとRLSに任せる。これにより、デプロイ構成を単純化し、Cloudflare PagesとNext.js API Routesの実行境界で迷わないようにする。Next.js静的出力、認証リダイレクト、環境変数、固定ルート方針は [Deployment Contract](deployment-contract.md) に従う。

### 3.2 Supabase Auth + PostgreSQL + RLS

非公開の個人研究ログを安全に扱うため、Supabase AuthとRLSを採用する。全業務データはユーザー本人のみがアクセスできる前提とし、公開・限定公開のポリシーはv1では作らない。

### 3.3 React Hook Form + Zod

試行入力フォームはv1の中心機能である。React Hook Formで入力負荷を抑え、Zodで必須項目や数値範囲を検証する。

### 3.4 TanStack Query

Supabaseから取得する研究ライン、試行、スターの取得状態を管理するために使用する。オフライン自動同期のためではなく、ロード状態、再取得、キャッシュの整理を目的とする。

### 3.5 Tailwind CSS + Headless/Radix系UI

デザイントークンを明示し、Codexが既存のスタイルに従いやすい構成にする。UI部品は必要最小限に留め、独自スタイルの乱立を避ける。

### 3.6 Playwright

主要画面のモバイル・デスクトップ表示を確認するために使用する。v1では厳密なピクセル差分ではなく、レイアウト崩れ、主要導線、空状態、保存失敗状態の確認を重視する。

## 4. ライブラリ追加ルール

v1では新しいライブラリを安易に追加しない。追加が必要な場合は、次の条件を満たすこと。

1. v1 MVPの必須機能に直接必要である。
2. 既存スタックで実装すると明らかに保守性が悪くなる。
3. 追加理由、代替案、影響範囲をPRまたは設計メモに記録する。
4. Codexが独断で追加しない。

## 5. Codex連携に関するワークフロー

Codexで実装する際は、[Codex Execution Rules](codex-execution-rules.md) を前提に次の順序を守る。

1. 対象機能がv1 MVPに含まれるか確認する。
2. 既存の設計文書、デザイントークン、共通コンポーネントを確認する。
3. DB変更がある場合は [DB Migration & RLS Policy](db-migration-rls-policy.md) に従い、migration、RLS、テスト観点をセットで提示する。
4. デプロイやルーティングに影響する場合は [Deployment Contract](deployment-contract.md) に従う。
5. UI変更がある場合はモバイルとデスクトップの表示をPlaywrightで確認する。
6. 範囲外機能を求められた場合は、実装せず、反対理由と代替案を提示する。

## 6. テストと品質保証

| 種別 | 対象 |
|---|---|
| TypeScript strict | 型の崩れ、Supabaseレスポンスの扱い |
| ESLint / Prettier | 基本的な品質とスタイル |
| Vitest | バリデーション、ユーティリティ |
| React Testing Library | フォーム、カード、状態表示 |
| Playwright | ログイン後の主要導線、モバイル/デスクトップ表示 |
| RLSテスト | 他ユーザーの研究ライン、試行、材料行、スターを読めないこと |

## 7. 将来検討する技術

以下はv2以降で、必要性が確認された場合に検討する。

- 写真アップロードが必要になった場合のSupabase StorageまたはCloudflare R2
- 本格的な系譜ビューが必要になった場合のReact Flow
- 複雑なオフライン利用が必要になった場合のDexie.jsやWorkbox
- 多人数利用が必要になった場合のRealtime
- AI提案が必要になった場合の外部AI API

## 8. まとめ

v1の技術スタックは、機能を増やすためではなく、非公開の研究ログを安全に実装するために選定する。Next.js静的アプリ、Supabase Auth、PostgreSQL、RLS、React Hook Form、Zod、TanStack Query、Tailwind CSS、Playwrightを標準とし、それ以外は原則追加しない。
