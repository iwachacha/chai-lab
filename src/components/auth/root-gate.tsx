"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { StatusMessage } from "@/components/ui/status-message";
import { useSessionStatus } from "@/lib/auth/use-session";

export function RootGate() {
  const router = useRouter();
  const session = useSessionStatus();

  useEffect(() => {
    if (session.status === "authenticated") {
      router.replace("/home/");
    }

    if (session.status === "unauthenticated") {
      router.replace("/auth/");
    }
  }, [router, session.status]);

  return (
    <PageShell showNavigation={false} title="chai-lab">
      <StatusMessage
        role={session.status === "error" ? "alert" : "status"}
        kind={session.status === "error" ? "error" : "info"}
      >
        {session.status === "error"
          ? session.error.message
          : "ログイン状態を確認しています。"}
      </StatusMessage>
    </PageShell>
  );
}
