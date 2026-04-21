import { Suspense } from "react";

import { ProtectedFoundationPage } from "@/components/m1/protected-foundation-page";
import { TrialDetailClient } from "@/components/trials/trial-detail-client";

export default function TrialDetailPage() {
  return (
    <Suspense fallback={<ProtectedFoundationPage title="試行詳細" />}>
      <TrialDetailClient />
    </Suspense>
  );
}
