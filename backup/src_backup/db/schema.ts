import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const tenant = sqliteTable("tenant", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  created_at: text("created_at").notNull(),
});

/** Credential hashes only (e.g. bcrypt); never store plaintext passwords. */
export const user = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenantId")
    .notNull()
    .references(() => tenant.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: text("role").notNull().default("USER"),
  createdBy: integer("createdBy").references((): AnySQLiteColumn => user.id, {
    onDelete: "set null",
  }),
  updatedBy: integer("updatedBy").references((): AnySQLiteColumn => user.id, {
    onDelete: "set null",
  }),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const isoDocument = sqliteTable(
  "iso_document",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenant.id),
    name: text("name").notNull(),
    desc: text("desc"),
    include: integer("include", { mode: "boolean" }).notNull().default(true),
    createdBy: integer("createdBy")
      .notNull()
      .references(() => user.id),
    updatedBy: integer("updatedBy")
      .notNull()
      .references(() => user.id),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("iso_document_tenant_name").on(t.tenantId, t.name)],
);

export const isoCategory = sqliteTable(
  "iso_category",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenant.id),
    name: text("name").notNull(),
    desc: text("desc"),
    include: integer("include", { mode: "boolean" }).notNull().default(true),
    documentId: integer("documentId")
      .notNull()
      .references(() => isoDocument.id, { onDelete: "cascade" }),
    createdBy: integer("createdBy")
      .notNull()
      .references(() => user.id),
    updatedBy: integer("updatedBy")
      .notNull()
      .references(() => user.id),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("iso_category_name_documentId").on(t.name, t.documentId)],
);

export const isoLevel1 = sqliteTable(
  "iso_level_1",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenant.id),
    name: text("name").notNull(),
    desc: text("desc"),
    include: integer("include", { mode: "boolean" }).notNull().default(true),
    categoryId: integer("categoryId")
      .notNull()
      .references(() => isoCategory.id, { onDelete: "cascade" }),
    risk_description: text("risk_description"),
    inherent_likelihood: text("inherent_likelihood"),
    residual_likelihood: text("residual_likelihood"),
    inherent_impact: text("inherent_impact"),
    residual_impact: text("residual_impact"),
    createdBy: integer("createdBy")
      .notNull()
      .references(() => user.id),
    updatedBy: integer("updatedBy")
      .notNull()
      .references(() => user.id),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("iso_level_1_name_categoryId").on(t.name, t.categoryId)],
);

export const isoLevel2 = sqliteTable(
  "iso_level_2",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenant.id),
    name: text("name").notNull(),
    desc: text("desc"),
    include: integer("include", { mode: "boolean" }).notNull().default(true),
    level_1_ID: integer("level_1_ID")
      .notNull()
      .references(() => isoLevel1.id, { onDelete: "cascade" }),
    createdBy: integer("createdBy")
      .notNull()
      .references(() => user.id),
    updatedBy: integer("updatedBy")
      .notNull()
      .references(() => user.id),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("iso_level_2_name_level_1").on(t.name, t.level_1_ID)],
);

export const isoEvidence = sqliteTable("iso_evidence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenantId")
    .notNull()
    .references(() => tenant.id),
  name: text("name").notNull(),
  desc: text("desc"),
  url: text("url"),
  include: integer("include", { mode: "boolean" }).notNull().default(true),
  level_2_ID: integer("level_2_ID")
    .notNull()
    .references(() => isoLevel2.id, { onDelete: "cascade" }),
  createdBy: integer("createdBy")
    .notNull()
    .references(() => user.id),
  updatedBy: integer("updatedBy")
    .notNull()
    .references(() => user.id),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const isoAssetType = sqliteTable(
  "iso_asset_type",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenant.id),
    asset_type: text("asset_type").notNull(),
  },
  (t) => [uniqueIndex("iso_asset_type_tenant_type").on(t.tenantId, t.asset_type)],
);

export const isoAssetSubtype = sqliteTable(
  "iso_asset_subtype",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenant.id),
    name: text("name").notNull(),
    asset_type_id: integer("asset_type_id")
      .notNull()
      .references(() => isoAssetType.id),
  },
  (t) => [
    uniqueIndex("iso_asset_subtype_tenant_type_name").on(
      t.tenantId,
      t.asset_type_id,
      t.name,
    ),
  ],
);

export const isoAsset = sqliteTable(
  "iso_asset",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenantId")
      .notNull()
      .references(() => tenant.id),
    asset_id: text("asset_id").notNull(),
    sku_number: text("sku_number"),
    asset_name: text("asset_name").notNull(),
    asset_type_id: integer("asset_type_id")
      .notNull()
      .references(() => isoAssetType.id),
    asset_subtype_id: integer("asset_subtype_id").references(
      () => isoAssetSubtype.id,
    ),
    asset_description: text("asset_description"),
    owner: text("owner").notNull(),
    createdBy: integer("createdBy")
      .notNull()
      .references(() => user.id),
    updatedBy: integer("updatedBy")
      .notNull()
      .references(() => user.id),
    custodianEmail: text("custodianEmail"),
    location: text("location").notNull(),
    asset_classification: text("asset_classification").notNull(),
    asset_risk_level: text("asset_risk_level").notNull(),
    asset_associated_risks: text("asset_associated_risks"),
    vulnerabilities: text("vulnerabilities"),
    asset_cost: integer("asset_cost").notNull(),
    asset_criticality: text("asset_criticality").notNull(),
    iso_clause_ref: text("iso_clause_ref").notNull(),
    controls: text("controls"),
    maintenance_schedule: text("maintenance_schedule"),
    asset_condition: text("asset_condition").notNull(),
    acquired_date: text("acquired_date").notNull(),
    disposal_date: text("disposal_date"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("iso_asset_tenant_asset_id").on(t.tenantId, t.asset_id)],
);
