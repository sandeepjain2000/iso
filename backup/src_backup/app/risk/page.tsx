import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, FileDown, FileText, ListFilter, Table2 } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { TruncatedText } from "@/components/TruncatedText";
import { getSession } from "@/lib/require-session";
import {
  buildDashboardFromRows,
  loadScopedRiskL1Rows,
} from "@/lib/risk-dashboard";

export const runtime = "nodejs";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-800">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p>
      ) : null}
    </div>
  );
}

function sortedEntries(m: Record<string, number>): [string, number][] {
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function DistBlock({
  title,
  dist,
  total,
}: {
  title: string;
  dist: Record<string, number>;
  total: number;
}) {
  const entries = sortedEntries(dist);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-4 space-y-2">
        {entries.map(([label, count]) => {
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span
                className="w-36 shrink-0 truncate text-slate-600"
                title={label}
              >
                {label.replaceAll("_", " ")}
              </span>
              <div className="h-2 min-w-0 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-2 max-w-full rounded-full bg-sky-600"
                  style={{ width: `${Math.max(pct, count ? 2 : 0)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums text-slate-800">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function RiskLandingPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const rows = await loadScopedRiskL1Rows(session.tenantId);
  const dash = buildDashboardFromRows(rows);
  const preview = rows.slice(0, 40);

  return (
    <div className="space-y-6">
      <PageShell
        tone="slate-admin"
        title="Risk dashboard"
        description={
          <>
            In-scope level-1 controls across all certification documents: counts,
            residual/inherent distributions, and coverage of risk descriptions.
            Export matches the risk register CSV columns for all documents.
          </>
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/risk/register"
              className="btn-risk-primary inline-flex items-center justify-center gap-2"
            >
              <Table2 className="h-4 w-4 shrink-0" aria-hidden />
              Risk Assessment Register
            </Link>
            <Link
              href="/risk/scope"
              className="btn-risk-nav inline-flex items-center justify-center gap-2"
            >
              <ListFilter className="h-4 w-4 shrink-0" aria-hidden />
              In-scope / excluded
            </Link>
            <a
              className="btn-risk-nav inline-flex items-center justify-center gap-2"
              href="/api/risk/report"
            >
              <FileDown className="h-4 w-4 shrink-0" aria-hidden />
              CSV Download
            </a>
            <a
              className="btn-risk-nav inline-flex items-center justify-center gap-2"
              href="/api/risk/report-pdf"
            >
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
              PDF report
            </a>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Level-1 risks (in scope)"
          value={dash.totalL1}
          hint="Across every in-scope certification document."
        />
        <StatCard
          label="With risk description"
          value={dash.withRiskDescription}
          hint="Non-empty risk narrative."
        />
        <StatCard
          label="Missing description"
          value={dash.missingRiskDescription}
          hint="Still need a written risk."
        />
        <StatCard
          label="Certification documents"
          value={dash.documentsInScope}
          hint="Documents with at least one in-scope L1."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DistBlock
          title="Residual impact"
          dist={dash.residualImpact}
          total={dash.totalL1}
        />
        <DistBlock
          title="Residual likelihood"
          dist={dash.residualLikelihood}
          total={dash.totalL1}
        />
        <DistBlock
          title="Inherent impact"
          dist={dash.inherentImpact}
          total={dash.totalL1}
        />
        <DistBlock
          title="Inherent likelihood"
          dist={dash.inherentLikelihood}
          total={dash.totalL1}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-800">
            Level-1 rows per certification document
          </h3>
        </div>
        <div className="risk-table-theme mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="cc-table w-full min-w-[20rem] text-sm">
            <thead>
              <tr>
                <th>Document</th>
                <th className="text-right">L1 rows</th>
              </tr>
            </thead>
            <tbody>
              {dash.l1PerDocument.map((d) => (
                <tr key={d.documentName}>
                  <td className="font-medium text-slate-900">
                    <TruncatedText text={d.documentName} maxChars={80} />
                  </td>
                  <td className="text-right tabular-nums">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">
          Sample rows (first {preview.length} of {rows.length})
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Full register: use <strong className="text-slate-800">CSV Download</strong>{" "}
          or <strong className="text-slate-800">PDF report</strong> above.
        </p>
        <div className="risk-table-theme mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="cc-table w-full min-w-[56rem] text-xs">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Level 1</th>
                <th>Residual impact</th>
                <th>Residual likelihood</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={`${r.documentName}-${r.categoryName}-${r.level1Name}-${i}`}>
                  <td>
                    <TruncatedText text={r.documentName} maxChars={28} />
                  </td>
                  <td>
                    <TruncatedText text={r.categoryName} maxChars={24} />
                  </td>
                  <td className="font-medium">
                    <TruncatedText text={r.level1Name} maxChars={32} />
                  </td>
                  <td>{r.residualImpact ?? "—"}</td>
                  <td>{r.residualLikelihood ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
