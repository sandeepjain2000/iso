"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { CsvImportToolbar } from "@/components/CsvImportToolbar";
import { TruncatedText } from "@/components/TruncatedText";
import {
  COMPLIANCE_REGISTER_HEADERS,
  RISK_REGISTER_HEADERS,
  complianceTemplateExampleRow,
  riskTemplateExampleRow,
} from "@/lib/import-csv-specs";
import type { DocumentTree } from "@/lib/tree-types";
import { downloadCsv } from "@/lib/download-csv";
import { toast } from "sonner";

const LIK = ["RARE", "UNLIKELY", "POSSIBLE", "LIKELY", "ALMOST_CERTAIN"] as const;
const IMP = [
  "INSIGNIFICANT",
  "MINOR",
  "MODERATE",
  "MAJOR",
  "CATASTROPHIC",
] as const;

type Mode = "risk" | "compliance";

type GridRow = {
  cat: DocumentTree["categories"][number];
  l1: DocumentTree["categories"][number]["level1"][number];
  l2: DocumentTree["categories"][number]["level1"][number]["level2"][number];
  categoryRowSpan: number;
  l1RowSpan: number;
};

function buildGridRows(tree: DocumentTree): GridRow[] {
  const out: GridRow[] = [];
  for (const cat of tree.categories) {
    const categoryRowCount = cat.level1.reduce(
      (acc, l1) => acc + l1.level2.length,
      0,
    );
    let catRowIndex = 0;
    for (const l1 of cat.level1) {
      const l1RowCount = l1.level2.length;
      let l1RowIndex = 0;
      for (const l2 of l1.level2) {
        out.push({
          cat,
          l1,
          l2,
          categoryRowSpan: catRowIndex === 0 ? categoryRowCount : 0,
          l1RowSpan: l1RowIndex === 0 ? l1RowCount : 0,
        });
        catRowIndex++;
        l1RowIndex++;
      }
    }
  }
  return out;
}

function findL2Path(
  tree: DocumentTree,
  l2Id: number,
):
  | {
      cat: DocumentTree["categories"][number];
      l1: DocumentTree["categories"][number]["level1"][number];
      l2: DocumentTree["categories"][number]["level1"][number]["level2"][number];
    }
  | undefined {
  for (const cat of tree.categories) {
    for (const l1 of cat.level1) {
      const l2 = l1.level2.find((x) => x.id === l2Id);
      if (l2) return { cat, l1, l2 };
    }
  }
  return undefined;
}

function buildRiskAssessmentRows(tree: DocumentTree): {
  cat: DocumentTree["categories"][number];
  l1: DocumentTree["categories"][number]["level1"][number];
}[] {
  const out: {
    cat: DocumentTree["categories"][number];
    l1: DocumentTree["categories"][number]["level1"][number];
  }[] = [];
  for (const cat of tree.categories) {
    for (const l1 of cat.level1) {
      out.push({ cat, l1 });
    }
  }
  return out;
}

type RiskDraftSlice = {
  rd: string;
  il: string;
  rl: string;
  ii: string;
  ri: string;
};

function riskFieldsFromDraft(d: RiskDraftSlice) {
  return {
    risk_description: d.rd.trim() || null,
    inherent_likelihood: d.il || null,
    residual_likelihood: d.rl || null,
    inherent_impact: d.ii || null,
    residual_impact: d.ri || null,
  };
}

function isRiskL1Dirty(
  l1: DocumentTree["categories"][number]["level1"][number],
  d: RiskDraftSlice | undefined,
): boolean {
  if (!d) return false;
  const norm = (s: string | null | undefined) => (s ?? "").trim();
  const sel = (s: string | null | undefined) => s ?? "";
  return (
    norm(l1.risk_description) !== d.rd.trim() ||
    sel(l1.inherent_likelihood) !== d.il ||
    sel(l1.residual_likelihood) !== d.rl ||
    sel(l1.inherent_impact) !== d.ii ||
    sel(l1.residual_impact) !== d.ri
  );
}

