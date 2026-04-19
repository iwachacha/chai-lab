# Migrations Directory

このディレクトリは実migration専用です。M2-01では、まだ実テーブル、実RLS、実grant/revoke、実helper、実RPCを追加しません。

## M2-01時点の扱い

- このディレクトリは空のまま維持して構いません。
- 検証用SQL、メモ、チェックリストはここに置きません。

## M2-02以降の追加ルール

1. 1ファイル1論理変更に限定する。
2. ファイル名は `YYYYMMDDHHMMSS_short_description.sql` を基本にする。
3. 実DDL、実RLS、実grant/revoke、実helper、実RPCだけを置く。
4. 補助証跡は `supabase/verification/` とworklogへ残す。
