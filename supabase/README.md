# Supabase Workspace

このディレクトリは、v1のDB / RLS / RPC作業で使うSupabase関連資産の置き場です。M2番号の正は `docs/implementation-plan-v1.md` とし、`M2-01 = 検証/証跡土台整理`、`M2-02 = research_lines の最初の end-to-end DB slice` と読みます。M2-01時点では、実DB変更ではなく、以後のsliceで再利用する非本番の検証土台だけを置きます。

## 置き場所

- `migrations/`: 実migration専用です。M2-02以降の実sliceでだけ使います。
- `verification/`: 非本番で再利用する検証手順、チェックリスト、SQLテンプレート、補助証跡の置き場です。

## ルール

1. この配下にProduction接続情報、secret、実行ログの生出力を置かない。
2. `verification/` 配下のSQLはmigrationではありません。自動適用や本番適用の対象にしない。
3. 正式証跡はPR本文またはworklogです。`verification/` 配下のファイルは補助証跡として参照します。
4. 実DB変更は、M2-02以降に `migrations/` へ1論理変更ずつ追加します。
5. M2-01完了後に次に着手する実装タスクは、`migrations/` を初めて使う M2-02 `research_lines` sliceです。