export function DocumentWorkspace({ mode }: { mode: Mode }) {
  const [docs, setDocs] = useState<{ id: number; name: string }[]>([]);
  const [docId, setDocId] = useState<number | null>(null);
  const [auditor, setAuditor] = useState(false);
  const [tree, setTree] = useState<DocumentTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    if (docId === null) return;
    setLoading(true);
    setError(null);
    try {
      const omitExcluded = auditor ? "0" : "1";
      const res = await fetch(
        `/api/tree/${docId}?auditor=${auditor ? "1" : "0"}&omitExcluded=${omitExcluded}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to load tree");
      }
      setTree((await res.json()) as DocumentTree);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setTree(null);
    } finally {
      setLoading(false);
    }
  }, [docId, auditor]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/documents?auditor=${auditor ? "1" : "0"}`);
      const data = (await res.json()) as { id: number; name: string }[];
      if (cancelled) return;
      setDocs(data);
      setDocId((prev) => {
        if (prev !== null && data.some((d) => d.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [auditor]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const saveRisk = async (
    id: number,
    fields: {
      risk_description: string | null;
      inherent_likelihood: string | null;
      residual_likelihood: string | null;
      inherent_impact: string | null;
      residual_impact: string | null;
    },
    options?: { skipReload?: boolean },
  ) => {
    const res = await fetch(`/api/level1/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error("Risk update failed");
    if (!options?.skipReload) await loadTree();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)] sm:p-5">
        <table className="cc-toolbar-table max-w-full border-0 shadow-none">
          <tbody>
          <tr>
            <th scope="row">Certification document</th>
            <td>
              <select
                className="w-full max-w-xl rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                value={docId ?? ""}
                onChange={(e) => setDocId(Number(e.target.value))}
              >
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </td>
            <th scope="row">Auditor preview</th>
            <td>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={auditor}
                  onChange={(e) => setAuditor(e.target.checked)}
                />
                <span className="text-sm text-neutral-700">
                  Show only in-scope branches
                </span>
              </label>
            </td>
          </tr>
          {tree ? (
            <tr>
              <th scope="row">Selected document</th>
              <td colSpan={3} className="text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">
                  <TruncatedText text={tree.name} />
                </span>
                {tree.desc ? (
                  <span className="text-neutral-500">
                    {" "}
                    — <TruncatedText text={tree.desc} preserveLines />
                  </span>
                ) : null}
              </td>
            </tr>
          ) : null}
        </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <TruncatedText text={error} preserveLines />
        </div>
      )}

      {loading && (
        <p className="text-sm text-neutral-500">Loading document tree…</p>
      )}

      {tree && !loading ? (
        <TabularTree
          mode={mode}
          tree={tree}
          auditor={auditor}
          onSaveRisk={saveRisk}
          onTreeRefresh={loadTree}
        />
      ) : null}
    </div>
  );
}

function TabularTree({
  mode,
  tree,
  auditor,
  onSaveRisk,
  onTreeRefresh,
}: {
  mode: Mode;
  tree: DocumentTree;
  auditor: boolean;
  onSaveRisk: (
    id: number,
    fields: {
      risk_description: string | null;
      inherent_likelihood: string | null;
      residual_likelihood: string | null;
      inherent_impact: string | null;
      residual_impact: string | null;
    },
    options?: { skipReload?: boolean },
  ) => Promise<void>;
  onTreeRefresh: () => Promise<void>;
}) {
  const rows = useMemo(() => buildGridRows(tree), [tree]);
  const riskAssessmentRows = useMemo(() => buildRiskAssessmentRows(tree), [tree]);
  const [evidenceL2Id, setEvidenceL2Id] = useState<number | null>(null);
  const [riskDraft, setRiskDraft] = useState<Record<number, RiskDraftSlice>>(
    {},
  );
  const [riskSaveBusy, setRiskSaveBusy] = useState(false);

  useEffect(() => {
    const next: Record<
      number,
      { rd: string; il: string; rl: string; ii: string; ri: string }
    > = {};
    for (const c of tree.categories) {
      for (const l1 of c.level1) {
        next[l1.id] = {
          rd: l1.risk_description ?? "",
          il: l1.inherent_likelihood ?? "",
          rl: l1.residual_likelihood ?? "",
          ii: l1.inherent_impact ?? "",
          ri: l1.residual_impact ?? "",
        };
      }
    }
    setRiskDraft(next);
  }, [tree]);

  const setRiskField = (
    l1Id: number,
    field: "rd" | "il" | "rl" | "ii" | "ri",
    value: string,
  ) => {
    setRiskDraft((s) => {
      const prev = s[l1Id] ?? { rd: "", il: "", rl: "", ii: "", ri: "" };
      return {
        ...s,
        [l1Id]: { ...prev, [field]: value },
      };
    });
  };

  const dirtyRiskL1Ids = useMemo(() => {
    if (mode !== "risk" || auditor) return [] as number[];
    const ids: number[] = [];
    for (const { l1 } of riskAssessmentRows) {
      const d = riskDraft[l1.id];
      if (isRiskL1Dirty(l1, d)) ids.push(l1.id);
    }
    return ids;
  }, [auditor, mode, riskAssessmentRows, riskDraft]);

  const saveAllDirtyRisks = async () => {
    if (dirtyRiskL1Ids.length === 0) return;
    const toSave = dirtyRiskL1Ids
      .map((id) => {
        const d = riskDraft[id];
        const l1 = riskAssessmentRows.find((r) => r.l1.id === id)?.l1;
        if (!d || !l1 || !isRiskL1Dirty(l1, d)) return null;
        return { id, fields: riskFieldsFromDraft(d) };
      })
      .filter((x): x is { id: number; fields: ReturnType<typeof riskFieldsFromDraft> } => x !== null);
    if (toSave.length === 0) return;
    setRiskSaveBusy(true);
    try {
      for (let i = 0; i < toSave.length; i++) {
        const { id, fields } = toSave[i];
        await onSaveRisk(id, fields, {
          skipReload: i < toSave.length - 1,
        });
      }
      toast.success(
        toSave.length === 1 ? "Risk saved" : `${toSave.length} risks saved`,
      );
    } catch {
      toast.error("Could not save one or more risks. Try again.");
    } finally {
      setRiskSaveBusy(false);
    }
  };

  const runReport = () => {
    const safeName = tree.name.replace(/[^\w\-]+/g, "_").slice(0, 80);
    if (mode === "risk") {
      downloadCsv(
        `risk-register_${safeName}.csv`,
        [
          "document_name",
          "category",
          "level_1",
          "level_2",
          "risk_description",
          "inherent_likelihood",
          "inherent_impact",
          "residual_likelihood",
          "residual_impact",
        ],
        riskAssessmentRows.map(({ cat, l1 }) => {
          const l2anchor = l1.level2[0]?.name ?? "";
          return [
            tree.name,
            cat.name,
            l1.name,
            l2anchor,
            l1.risk_description ?? "",
            l1.inherent_likelihood ?? "",
            l1.inherent_impact ?? "",
            l1.residual_likelihood ?? "",
            l1.residual_impact ?? "",
          ];
        }),
      );
    } else {
      downloadCsv(
        `document-compliance_${safeName}.csv`,
        [
          "document_name",
          "category",
          "level_1",
          "level_2",
          "category_in_scope",
          "level_1_in_scope",
          "level_2_in_scope",
          "control_guidance",
          "evidence_summary",
        ],
        rows.map((r) => {
          const evParts = r.l2.evidence.map(
            (e) => `${e.name}${e.include ? "" : " (out of scope)"}`,
          );
          return [
            tree.name,
            r.cat.name,
            r.l1.name,
            r.l2.name,
            r.cat.include,
            r.l1.include,
            r.l2.include,
            (r.l2.desc ?? "").replace(/\r?\n/g, " ").slice(0, 8000),
            evParts.join(" | "),
          ];
        }),
      );
    }
  };

  const riskUi = mode === "risk";

  return (
    <div className="space-y-4">
      <CsvImportToolbar
        variant={riskUi ? "slate-admin" : "default"}
        hintIconOnly={riskUi}
        actionsSlot={
          <>
            <button
              type="button"
              className={riskUi ? "btn-risk-nav text-xs px-4 py-1.5" : "btn-nav-pill"}
              onClick={runReport}
            >
              CSV Download
            </button>
            {riskUi ? (
              <>
                <Link href="/risk" className="btn-risk-nav text-xs px-4 py-1.5">
                  Risk dashboard
                </Link>
                <a
                  href="/api/risk/report-pdf"
                  className="btn-risk-nav inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs"
                >
                  <FileText className="size-3.5 shrink-0 opacity-90" aria-hidden />
                  PDF report
                </a>
              </>
            ) : null}
            {riskUi && !auditor ? (
              <button
                type="button"
                className="btn-risk-primary px-4 py-1.5 text-xs"
                disabled={riskSaveBusy || dirtyRiskL1Ids.length === 0}
                onClick={() => void saveAllDirtyRisks()}
              >
                {riskSaveBusy ? "Saving…" : "Save risk"}
              </button>
            ) : null}
          </>
        }
        title={
          mode === "risk"
            ? "Import risk register (updates existing tree rows)"
            : "Import compliance register (updates scope & control text)"
        }
        templateFileName={
          mode === "risk"
            ? "risk_register_import_template.csv"
            : "compliance_register_import_template.csv"
        }
        templateHeaders={
          mode === "risk" ? RISK_REGISTER_HEADERS : COMPLIANCE_REGISTER_HEADERS
        }
        templateRows={
          mode === "risk"
            ? [riskTemplateExampleRow()]
            : [complianceTemplateExampleRow()]
        }
        importUrl="/api/import/flat-register"
        getImportBody={(csv) => ({ csv, mode })}
        hint={
          mode === "risk"
            ? "document_name must match the selected certification document. Match category + level_1; level_2 may be blank (updates level 1 only) or a real level-2 name. Scope is not changed by risk import."
            : "Same matching rules as risk. control_guidance updates level-2 text. evidence_summary is export-only for now."
        }
        onImportDone={() => void onTreeRefresh()}
      />
      <p
        className={
          riskUi ? "text-xs text-slate-600" : "text-xs text-neutral-500"
        }
      >
        {riskUi
          ? "Edits apply after Save risk. Certification document, description, inherent/residual likelihood & impact. Scope is managed separately."
          : "Compliance: control guidance per level 2; use Evidence to add titles and references. Scope is managed under Compliance scope."}
      </p>
      <div
        className={
          riskUi ? "risk-table-theme risk-table-wrap" : "cc-table-wrap"
        }
      >
      <table className="cc-table">
        {mode === "risk" ? (
          <>
            <thead>
              <tr>
                <th>Certification document</th>
                <th>Risk (description)</th>
                <th>Inherent likelihood</th>
                <th>Inherent impact</th>
                <th>Residual likelihood</th>
                <th>Residual impact</th>
              </tr>
            </thead>
            <tbody>
              {riskAssessmentRows.map(({ l1 }) => (
                <tr
                  key={l1.id}
                  className={!l1.effective ? "cc-muted" : undefined}
                >
                  <td className="min-w-[10rem] font-medium">
                    <TruncatedText text={tree.name} />
                  </td>
                  <td className="max-w-md align-top">
                    {!auditor ? (
                      <textarea
                        className="min-h-[4.5rem] w-full max-w-xl resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-xs leading-snug shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        rows={3}
                        value={riskDraft[l1.id]?.rd ?? ""}
                        onChange={(e) =>
                          setRiskField(l1.id, "rd", e.target.value)
                        }
                        placeholder="Describe the risk for this level-1 control area"
                      />
                    ) : (
                      <div className="text-xs">
                        <TruncatedText
                          text={l1.risk_description}
                          preserveLines
                        />
                      </div>
                    )}
                  </td>
                  <td className="align-top">
                    {!auditor ? (
                      <select
                        value={riskDraft[l1.id]?.il ?? ""}
                        onChange={(e) =>
                          setRiskField(l1.id, "il", e.target.value)
                        }
                      >
                        <option value="">—</option>
                        {LIK.map((o) => (
                          <option key={o} value={o}>
                            {o.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>
                        <TruncatedText text={l1.inherent_likelihood} />
                      </span>
                    )}
                  </td>
                  <td className="align-top">
                    {!auditor ? (
                      <select
                        value={riskDraft[l1.id]?.ii ?? ""}
                        onChange={(e) =>
                          setRiskField(l1.id, "ii", e.target.value)
                        }
                      >
                        <option value="">—</option>
                        {IMP.map((o) => (
                          <option key={o} value={o}>
                            {o.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>
                        <TruncatedText text={l1.inherent_impact} />
                      </span>
                    )}
                  </td>
                  <td className="align-top">
                    {!auditor ? (
                      <select
                        value={riskDraft[l1.id]?.rl ?? ""}
                        onChange={(e) =>
                          setRiskField(l1.id, "rl", e.target.value)
                        }
                      >
                        <option value="">—</option>
                        {LIK.map((o) => (
                          <option key={o} value={o}>
                            {o.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>
                        <TruncatedText text={l1.residual_likelihood} />
                      </span>
                    )}
                  </td>
                  <td className="align-top">
                    {!auditor ? (
                      <select
                        value={riskDraft[l1.id]?.ri ?? ""}
                        onChange={(e) =>
                          setRiskField(l1.id, "ri", e.target.value)
                        }
                      >
                        <option value="">—</option>
                        {IMP.map((o) => (
                          <option key={o} value={o}>
                            {o.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>
                        <TruncatedText text={l1.residual_impact} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </>
        ) : (
          <>
            <thead>
              <tr>
                <th>Category</th>
                <th>Level 1</th>
                <th>Level 2</th>
                <th>Control / guidance</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.l2.id}
                  className={!r.l2.effective ? "cc-muted" : undefined}
                >
                  {r.categoryRowSpan > 0 ? (
                    <td rowSpan={r.categoryRowSpan}>
                      <div className="font-medium">
                        <TruncatedText text={r.cat.name} />
                      </div>
                      {r.cat.desc ? (
                        <div className="mt-1 text-xs text-neutral-500">
                          <TruncatedText text={r.cat.desc} preserveLines />
                        </div>
                      ) : null}
                    </td>
                  ) : null}
                  {r.l1RowSpan > 0 ? (
                    <td rowSpan={r.l1RowSpan}>
                      <div className="font-medium">
                        <TruncatedText text={r.l1.name} />
                      </div>
                      {r.l1.desc ? (
                        <div className="mt-1 text-xs text-neutral-500">
                          <TruncatedText text={r.l1.desc} preserveLines />
                        </div>
                      ) : null}
                    </td>
                  ) : null}
                  <td>
                    <div className="font-medium">
                      <TruncatedText text={r.l2.name} />
                    </div>
                  </td>
                  <td className="max-w-md">
                    <div className="font-sans text-xs">
                      {r.l2.desc ? (
                        <TruncatedText text={r.l2.desc} preserveLines />
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center align-middle">
                    {!auditor ? (
                      <button
                        type="button"
                        className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-100"
                        onClick={() => setEvidenceL2Id(r.l2.id)}
                      >
                        Evidence
                      </button>
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </>
        )}
      </table>
      </div>
      {mode === "compliance" ? (
        <EvidenceModal
          tree={tree}
          l2Id={evidenceL2Id}
          open={evidenceL2Id !== null}
          onClose={() => setEvidenceL2Id(null)}
          auditor={auditor}
          onRefresh={onTreeRefresh}
        />
      ) : null}
    </div>
  );
}

function EvidenceModal({
  tree,
  l2Id,
  open,
  onClose,
  auditor,
  onRefresh,
}: {
  tree: DocumentTree;
  l2Id: number | null;
  open: boolean;
  onClose: () => void;
  auditor: boolean;
  onRefresh: () => Promise<void>;
}) {
  const path =
    open && l2Id != null ? findL2Path(tree, l2Id) : undefined;

  if (!open || l2Id == null || !path) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-[8vh] backdrop-blur-[2px]"
      role="presentation"
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-4xl rounded-2xl border border-neutral-200/90 bg-white shadow-[0_8px_30px_rgb(0_0_0_/_0.08)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-dialog-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <h3
            id="evidence-dialog-title"
            className="text-base font-semibold tracking-tight text-neutral-950"
          >
            Evidence
          </h3>
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-5 py-4">
          <p className="mb-3 text-xs text-neutral-500">
            Certification document:{" "}
            <span className="font-medium text-neutral-900">{tree.name}</span>
          </p>
          <table className="cc-table mb-4 text-xs">
            <thead>
              <tr>
                <th>Category</th>
                <th>Level 1</th>
                <th>Level 2</th>
                <th>Control / guidance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">
                  <TruncatedText text={path.cat.name} />
                </td>
                <td className="font-medium">
                  <TruncatedText text={path.l1.name} />
                </td>
                <td className="font-medium">
                  <TruncatedText text={path.l2.name} />
                </td>
                <td className="max-w-md">
                  {path.l2.desc ? (
                    <TruncatedText text={path.l2.desc} preserveLines />
                  ) : (
                        <span className="text-neutral-500">—</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          <EvidenceTable
            l2={path.l2}
            auditor={auditor}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
}

function EvidenceTable({
  l2,
  auditor,
  onRefresh,
}: {
  l2: DocumentTree["categories"][number]["level1"][number]["level2"][number];
  auditor: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          desc: desc.trim(),
          url: url.trim() || undefined,
          level_2_ID: l2.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to add evidence");
      setName("");
      setDesc("");
      setUrl("");
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this evidence record?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/evidence/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-neutral-100 pt-4">
      <div className="mb-3 text-xs font-semibold text-neutral-800">
        Evidence (level 2 ref: {l2.id}) — metadata only until file upload is enabled
      </div>
      <table className="cc-table text-xs">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>URL / reference</th>
            {!auditor ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {l2.evidence.map((ev) => (
            <tr key={ev.id} className={!ev.effective ? "cc-muted" : undefined}>
              <td className="font-medium">
                <TruncatedText text={ev.name} />
              </td>
              <td>
                <TruncatedText text={ev.desc} preserveLines />
              </td>
              <td className="break-all">
                <TruncatedText text={ev.url} />
              </td>
              {!auditor ? (
                <td>
                  <button
                    type="button"
                    className="text-red-800 underline disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void remove(ev.id)}
                  >
                    Delete
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
          {!auditor ? (
            <tr>
              <td>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                  placeholder="Title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </td>
              <td>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                  placeholder="Description"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </td>
              <td>
                <input
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                  placeholder="URL or path"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </td>
              <td>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
                  onClick={() => void add()}
                >
                  Add row
                </button>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
