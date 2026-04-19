import { AuthCallbackClient } from "@/components/auth/auth-callback-client";
import { PageShell } from "@/components/layout/page-shell";

export default function AuthCallbackPage() {
  return (
    <PageShell showNavigation={false} title="認証確認">
      <AuthCallbackClient />
    </PageShell>
  );
}
