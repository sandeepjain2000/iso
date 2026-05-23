import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  isoAssetSubtype,
  isoAssetType,
  tenant,
  user,
} from "@/db/schema";
import { DEMO_PASSWORD, DEMO_TENANTS } from "@/lib/demo-tenants";
import type * as schema from "@/db/schema";

/**
 * Ensures demo tenants, demo admin users (bcrypt password), and default asset
 * types for empty tenants. Safe to run after migrations or full CSV seed.
 */
export async function ensureDemoUsers(
  db: BetterSQLite3Database<typeof schema>,
) {
  const ts = new Date().toISOString();
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  for (let i = 0; i < DEMO_TENANTS.length; i++) {
    const t = DEMO_TENANTS[i]!;
    const tid = i + 1;
    await db
      .insert(tenant)
      .values({
        id: tid,
        name: t.name,
        slug: t.slug,
        created_at: ts,
      })
      .onConflictDoNothing();
  }

  for (let i = 0; i < DEMO_TENANTS.length; i++) {
    const t = DEMO_TENANTS[i]!;
    const tid = i + 1;
    await db
      .insert(user)
      .values({
        tenantId: tid,
        name: `${t.name} Admin`,
        email: t.email.toLowerCase(),
        password_hash: hash,
        role: "ADMIN",
        createdBy: null,
        updatedBy: null,
        created_at: ts,
        updated_at: ts,
      })
      .onConflictDoUpdate({
        target: user.email,
        set: {
          password_hash: hash,
          tenantId: tid,
          updated_at: ts,
        },
      });
  }

  for (let tid = 2; tid <= DEMO_TENANTS.length; tid++) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(isoAssetType)
      .where(eq(isoAssetType.tenantId, tid));
    if ((n ?? 0) > 0) continue;
    const [typeRow] = await db
      .insert(isoAssetType)
      .values({ tenantId: tid, asset_type: "General" })
      .returning();
    if (typeRow) {
      await db.insert(isoAssetSubtype).values({
        tenantId: tid,
        name: "Default",
        asset_type_id: typeRow.id,
      });
    }
  }
}
