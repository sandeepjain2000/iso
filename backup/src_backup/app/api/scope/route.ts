import {
  getDb,
  isoDocument,
  isoCategory,
  isoLevel1,
  isoLevel2,
  isoEvidence,
} from "@/db";
import { getSession } from "@/lib/require-session";
import { serverError } from "@/lib/server-error";
import {
  categoryBelongsToTenant,
  documentBelongsToTenant,
  evidenceBelongsToTenant,
  level1BelongsToTenant,
  level2BelongsToTenant,
} from "@/lib/tenant-guards";
import { eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

const ENTITIES = [
  "document",
  "category",
  "level1",
  "level2",
  "evidence",
] as const;

type Entity = (typeof ENTITIES)[number];

const now = () => new Date().toISOString();

type Body = {
  entity: Entity;
  id: number;
  include: boolean;
};

function isEntity(s: unknown): s is Entity {
  return typeof s === "string" && (ENTITIES as readonly string[]).includes(s);
}

export async function PATCH(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { entity, id, include } = body;
  if (!isEntity(entity)) {
    return Response.json({ error: "Invalid entity type" }, { status: 400 });
  }
  if (!Number.isFinite(id) || typeof include !== "boolean") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const ts = now();
  const tid = session.tenantId;

  try {
    switch (entity) {
      case "document": {
        const ok = await documentBelongsToTenant(id, tid);
        if (!ok) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        await db
          .update(isoDocument)
          .set({ include, updated_at: ts })
          .where(eq(isoDocument.id, id));
        const catRows = await db
          .select({ id: isoCategory.id })
          .from(isoCategory)
          .where(eq(isoCategory.documentId, id));
        const catIds = catRows.map((r) => r.id);
        if (catIds.length) {
          await db
            .update(isoCategory)
            .set({ include, updated_at: ts })
            .where(inArray(isoCategory.id, catIds));
          const l1Rows = await db
            .select({ id: isoLevel1.id })
            .from(isoLevel1)
            .where(inArray(isoLevel1.categoryId, catIds));
          const l1Ids = l1Rows.map((r) => r.id);
          if (l1Ids.length) {
            await db
              .update(isoLevel1)
              .set({ include, updated_at: ts })
              .where(inArray(isoLevel1.id, l1Ids));
            const l2Rows = await db
              .select({ id: isoLevel2.id })
              .from(isoLevel2)
              .where(inArray(isoLevel2.level_1_ID, l1Ids));
            const l2Ids = l2Rows.map((r) => r.id);
            if (l2Ids.length) {
              await db
                .update(isoLevel2)
                .set({ include, updated_at: ts })
                .where(inArray(isoLevel2.id, l2Ids));
              await db
                .update(isoEvidence)
                .set({ include, updated_at: ts })
                .where(inArray(isoEvidence.level_2_ID, l2Ids));
            }
          }
        }
        break;
      }
      case "category": {
        const ok = await categoryBelongsToTenant(id, tid);
        if (!ok) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        await db
          .update(isoCategory)
          .set({ include, updated_at: ts })
          .where(eq(isoCategory.id, id));
        const l1Rows = await db
          .select({ id: isoLevel1.id })
          .from(isoLevel1)
          .where(eq(isoLevel1.categoryId, id));
        const l1Ids = l1Rows.map((r) => r.id);
        if (l1Ids.length) {
          await db
            .update(isoLevel1)
            .set({ include, updated_at: ts })
            .where(inArray(isoLevel1.id, l1Ids));
          const l2Rows = await db
            .select({ id: isoLevel2.id })
            .from(isoLevel2)
            .where(inArray(isoLevel2.level_1_ID, l1Ids));
          const l2Ids = l2Rows.map((r) => r.id);
          if (l2Ids.length) {
            await db
              .update(isoLevel2)
              .set({ include, updated_at: ts })
              .where(inArray(isoLevel2.id, l2Ids));
            await db
              .update(isoEvidence)
              .set({ include, updated_at: ts })
              .where(inArray(isoEvidence.level_2_ID, l2Ids));
          }
        }
        break;
      }
      case "level1": {
        const ok = await level1BelongsToTenant(id, tid);
        if (!ok) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        await db
          .update(isoLevel1)
          .set({ include, updated_at: ts })
          .where(eq(isoLevel1.id, id));
        const l2Rows = await db
          .select({ id: isoLevel2.id })
          .from(isoLevel2)
          .where(eq(isoLevel2.level_1_ID, id));
        const l2Ids = l2Rows.map((r) => r.id);
        if (l2Ids.length) {
          await db
            .update(isoLevel2)
            .set({ include, updated_at: ts })
            .where(inArray(isoLevel2.id, l2Ids));
          await db
            .update(isoEvidence)
            .set({ include, updated_at: ts })
            .where(inArray(isoEvidence.level_2_ID, l2Ids));
        }
        break;
      }
      case "level2": {
        const ok = await level2BelongsToTenant(id, tid);
        if (!ok) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        await db
          .update(isoLevel2)
          .set({ include, updated_at: ts })
          .where(eq(isoLevel2.id, id));
        await db
          .update(isoEvidence)
          .set({ include, updated_at: ts })
          .where(eq(isoEvidence.level_2_ID, id));
        break;
      }
      case "evidence": {
        const ok = await evidenceBelongsToTenant(id, tid);
        if (!ok) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        await db
          .update(isoEvidence)
          .set({ include, updated_at: ts })
          .where(eq(isoEvidence.id, id));
        break;
      }
    }
  } catch (err) {
    return serverError(err);
  }

  return Response.json({ ok: true });
}
