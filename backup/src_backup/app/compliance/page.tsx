import Link from "next/link";
import { ListFilter } from "lucide-react";

import { DocumentWorkspace } from "@/components/DocumentWorkspace";
import { PageShell } from "@/components/PageShell";

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <PageShell
        title="Document compliance"
        description={
          <>
            Review control guidance per level 2 and open{" "}
            <strong className="text-neutral-800">Evidence</strong> for titles and
            references. Use{" "}
            <strong className="text-neutral-800">In-scope / excluded</strong> to
            control what appears on this screen and on Risk assessment.
          </>
        }
        action={
          <Link
            href="/compliance/scope"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <ListFilter className="h-4 w-4 shrink-0" aria-hidden />
            In-scope / excluded
          </Link>
        }
      />
      <DocumentWorkspace mode="compliance" />
    </div>
  );
}
