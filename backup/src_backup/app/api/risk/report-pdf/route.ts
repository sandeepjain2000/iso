import { buildRiskRegisterPdf } from "@/lib/risk-report-pdf";
import { loadScopedRiskL1Rows } from "@/lib/risk-dashboard";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rows = await loadScopedRiskL1Rows(session.tenantId);
    const pdfBytes = await buildRiskRegisterPdf(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    const body = Buffer.from(pdfBytes);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="risk-register-all_${stamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
