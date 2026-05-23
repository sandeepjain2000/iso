import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  isoCategory,
  isoDocument,
  isoEvidence,
  isoLevel1,
  isoLevel2,
  isoAsset,
  isoAssetType,
  isoAssetSubtype,
} from "@/db/schema";

export async function documentBelongsToTenant(
  documentId: number,
  tenantId: number,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: isoDocument.id })
    .from(isoDocument)
    .where(
      and(eq(isoDocument.id, documentId), eq(isoDocument.tenantId, tenantId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function categoryBelongsToTenant(
  categoryId: number,
  tenantId: number,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: isoCategory.id })
    .from(isoCategory)
    .innerJoin(isoDocument, eq(isoCategory.documentId, isoDocument.id))
    .where(
      and(eq(isoCategory.id, categoryId), eq(isoDocument.tenantId, tenantId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function level1BelongsToTenant(
  level1Id: number,
  tenantId: number,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: isoLevel1.id })
    .from(isoLevel1)
    .innerJoin(isoCategory, eq(isoLevel1.categoryId, isoCategory.id))
    .innerJoin(isoDocument, eq(isoCategory.documentId, isoDocument.id))
    .where(
      and(eq(isoLevel1.id, level1Id), eq(isoDocument.tenantId, tenantId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function level2BelongsToTenant(
  level2Id: number,
  tenantId: number,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: isoLevel2.id })
    .from(isoLevel2)
    .innerJoin(isoLevel1, eq(isoLevel2.level_1_ID, isoLevel1.id))
    .innerJoin(isoCategory, eq(isoLevel1.categoryId, isoCategory.id))
    .innerJoin(isoDocument, eq(isoCategory.documentId, isoDocument.id))
    .where(
      and(eq(isoLevel2.id, level2Id), eq(isoDocument.tenantId, tenantId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function evidenceBelongsToTenant(
  evidenceId: number,
  tenantId: number,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: isoEvidence.id })
    .from(isoEvidence)
    .innerJoin(isoLevel2, eq(isoEvidence.level_2_ID, isoLevel2.id))
    .innerJoin(isoLevel1, eq(isoLevel2.level_1_ID, isoLevel1.id))
    .innerJoin(isoCategory, eq(isoLevel1.categoryId, isoCategory.id))
    .innerJoin(isoDocument, eq(isoCategory.documentId, isoDocument.id))
    .where(
      and(eq(isoEvidence.id, evidenceId), eq(isoDocument.tenantId, tenantId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function assetBelongsToTenant(
  assetId: number,
  tenantId: number,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: isoAsset.id })
    .from(isoAsset)
    .where(and(eq(isoAsset.id, assetId), eq(isoAsset.tenantId, tenantId)))
    .limit(1);
  return Boolean(row);
}

export async function assetTypeBelongsToTenant(
  typeId: number,
  tenantId: number,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: isoAssetType.id })
    .from(isoAssetType)
    .where(
      and(eq(isoAssetType.id, typeId), eq(isoAssetType.tenantId, tenantId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function assetSubtypeBelongsToTenant(
  subtypeId: number,
  tenantId: number,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: isoAssetSubtype.id })
    .from(isoAssetSubtype)
    .innerJoin(
      isoAssetType,
      eq(isoAssetSubtype.asset_type_id, isoAssetType.id),
    )
    .where(
      and(
        eq(isoAssetSubtype.id, subtypeId),
        eq(isoAssetType.tenantId, tenantId),
      ),
    )
    .limit(1);
  return Boolean(row);
}
