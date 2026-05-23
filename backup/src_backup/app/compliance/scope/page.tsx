import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ScopeHierarchyWorkspace } from "@/components/ScopeHierarchyWorkspace";

export default function ComplianceScopePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)]">
        <Link
          href="/compliance"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to document compliance
        </Link>
      </div>
      <ScopeHierarchyWorkspace
        title="Document compliance — in-scope / excluded"
        description="Same hierarchy as Risk scope: changes apply to both Risk assessment and Document compliance. Excluded branches do not appear on those screens."
      />
    </div>
  );
}
