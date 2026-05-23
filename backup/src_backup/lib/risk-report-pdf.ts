import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont } from "pdf-lib";

import type { RiskL1FlatRow } from "@/lib/risk-dashboard";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;

function wrapLine(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
): string[] {
  const words = text.replace(/\r?\n/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW) line = next;
    else {
      if (line) out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

/** Multi-page PDF of in-scope level-1 risks (same data as tenant CSV export). */
export async function buildRiskRegisterPdf(
  rows: RiskL1FlatRow[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const maxW = PAGE_W - 2 * MARGIN;
  const lineGap = 12;
  const smallGap = 10;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (minY: number) => {
    if (y < minY) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const drawLines = (
    text: string,
    size: number,
    font: PDFFont,
    step = lineGap,
  ) => {
    for (const ln of wrapLine(text, font, size, maxW)) {
      ensureSpace(MARGIN + step);
      page.drawText(ln, {
        x: MARGIN,
        y,
        size,
        font,
        color: rgb(0.12, 0.12, 0.14),
      });
      y -= step;
    }
  };

  drawLines("Risk assessment register", 16, bold, 18);
  drawLines(
    `Generated ${new Date().toISOString().slice(0, 10)} · ${rows.length} level-1 row(s)`,
    10,
    regular,
    14,
  );
  y -= 4;
  drawLines(
    "Per row: document, category, level 1, level 2 anchor, risk description, inherent and residual likelihood & impact.",
    9,
    regular,
    smallGap,
  );
  y -= 8;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    ensureSpace(MARGIN + 72);
    drawLines(
      `${i + 1}. ${r.documentName} / ${r.categoryName} / ${r.level1Name}`,
      10,
      bold,
      13,
    );
    const desc = (r.riskDescription ?? "").trim() || "—";
    drawLines(`Risk: ${desc}`, 9, regular, smallGap);
    drawLines(
      `Inherent L/I: ${r.inherentLikelihood ?? "—"} / ${r.inherentImpact ?? "—"}   Residual L/I: ${r.residualLikelihood ?? "—"} / ${r.residualImpact ?? "—"}   Level 2: ${r.level2Anchor ?? "—"}`,
      9,
      regular,
      smallGap,
    );
    y -= 6;
  }

  return doc.save();
}
