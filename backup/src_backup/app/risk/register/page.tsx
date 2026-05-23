import Link from "next/link";
import { BarChart3, ListFilter } from "lucide-react";

import { DocumentWorkspace } from "@/components/DocumentWorkspace";
import { PageShell } from "@/components/PageShell";

export default function RiskRegisterPage() {
  return (
    <div className="space-y-6">
      <PageShell
        tone="slate-admin"
        title="Risk assessment"
        descriptionIconOnly
        description={
          <>
            Select a certification document, describe each level-1 risk, and set
            inherent and residual likelihood and impact. Excluded branches are
            hidden here; manage scope from{" "}
            <strong>In-scope / excluded</strong>. Open the{" "}
            <strong>Risk dashboard</strong> for tenant-wide summaries and CSV
            export.
          </>
        }
        action={
          <div className="flex flex-wrap items-stretch justify-end gap-2">
            <Link
              href="/risk"
              className="btn-risk-nav inline-flex items-center justify-center gap-2"
            >
              <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
              Risk dashboard
            </Link>
            <Link
              href="/risk/scope"
              className="btn-risk-nav inline-flex items-center justify-center gap-2"
            >
              <ListFilter className="h-4 w-4 shrink-0" aria-hidden />
              In-scope / excluded
            </Link>
          </div>
        }
      />
      <DocumentWorkspace mode="risk" />
    </div>
  );
}
