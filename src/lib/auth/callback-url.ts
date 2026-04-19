import { appError, type AppError } from "@/lib/app-result";
import { getSafeRedirectPath } from "@/lib/routes";

export type CallbackUrlState =
  | { status: "error"; error: AppError }
  | {
      status: "code";
      code: string;
      redirectTo: string;
    }
  | {
      status: "tokens";
      accessToken: string;
      refreshToken: string;
      redirectTo: string;
    }
  | { status: "empty"; redirectTo: string };

function hashParamsFromUrl(url: URL): URLSearchParams {
  return new URLSearchParams(
    url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
  );
}

function callbackError(): AppError {
  return appError(
    "AUTH_REQUIRED",
    "認証リンクを確認できませんでした。もう一度メール認証を行ってください。",
    {
      retryable: true,
    },
  );
}

export function readCallbackUrlState(url: URL): CallbackUrlState {
  const hashParams = hashParamsFromUrl(url);
  const redirectTo = getSafeRedirectPath(
    url.searchParams.get("next") ?? hashParams.get("next"),
  );
  const queryError =
    url.searchParams.get("error") ?? url.searchParams.get("error_code");
  const hashError = hashParams.get("error") ?? hashParams.get("error_code");

  if (queryError || hashError) {
    return {
      status: "error",
      error: callbackError(),
    };
  }

  const code = url.searchParams.get("code");

  if (code) {
    return {
      status: "code",
      code,
      redirectTo,
    };
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    return {
      status: "tokens",
      accessToken,
      refreshToken,
      redirectTo,
    };
  }

  return { status: "empty", redirectTo };
}
