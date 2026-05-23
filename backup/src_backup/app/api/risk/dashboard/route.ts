import {
  buildDashboardFromRows,
  loadScopedRiskL1Rows,
} from "@/lib/risk-dashboard";
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
    const dashboard = buildDashboardFromRows(rows);
    return Response.json({ dashboard, rowCount: rows.length });
  } catch (err) {
    return serverError(err);
  }
}
