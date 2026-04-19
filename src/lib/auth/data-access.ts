"use client";

import { AuthApiError } from "@supabase/supabase-js";
import { z } from "zod";

import {
  appError,
  err,
  ok,
  unknownAppError,
  type AppError,
  type AppResult,
} from "@/lib/app-result";
import { readCallbackUrlState } from "@/lib/auth/callback-url";
import { getAppOrigin } from "@/lib/env";
import { getSafeRedirectPath } from "@/lib/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const emailSchema = z
  .string()
  .trim()
  .min(1, "メールアドレスを入力してください。")
  .email("メールアドレスの形式を確認してください。");

export type CurrentSession = {
  userId: string;
  email: string | null;
};

export function validateMagicLinkEmail(value: string): AppResult<string> {
  const parsed = emailSchema.safeParse(value);

  if (!parsed.success) {
    return err(
      appError("VALIDATION_ERROR", "入力内容を確認してください。", {
        fieldErrors: {
          email:
            parsed.error.issues[0]?.message ??
            "メールアドレスを確認してください。",
        },
        retryable: false,
      }),
    );
  }

  return ok(parsed.data);
}

function mapAuthError(cause: unknown): AppError {
  if (cause instanceof AuthApiError) {
    if (cause.status === 429) {
      return appError(
        "RATE_LIMITED",
        "時間をおいてからもう一度お試しください。",
        {
          retryable: true,
          cause,
        },
      );
    }

    if (cause.status === 401) {
      return appError(
        "AUTH_EXPIRED",
        "セッションが切れました。もう一度ログインしてください。",
        {
          retryable: true,
          cause,
        },
      );
    }

    if (cause.status === 400 || cause.status === 422) {
      return appError("VALIDATION_ERROR", "入力内容を確認してください。", {
        retryable: false,
        cause,
      });
    }
  }

  if (cause instanceof TypeError) {
    return appError(
      "NETWORK_ERROR",
      "通信に失敗しました。接続を確認して再試行してください。",
      {
        retryable: true,
        cause,
      },
    );
  }

  return appError(
    "SERVER_ERROR",
    "認証処理に失敗しました。時間をおいて再試行してください。",
    {
      retryable: true,
      cause,
    },
  );
}

export async function sendMagicLink(
  emailInput: string,
  nextPathInput?: string,
): Promise<AppResult<{ email: string }>> {
  const email = validateMagicLinkEmail(emailInput);

  if (!email.ok) {
    return err(email.error);
  }

  const client = getSupabaseBrowserClient();

  if (!client.ok) {
    return err(client.error);
  }

  const appOrigin = getAppOrigin();

  if (!appOrigin.ok) {
    return err(appOrigin.error);
  }

  const redirectTo = getSafeRedirectPath(nextPathInput);
  const callbackUrl = new URL("/auth/callback/", appOrigin.data);
  callbackUrl.searchParams.set("next", redirectTo);

  const { error } = await client.data.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return err(mapAuthError(error));
  }

  return ok({ email: email.data });
}

export async function getCurrentSession(): Promise<
  AppResult<CurrentSession | null>
> {
  const client = getSupabaseBrowserClient();

  if (!client.ok) {
    return err(client.error);
  }

  try {
    const { data, error } = await client.data.auth.getSession();

    if (error) {
      return err(mapAuthError(error));
    }

    if (!data.session) {
      return ok(null);
    }

    return ok({
      userId: data.session.user.id,
      email: data.session.user.email ?? null,
    });
  } catch (cause) {
    return err(unknownAppError(cause));
  }
}

export async function completeAuthCallback(
  url: URL,
): Promise<AppResult<{ redirectTo: string }>> {
  const state = readCallbackUrlState(url);

  if (state.status === "error") {
    return err(state.error);
  }

  const client = getSupabaseBrowserClient();

  if (!client.ok) {
    return err(client.error);
  }

  try {
    if (state.status === "code") {
      const { error } = await client.data.auth.exchangeCodeForSession(
        state.code,
      );

      if (error) {
        return err(mapAuthError(error));
      }

      return ok({ redirectTo: state.redirectTo });
    }

    if (state.status === "tokens") {
      const { error } = await client.data.auth.setSession({
        access_token: state.accessToken,
        refresh_token: state.refreshToken,
      });

      if (error) {
        return err(mapAuthError(error));
      }

      return ok({ redirectTo: state.redirectTo });
    }

    const current = await getCurrentSession();

    if (!current.ok) {
      return err(current.error);
    }

    if (!current.data) {
      return err(
        appError(
          "AUTH_REQUIRED",
          "ログインが必要です。メール認証を行ってください。",
          {
            retryable: true,
          },
        ),
      );
    }

    return ok({ redirectTo: state.redirectTo });
  } catch (cause) {
    return err(unknownAppError(cause));
  }
}

export async function signOut(): Promise<AppResult<null>> {
  const client = getSupabaseBrowserClient();

  if (!client.ok) {
    return err(client.error);
  }

  try {
    const { error } = await client.data.auth.signOut();

    if (error) {
      return err(mapAuthError(error));
    }

    return ok(null);
  } catch (cause) {
    return err(unknownAppError(cause));
  }
}
