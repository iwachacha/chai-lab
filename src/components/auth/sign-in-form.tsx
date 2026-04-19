"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { TextInput } from "@/components/ui/text-input";
import { sendMagicLink } from "@/lib/auth/data-access";
import { getSafeRedirectPath } from "@/lib/routes";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [status, setStatus] = useState<
    "idle" | "submitting" | "sent" | "failed"
  >("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") {
      return "/home/";
    }

    const params = new URLSearchParams(window.location.search);
    return getSafeRedirectPath(params.get("next"));
  });

  const canSubmit = useMemo(() => status !== "submitting", [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(undefined);
    setMessage(undefined);
    setStatus("submitting");

    const result = await sendMagicLink(email, nextPath);

    if (!result.ok) {
      setStatus("failed");
      setFieldError(result.error.fieldErrors?.email);
      setMessage(result.error.message);
      return;
    }

    setStatus("sent");
    setMessage(`${result.data.email} 宛に認証メールを送信しました。`);
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
      <TextInput
        autoComplete="email"
        error={fieldError}
        inputMode="email"
        label="メールアドレス"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        value={email}
      />
      {message ? (
        <StatusMessage
          kind={status === "sent" ? "success" : "error"}
          role={status === "sent" ? "status" : "alert"}
        >
          {message}
        </StatusMessage>
      ) : null}
      <Button disabled={!canSubmit} type="submit">
        {status === "submitting" ? "送信中" : "認証メールを送信"}
      </Button>
    </form>
  );
}
