"use client";

import { useCallback } from "react";
import { downloadCsv } from "@/lib/download-csv";
import {
  ASSET_IMPORT_HEADERS,
  ASSET_TEMPLATE_NOTE,
  COMPLIANCE_REGISTER_HEADERS,
  RISK_REGISTER_HEADERS,
  assetTemplateExampleRow,
  complianceTemplateExampleRow,
  riskTemplateExampleRow,
} from "@/lib/import-csv-specs";

/** Space out triggers so each file appears as its own download (browser limits vary). */
function stagger(fns: (() => void)[], gapMs = 520) {
  fns.forEach((fn, i) => {
    window.setTimeout(fn, i * gapMs);
  });
}

export function OverviewImportSection() {
  const downloadGuide = useCallback(() => {
    downloadCsv(
      "import_guide_all_screens.csv",
      ["screen", "template_file", "import_endpoint", "notes"],
      [
        [
          "Assets",
          "asset_import_template.csv",
          "POST /api/assets/import",
          ASSET_TEMPLATE_NOTE,
        ],
        [
          "Risk",
          "risk_register_import_template.csv",
          "POST /api/import/flat-register (mode=risk)",
          "Rows must match existing document/category/level names. Updates level-1 risk description and likelihood/impact (not scope). level_2 may be blank.",
        ],
        [
          "Document compliance",
          "compliance_register_import_template.csv",
          "POST /api/import/flat-register (mode=compliance)",
          "Updates scope and level-2 control text. evidence_summary column is not imported.",
        ],
        [
          "Overview",
          "—",
          "—",
          "This page only lists templates; use each screen’s Import control.",
        ],
      ],
    );
  }, []);

  const downloadAllTemplates = useCallback(() => {
    const ex = assetTemplateExampleRow();
    const assetRow = ASSET_IMPORT_HEADERS.map((h) => ex[h] ?? "");
    // Four separate CSV files (one click): asset, risk, compliance, import guide.
    stagger([
      () =>
        downloadCsv(
          "asset_import_template.csv",
          [...ASSET_IMPORT_HEADERS],
          [assetRow],
        ),
      () =>
        downloadCsv(
          "risk_register_import_template.csv",
          [...RISK_REGISTER_HEADERS],
          [riskTemplateExampleRow()],
        ),
      () =>
        downloadCsv(
          "compliance_register_import_template.csv",
          [...COMPLIANCE_REGISTER_HEADERS],
          [complianceTemplateExampleRow()],
        ),
      downloadGuide,
    ]);
  }, [downloadGuide]);

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)] sm:p-5">
      <div className="cc-table-wrap">
        <table className="cc-table">
          <thead>
            <tr>
              <th>CSV import &amp; templates</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-sm leading-relaxed">
                <p className="text-neutral-600">
                  Download blank templates (with one example row) for{" "}
                  <strong>Assets</strong>, <strong>Risk</strong>, and{" "}
                  <strong>Document compliance</strong>. Use{" "}
                  <strong>Import CSV</strong> on each screen after editing the
                  file. Risk and compliance imports only <strong>update</strong>{" "}
                  rows that already exist (names must match the tree).{" "}
                  <span className="text-neutral-500">
                    “Download all templates + guide” saves{" "}
                    <strong className="font-medium text-neutral-700">
                      four separate CSV files
                    </strong>{" "}
                    (asset, risk, compliance, and guide)—allow multiple downloads
                    if your browser asks.
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={downloadAllTemplates}
                  >
                    Download all templates + guide
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={downloadGuide}
                  >
                    Guide only (CSV)
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
