/** Column sets for CSV templates and imports (keep in sync with export formats). */

export const ASSET_IMPORT_HEADERS = [
  "asset_id",
  "sku_number",
  "asset_name",
  "asset_type_id",
  "asset_type",
  "asset_subtype_id",
  "asset_subtype",
  "asset_description",
  "owner",
  "custodian_email",
  "location",
  "asset_classification",
  "asset_risk_level",
  "asset_associated_risks",
  "vulnerabilities",
  "asset_cost",
  "asset_criticality",
  "iso_clause_ref",
  "controls",
  "maintenance_schedule",
  "asset_condition",
  "acquired_date",
  "disposal_date",
] as const;

export const ASSET_TEMPLATE_NOTE =
  "Use asset_type_id or asset_type (name); asset_subtype_id or asset_subtype. Classification: PUBLIC | CONFIDENTIAL | HIGHLY_CONFIDENTIAL | INTERNAL_USE_ONLY. Risk/criticality: LOW | MEDIUM | HIGH | VERY_HIGH. Condition: NEW | GOOD | FAIR | POOR | OBSOLETE.";

export function assetTemplateExampleRow(): Record<string, string> {
  const row: Record<string, string> = {};
  for (const h of ASSET_IMPORT_HEADERS) {
    row[h] = "";
  }
  row.asset_id = "AST-EXAMPLE-001";
  row.asset_name = "Example laptop (delete row before real import)";
  row.asset_type_id = "1";
  row.owner = "IT Owner";
  row.custodian_email = "custodian@example.com";
  row.location = "HQ";
  row.asset_classification = "INTERNAL_USE_ONLY";
  row.asset_risk_level = "MEDIUM";
  row.asset_cost = "0";
  row.asset_criticality = "MEDIUM";
  row.iso_clause_ref = "A.8";
  row.asset_condition = "GOOD";
  row.acquired_date = "2026-01-01 00:00:00";
  return row;
}

export const RISK_REGISTER_HEADERS = [
  "document_name",
  "category",
  "level_1",
  "level_2",
  "risk_description",
  "inherent_likelihood",
  "inherent_impact",
  "residual_likelihood",
  "residual_impact",
] as const;

export const COMPLIANCE_REGISTER_HEADERS = [
  "document_name",
  "category",
  "level_1",
  "level_2",
  "category_in_scope",
  "level_1_in_scope",
  "level_2_in_scope",
  "control_guidance",
  "evidence_summary",
] as const;

export function riskTemplateExampleRow(): string[] {
  return [
    "Your certification document name",
    "Example category",
    "Example level 1",
    "",
    "Short free-text risk narrative (optional)",
    "POSSIBLE",
    "MODERATE",
    "UNLIKELY",
    "MINOR",
  ];
}

export function complianceTemplateExampleRow(): string[] {
  return [
    "Your certification document name",
    "Example category",
    "Example level 1",
    "Example level 2",
    "true",
    "true",
    "true",
    "Control text for level 2 (single line or short)",
    "Evidence title one | Evidence title two",
  ];
}
