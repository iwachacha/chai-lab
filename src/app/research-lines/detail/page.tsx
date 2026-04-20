import { Suspense } from "react";

import { ProtectedFoundationPage } from "@/components/m1/protected-foundation-page";
import { ResearchLineDetailClient } from "@/components/research-lines/research-line-detail-client";

export default function ResearchLineDetailPage() {
  return (
    <Suspense fallback={<ProtectedFoundationPage title="研究ライン詳細" />}>
      <ResearchLineDetailClient />
    </Suspense>
  );
}
