import { Suspense } from "react";

import { ProtectedFoundationPage } from "@/components/m1/protected-foundation-page";
import { TrialFormClient } from "@/components/trials/trial-form-client";

export default function NewTrialPage() {
  return (
    <Suspense fallback={<ProtectedFoundationPage title="新しい試行" />}>
      <TrialFormClient mode="new" />
    </Suspense>
  );
}
