import { buildDocumentTree } from "@/lib/build-document-tree";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ documentId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { documentId } = await ctx.params;
    const id = Number(documentId);
    if (!Number.isFinite(id)) {
      return Response.json({ error: "Invalid document id" }, { status: 400 });
    }
    const auditor = new URL(req.url).searchParams.get("auditor") === "1";
    const omitExcluded =
      new URL(req.url).searchParams.get("omitExcluded") === "1";
    const tree = await buildDocumentTree(
      id,
      auditor,
      session.tenantId,
      omitExcluded,
    );
    if (!tree) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(tree);
  } catch (err) {
    return serverError(err);
  }
}
