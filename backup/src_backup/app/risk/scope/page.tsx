import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ScopeHierarchyWorkspace } from "@/components/ScopeHierarchyWorkspace";

export default function RiskScopePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <Link
          href="/risk"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to risk assessment
        </Link>
      </div>
      <ScopeHierarchyWorkspace
        tone="slate-admin"
        title="Risk — in-scope / excluded"
        description="Mark categories and levels as in scope or excluded. Excluded items are hidden on the Risk assessment and Document compliance screens."
      />
    </div>
  );
}
