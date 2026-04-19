"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LinkButton } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { completeAuthCallback } from "@/lib/auth/data-access";
import { type AppError } from "@/lib/app-result";

export function AuthCallbackClient() {
  const router = useRouter();
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      const result = await completeAuthCallback(new URL(window.location.href));

      window.history.replaceState(null, "", "/auth/callback/");

      if (!active) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.replace(result.data.redirectTo);
    }

    void run();

    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="grid gap-4">
        <StatusMessage kind="error" role="alert">
          {error.message}
        </StatusMessage>
        <LinkButton href="/auth/" variant="secondary">
          認証画面へ
        </LinkButton>
      </div>
    );
  }

  return (
    <StatusMessage role="status">認証情報を確認しています。</StatusMessage>
  );
}
