import { AuthGate } from "@/components/auth/auth-gate";
import { PageShell } from "@/components/layout/page-shell";
import { StatusMessage } from "@/components/ui/status-message";

export function ProtectedFoundationPage({ title }: { title: string }) {
  return (
    <AuthGate>
      <PageShell title={title}>
        <StatusMessage role="status">認証済みです。</StatusMessage>
      </PageShell>
    </AuthGate>
  );
}
