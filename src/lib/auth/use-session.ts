"use client";

import { useEffect, useState } from "react";

import { type AppError } from "@/lib/app-result";
import { getCurrentSession, type CurrentSession } from "@/lib/auth/data-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export type SessionStatus =
  | { status: "loading" }
  | { status: "authenticated"; session: CurrentSession }
  | { status: "unauthenticated" }
  | { status: "error"; error: AppError };

export function useSessionStatus(): SessionStatus {
  const [state, setState] = useState<SessionStatus>(() => {
    const client = getSupabaseBrowserClient();
    return client.ok
      ? { status: "loading" }
      : { status: "error", error: client.error };
  });

  useEffect(() => {
    let active = true;
    const client = getSupabaseBrowserClient();

    if (!client.ok) {
      return undefined;
    }

    void getCurrentSession().then((result) => {
      if (!active) {
        return;
      }

      if (!result.ok) {
        setState({ status: "error", error: result.error });
        return;
      }

      setState(
        result.data
          ? { status: "authenticated", session: result.data }
          : { status: "unauthenticated" },
      );
    });

    const {
      data: { subscription },
    } = client.data.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setState(
        session
          ? {
              status: "authenticated",
              session: {
                userId: session.user.id,
                email: session.user.email ?? null,
              },
            }
          : { status: "unauthenticated" },
      );
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
