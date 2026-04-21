import { Suspense } from "react";

import { ProtectedFoundationPage } from "@/components/m1/protected-foundation-page";
import { TrialFormClient } from "@/components/trials/trial-form-client";

export default function EditTrialPage() {
  return (
    <Suspense fallback={<ProtectedFoundationPage title="試行編集" />}>
      <TrialFormClient mode="edit" />
    </Suspense>
  );
}
