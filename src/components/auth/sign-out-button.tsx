"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { signOut } from "@/lib/auth/data-access";
import { type AppError } from "@/lib/app-result";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<AppError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    setError(null);
    setIsSubmitting(true);
    const result = await signOut();
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace("/auth/");
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <StatusMessage kind="error" role="alert">
          {error.message}
        </StatusMessage>
      ) : null}
      <Button
        disabled={isSubmitting}
        onClick={handleSignOut}
        variant="secondary"
      >
        {isSubmitting ? "ログアウト中" : "ログアウト"}
      </Button>
    </div>
  );
}
