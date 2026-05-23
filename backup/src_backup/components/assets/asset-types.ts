export type FormTab = "basic" | "classification" | "risk" | "additional";

export type AssetRow = {
  id: number;
  asset_id: string;
  sku_number: string | null;
  asset_name: string;
  asset_type_id: number;
  asset_subtype_id: number | null;
  asset_description: string | null;
  owner: string;
  createdBy: number;
  updatedBy: number;
  custodianEmail: string | null;
  location: string;
  asset_classification: string;
  asset_risk_level: string;
  asset_associated_risks: string | null;
  vulnerabilities: string | null;
  asset_cost: number;
  asset_criticality: string;
  iso_clause_ref: string;
  controls: string | null;
  maintenance_schedule: string | null;
  asset_condition: string;
  acquired_date: string;
  disposal_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TypeRow = { id: number; asset_type: string };
export type SubtypeRow = { id: number; name: string; asset_type_id: number };
