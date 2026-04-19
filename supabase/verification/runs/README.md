# Supplemental Verification Evidence

このディレクトリは、sliceごとの補助証跡を置くための任意領域です。正式証跡はPR本文またはworklogであり、ここは補助参照先として使います。

## 置いてよいもの

- 対象slice用に埋めた検証SQL
- 補助メモ
- 検証結果サマリ

## 置かないもの

- secret
- Production接続情報
- 生の認証トークン
- 研究本文や不要な個人データを含むログ

## 推奨命名

- `YYYY-MM-DD-<slice>-verification.md`
- `YYYY-MM-DD-<slice>-verification.sql`

worklogまたはPR本文には、このディレクトリ内の参照ファイル名も残します。
