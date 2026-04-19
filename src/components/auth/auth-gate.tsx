"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { LinkButton } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { useSessionStatus } from "@/lib/auth/use-session";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSessionStatus();

  useEffect(() => {
    if (session.status !== "unauthenticated") {
      return;
    }

    const currentPath = `${window.location.pathname}${window.location.search}`;
    router.replace(`/auth/?next=${encodeURIComponent(currentPath)}`);
  }, [router, session.status]);

  if (session.status === "loading") {
    return (
      <PageShell showNavigation={false} title="認証確認">
        <StatusMessage role="status">
          ログイン状態を確認しています。
        </StatusMessage>
      </PageShell>
    );
  }

  if (session.status === "error") {
    return (
      <PageShell showNavigation={false} title="認証確認">
        <StatusMessage kind="error" role="alert">
          {session.error.message}
        </StatusMessage>
        <LinkButton href="/auth/" variant="secondary">
          認証画面へ
        </LinkButton>
      </PageShell>
    );
  }

  if (session.status === "unauthenticated") {
    return (
      <PageShell showNavigation={false} title="認証確認">
        <StatusMessage role="status">認証画面へ移動しています。</StatusMessage>
      </PageShell>
    );
  }

  return children;
}
