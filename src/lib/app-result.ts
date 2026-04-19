export type AppErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

export type AppError = {
  code: AppErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
  cause?: unknown;
};

export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export function ok<T>(data: T): AppResult<T> {
  return { ok: true, data };
}

export function err(error: AppError): AppResult<never> {
  return { ok: false, error };
}

export function appError(
  code: AppErrorCode,
  message: string,
  options: {
    fieldErrors?: Record<string, string>;
    retryable?: boolean;
    cause?: unknown;
  } = {},
): AppError {
  return {
    code,
    message,
    fieldErrors: options.fieldErrors,
    retryable: options.retryable ?? false,
    cause: options.cause,
  };
}

export function unknownAppError(cause: unknown): AppError {
  return appError(
    "UNKNOWN_ERROR",
    "処理に失敗しました。時間をおいて再試行してください。",
    {
      retryable: true,
      cause,
    },
  );
}
