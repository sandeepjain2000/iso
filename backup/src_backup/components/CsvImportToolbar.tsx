"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { InfoHint } from "@/components/InfoHint";
import { downloadCsv } from "@/lib/download-csv";
import { cn } from "@/lib/utils";

export type ImportLogRow = {
  line: number;
  outcome: "imported" | "skipped";
  asset_id: string | null;
  message: string;
};

type Props = {
  templateFileName: string;
  templateHeaders: readonly string[] | string[];
  templateRows?: (string | number | boolean)[][];
  title?: string;
  importUrl: string;
  /** Default body is `{ csv }`. Use for e.g. `{ csv, mode: "risk" }`. */
  getImportBody?: (csv: string) => Record<string, unknown>;
  hint?: string;
  /** When true (with hint), hint is only in the info icon next to the title. */
  hintIconOnly?: boolean;
  onImportDone?: () => void;
  /** Shown in the same row as template / import (e.g. download report, save). */
  actionsSlot?: ReactNode;
  /** Slate/sky admin panel (risk register import). */
  variant?: "default" | "slate-admin";
};

export function CsvImportToolbar({
  templateFileName,
  templateHeaders,
  templateRows = [],
  title = "CSV",
  importUrl,
  getImportBody,
  hint,
  hintIconOnly = false,
  onImportDone,
  actionsSlot,
  variant = "default",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [importLog, setImportLog] = useState<ImportLogRow[] | null>(null);
  const [logTruncated, setLogTruncated] = useState(false);
  const [reportTitle, setReportTitle] = useState<string>("import");

  const downloadTemplate = () => {
    downloadCsv(templateFileName, [...templateHeaders], templateRows);
  };

  const downloadLogReport = useCallback(() => {
    if (!importLog?.length) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadCsv(
      `${reportTitle}_report_${stamp}.csv`,
      ["line", "outcome", "asset_id", "message"],
      importLog.map((r) => [r.line, r.outcome, r.asset_id ?? "", r.message]),
    );
  }, [importLog, reportTitle]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg(null);
    setImportLog(null);
    setLogTruncated(false);
    try {
      const text = await file.text();
      const payload = getImportBody ? getImportBody(text) : { csv: text };
      const res = await fetch(importUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        imported?: number;
        skipped?: number;
        errors?: string[];
        log?: ImportLogRow[];
        log_truncated?: boolean;
      };
      if (!res.ok) {
        setMsg(data.error ?? `Import failed (${res.status})`);
        return;
      }
      const parts = [
        data.imported != null ? `Imported: ${data.imported}` : "",
        data.skipped != null ? `Skipped: ${data.skipped}` : "",
      ].filter(Boolean);
      if (data.errors?.length && !data.log?.length) {
        parts.push(
          `Issues: ${data.errors.slice(0, 8).join("; ")}${data.errors.length > 8 ? "…" : ""}`,
        );
      }
      setMsg(parts.join(". ") || "Done.");
      setReportTitle(
        importUrl.includes("assets")
          ? "asset_import"
          : importUrl.includes("flat-register")
            ? "register_import"
            : "import",
      );
      if (Array.isArray(data.log) && data.log.length > 0) {
        setImportLog(data.log);
        setLogTruncated(Boolean(data.log_truncated));
      } else if (data.errors?.length) {
        setImportLog(
          data.errors.map((message) => {
            const m = /^Line\s+(\d+):\s*(.*)$/i.exec(message.trim());
            return {
              line: m ? Number(m[1]) : 0,
              outcome: "skipped" as const,
              asset_id: null,
              message: m ? m[2]!.trim() : message,
            };
          }),
        );
        setLogTruncated(false);
      }
      onImportDone?.();
    } catch {
      setMsg("Network error during import.");
    } finally {
      setBusy(false);
    }
  };

  const shell =
    variant === "slate-admin"
      ? "rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
      : "rounded-xl border border-neutral-200/90 bg-neutral-50/80 p-3 text-sm";
  const titleCls =
    variant === "slate-admin"
      ? "font-semibold text-slate-800"
      : "font-medium text-neutral-900";
  const hintCls =
    variant === "slate-admin"
      ? "text-xs leading-relaxed text-slate-600"
      : "text-xs leading-relaxed text-neutral-600";
  const btnCls =
    variant === "slate-admin"
      ? "btn-risk-nav px-4 py-1.5 text-xs"
      : "btn-secondary rounded-full px-4 py-1.5 text-xs";

  return (
    <div className={shell}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={titleCls}>{title}</p>
            {hint && hintIconOnly ? (
              <InfoHint label="Import details">{hint}</InfoHint>
            ) : null}
          </div>
          {hint && !hintIconOnly ? <p className={hintCls}>{hint}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:shrink-0">
          {actionsSlot}
          <button type="button" className={btnCls} onClick={downloadTemplate}>
            Download template
          </button>
          <button
            type="button"
            className={btnCls}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Importing…" : "Import CSV…"}
          </button>
          {importLog?.length ? (
            <button type="button" className={btnCls} onClick={downloadLogReport}>
              Download log report (CSV)
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void onFile(e)}
          />
        </div>
      </div>
      {msg ? (
        <p
          className={
            variant === "slate-admin"
              ? "mt-2 text-xs text-slate-800"
              : "mt-2 text-xs text-neutral-800"
          }
          role="status"
        >
          {msg}
        </p>
      ) : null}
      {importLog?.length ? (
        <div className="mt-3 space-y-1.5">
          <p
            className={
              variant === "slate-admin"
                ? "text-xs font-medium text-slate-700"
                : "text-xs font-medium text-neutral-700"
            }
          >
            Import log{" "}
            <span
              className={
                variant === "slate-admin"
                  ? "font-normal text-slate-500"
                  : "font-normal text-neutral-500"
              }
            >
              (CSV row numbers; line 1 is the header)
            </span>
          </p>
          <div
            className={cn(
              "max-h-52 overflow-auto rounded-lg border bg-white px-2 py-1.5 font-mono text-[11px] leading-snug shadow-inner",
              variant === "slate-admin"
                ? "border-slate-200 text-slate-800"
                : "border-neutral-200 text-neutral-800",
            )}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {logTruncated ? (
              <p className="mb-1.5 border-b border-amber-200 bg-amber-50/90 px-1 py-0.5 text-amber-950">
                Log truncated — first {importLog.length} rows shown. Narrow the
                CSV or split imports to capture everything in the report.
              </p>
            ) : null}
            {importLog.map((row, idx) => (
              <div
                key={`log-${idx}-${row.line}`}
                className={cn(
                  "border-b border-neutral-100 py-0.5 last:border-b-0",
                  row.outcome === "skipped"
                    ? "text-red-800"
                    : "text-emerald-900",
                )}
              >
                <span className="text-neutral-500">
                  {row.line > 0 ? `L${row.line}` : "—"}
                </span>{" "}
                <span className="font-semibold uppercase">
                  [{row.outcome}]
                </span>{" "}
                {row.asset_id ? (
                  <span className="text-neutral-600">{row.asset_id} — </span>
                ) : null}
                {row.message}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
