import { appError, err, ok, type AppResult } from "@/lib/app-result";

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const publicAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;

export function getSupabasePublicConfig(): AppResult<SupabasePublicConfig> {
  if (!publicSupabaseUrl || !publicSupabaseAnonKey) {
    return err(
      appError(
        "SERVER_ERROR",
        "認証設定がまだ有効ではありません。環境設定を確認してください。",
        {
          retryable: false,
        },
      ),
    );
  }

  try {
    const parsedUrl = new URL(publicSupabaseUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid Supabase URL protocol");
    }
  } catch (cause) {
    return err(
      appError(
        "SERVER_ERROR",
        "認証設定がまだ有効ではありません。環境設定を確認してください。",
        {
          retryable: false,
          cause,
        },
      ),
    );
  }

  return ok({
    url: publicSupabaseUrl,
    anonKey: publicSupabaseAnonKey,
  });
}

export function getAppOrigin(): AppResult<string> {
  const fallbackOrigin =
    typeof window === "undefined" ? undefined : window.location.origin;
  const origin = publicAppOrigin || fallbackOrigin;

  if (!origin) {
    return err(
      appError(
        "SERVER_ERROR",
        "アプリの認証戻り先を確認できません。環境設定を確認してください。",
        {
          retryable: false,
        },
      ),
    );
  }

  try {
    const parsedOrigin = new URL(origin);

    if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
      throw new Error("Invalid app origin protocol");
    }

    return ok(parsedOrigin.origin);
  } catch (cause) {
    return err(
      appError(
        "SERVER_ERROR",
        "アプリの認証戻り先を確認できません。環境設定を確認してください。",
        {
          retryable: false,
          cause,
        },
      ),
    );
  }
}
