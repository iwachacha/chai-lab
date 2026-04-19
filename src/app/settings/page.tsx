import { AuthGate } from "@/components/auth/auth-gate";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PageShell } from "@/components/layout/page-shell";
import { StatusMessage } from "@/components/ui/status-message";

export default function SettingsPage() {
  return (
    <AuthGate>
      <PageShell title="設定">
        <section className="grid max-w-md gap-4 rounded-md border border-border bg-surface p-4">
          <StatusMessage role="status">ログアウトできます。</StatusMessage>
          <SignOutButton />
        </section>
      </PageShell>
    </AuthGate>
  );
}
