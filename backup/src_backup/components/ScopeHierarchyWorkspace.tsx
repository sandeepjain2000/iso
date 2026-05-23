"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TruncatedText } from "@/components/TruncatedText";
import { cn } from "@/lib/utils";
import type { DocumentTree } from "@/lib/tree-types";

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

async function patchScope(
  entity: "document" | "category" | "level1" | "level2",
  id: number,
  include: boolean,
) {
  const res = await fetch("/api/scope", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, id, include }),
  });
  if (!res.ok) throw new Error("Scope update failed");
}

export function ScopeHierarchyWorkspace({
  title,
  description,
  tone = "neutral",
}: {
  title: string;
  description: string;
  tone?: "neutral" | "slate-admin";
}) {
  const slate = tone === "slate-admin";
  const [docs, setDocs] = useState<{ id: number; name: string }[]>([]);
  const [docId, setDocId] = useState<number | null>(null);
  const [tree, setTree] = useState<DocumentTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    if (docId === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tree/${docId}?auditor=0&omitExcluded=0`);
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
  }, [docId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/documents?auditor=0");
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
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const onToggleInclude = async (
    entity: "document" | "category" | "level1" | "level2",
    id: number,
    include: boolean,
  ) => {
    await patchScope(entity, id, include);
    await loadTree();
    const res = await fetch("/api/documents?auditor=0");
    const data = (await res.json()) as { id: number; name: string }[];
    setDocs(data);
  };

  const rows = useMemo(() => (tree ? buildGridRows(tree) : []), [tree]);

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "bg-white p-6",
          slate
            ? "rounded-lg border border-slate-200 shadow-sm"
            : "rounded-2xl border border-neutral-200/80 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)]",
        )}
      >
        <h2
          className={cn(
            "tracking-tight",
            slate
              ? "text-2xl font-bold text-slate-800"
              : "text-xl font-semibold text-neutral-950",
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            "mt-2 max-w-3xl text-sm leading-relaxed",
            slate ? "text-slate-600" : "text-neutral-600",
          )}
        >
          {description}
        </p>
      </div>

      <div
        className={cn(
          "bg-white p-4 sm:p-5",
          slate
            ? "rounded-lg border border-slate-200 shadow-sm"
            : "rounded-2xl border border-neutral-200/80 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)]",
        )}
      >
      <table
        className={cn(
          "cc-toolbar-table max-w-full border-0 shadow-none",
          slate && "[&_th]:text-slate-600 [&_td]:text-slate-800",
        )}
      >
        <tbody>
          <tr>
            <th scope="row">Certification document</th>
            <td>
              <select
                className={cn(
                  "w-full max-w-xl bg-white px-3 py-2 text-sm shadow-sm focus:outline-none",
                  slate
                    ? "rounded-md border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                    : "rounded-xl border border-neutral-200 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100",
                )}
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
            <th scope="row">Document in audit scope</th>
            <td>
              {tree ? (
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tree.include}
                    onChange={(e) =>
                      void onToggleInclude("document", tree.id, e.target.checked)
                    }
                  />
                  <span className="text-sm">Included</span>
                </label>
              ) : (
                <span className="text-sm text-neutral-500">—</span>
              )}
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

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <TruncatedText text={error} preserveLines />
        </div>
      ) : null}

      {loading ? (
        <p
          className={cn(
            "text-sm",
            slate ? "text-slate-500" : "text-neutral-500",
          )}
        >
          Loading hierarchy…
        </p>
      ) : null}

      {tree && !loading ? (
        <div
          className={cn(
            slate ? "risk-table-theme risk-table-wrap" : "cc-table-wrap",
          )}
        >
          <p
            className={cn(
              "mb-3 text-xs",
              slate ? "text-slate-600" : "text-neutral-500",
            )}
          >
            Excluded branches are hidden on the Risk and Document compliance
            screens. Changes apply to both.
          </p>
          <table className="cc-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Level 1</th>
                <th>Level 2</th>
                <th>Category in scope</th>
                <th>Level 1 in scope</th>
                <th>Level 2 in scope</th>
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
                    {r.categoryRowSpan > 0 ? (
                      <td rowSpan={r.categoryRowSpan} className="text-center">
                        <input
                          type="checkbox"
                          checked={r.cat.include}
                          title="Category in audit scope"
                          onChange={(e) =>
                            void onToggleInclude(
                              "category",
                              r.cat.id,
                              e.target.checked,
                            )
                          }
                        />
                      </td>
                    ) : null}
                    {r.l1RowSpan > 0 ? (
                      <td rowSpan={r.l1RowSpan} className="text-center">
                        <input
                          type="checkbox"
                          checked={r.l1.include}
                          title="Level 1 in audit scope"
                          onChange={(e) =>
                            void onToggleInclude(
                              "level1",
                              r.l1.id,
                              e.target.checked,
                            )
                          }
                        />
                      </td>
                    ) : null}
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={r.l2.include}
                        title="Level 2 in audit scope"
                        onChange={(e) =>
                          void onToggleInclude(
                            "level2",
                            r.l2.id,
                            e.target.checked,
                          )
                        }
                      />
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
