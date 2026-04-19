import { PageShell } from "@/components/layout/page-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function AuthPage() {
  return (
    <PageShell showNavigation={false} title="ログイン">
      <section className="grid max-w-md gap-4 rounded-md border border-border bg-surface p-4">
        <SignInForm />
      </section>
    </PageShell>
  );
}
