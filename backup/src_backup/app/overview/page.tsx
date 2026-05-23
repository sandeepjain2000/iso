import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { OverviewImportSection } from "@/components/OverviewImportSection";
import { PageShell } from "@/components/PageShell";
import { TruncatedText } from "@/components/TruncatedText";
import {
  getDb,
  isoAsset,
  isoDocument,
  isoEvidence,
  isoLevel2,
} from "@/db";
import { getSession } from "@/lib/require-session";

export const runtime = "nodejs";

export default async function OverviewPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const tid = session.tenantId;
  const db = getDb();

  const [d0, d1, a0, l0, e0] = await Promise.all([
    db
      .select({ n: count() })
      .from(isoDocument)
      .where(eq(isoDocument.tenantId, tid)),
    db
      .select({ n: count() })
      .from(isoDocument)
      .where(
        and(eq(isoDocument.tenantId, tid), eq(isoDocument.include, true)),
      ),
    db
      .select({ n: count() })
      .from(isoAsset)
      .where(eq(isoAsset.tenantId, tid)),
    db
      .select({ n: count() })
      .from(isoLevel2)
      .where(eq(isoLevel2.tenantId, tid)),
    db
      .select({ n: count() })
      .from(isoEvidence)
      .where(eq(isoEvidence.tenantId, tid)),
  ]);

  const docTotal = d0[0]?.n ?? 0;
  const docInScope = d1[0]?.n ?? 0;
  const assets = a0[0]?.n ?? 0;
  const l2 = l0[0]?.n ?? 0;
  const ev = e0[0]?.n ?? 0;

  const rows = [
    {
      metric: "Certification documents",
      count: docTotal,
      notes: `${docInScope} marked in audit scope`,
    },
    {
      metric: "Level-2 control points",
      count: l2,
      notes: "Leaf nodes in the document tree",
    },
    {
      metric: "Evidence records",
      count: ev,
      notes: "Metadata until S3 upload is enabled",
    },
    {
      metric: "Assets registered",
      count: assets,
      notes: "Inventory rows",
    },
  ];

  return (
    <div className="space-y-5">
      <PageShell
        title="Overview"
        description={
          <>
            Signed in as{" "}
            <strong className="text-neutral-900">{session.email}</strong> (tenant #
            {session.tenantId}). Data below is scoped to your organisation only.
          </>
        }
      />

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)] sm:p-5">
        <div className="cc-table-wrap">
          <table className="cc-table">
            <thead>
              <tr>
                <th>Application overview</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-sm leading-relaxed text-neutral-700">
                  This workspace mirrors your Excel-driven hierarchy: each
                  certification objective is a <strong>document</strong>, broken
                  into <strong>category</strong>, <strong>level 1</strong>, and{" "}
                  <strong>level 2</strong>. Risk ratings sit at level 1; evidence
                  at level 2. Scope checkboxes exclude branches from the auditor
                  view. Data loads from CSV exports into{" "}
                  <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-800">
                    data/compliance.db
                  </code>
                  .
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <OverviewImportSection />

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)] sm:p-5">
        <div className="cc-table-wrap">
          <table className="cc-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="text-right">Count</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.metric}>
                  <td className="font-medium text-neutral-900">
                    <TruncatedText text={r.metric} />
                  </td>
                  <td className="text-right tabular-nums text-neutral-900">
                    {r.count}
                  </td>
                  <td className="text-neutral-600">
                    <TruncatedText text={r.notes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
