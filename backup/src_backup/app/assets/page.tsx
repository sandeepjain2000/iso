"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type {
  AssetRow,
  FormTab,
  SubtypeRow,
  TypeRow,
} from "@/components/assets/asset-types";
import { CsvImportToolbar } from "@/components/CsvImportToolbar";
import { TruncatedText } from "@/components/TruncatedText";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsv } from "@/lib/download-csv";
import {
  ASSET_IMPORT_HEADERS,
  ASSET_TEMPLATE_NOTE,
  assetTemplateExampleRow,
} from "@/lib/import-csv-specs";
import { cn } from "@/lib/utils";

const CLASSIFICATION = [
  "PUBLIC",
  "CONFIDENTIAL",
  "HIGHLY_CONFIDENTIAL",
  "INTERNAL_USE_ONLY",
] as const;
const RISK_LEVEL = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH"] as const;
const CONDITION = ["NEW", "GOOD", "FAIR", "POOR", "OBSOLETE"] as const;

function selectStr(v: string | null): string {
  return v ?? "";
}

function emptyForm(types: TypeRow[]): Partial<AssetRow> {
  const t = types[0]?.id ?? 1;
  const ts = new Date().toISOString();
  return {
    asset_id: `AST-${Date.now()}`,
    sku_number: null,
    asset_name: "",
    asset_type_id: t,
    asset_subtype_id: null,
    asset_description: null,
    owner: "",
    createdBy: 1,
    updatedBy: 1,
    custodianEmail: null,
    location: "",
    asset_classification: "INTERNAL_USE_ONLY",
    asset_risk_level: "MEDIUM",
    asset_associated_risks: null,
    vulnerabilities: null,
    asset_cost: 0,
    asset_criticality: "MEDIUM",
    iso_clause_ref: "",
    controls: null,
    maintenance_schedule: null,
    asset_condition: "GOOD",
    acquired_date: `${ts.slice(0, 10)} 00:00:00`,
    disposal_date: null,
  };
}

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    LOW: "bg-emerald-50 text-emerald-800 border-emerald-200",
    MEDIUM: "bg-amber-50 text-amber-900 border-amber-200",
    HIGH: "bg-orange-50 text-orange-900 border-orange-200",
    VERY_HIGH: "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        styles[level] ?? "border-neutral-200 bg-neutral-100 text-neutral-700",
      )}
    >
      {level.replaceAll("_", " ")}
    </span>
  );
}

function Req() {
  return <span className="text-red-600"> *</span>;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subtypes, setSubtypes] = useState<SubtypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "view" | "edit" | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [formTab, setFormTab] = useState<FormTab>("basic");
  const [form, setForm] = useState<Partial<AssetRow>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assets");
      const data = (await res.json()) as {
        assets?: AssetRow[];
        types?: TypeRow[];
        subtypes?: SubtypeRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAssets(data.assets ?? []);
      setTypes(data.types ?? []);
      setSubtypes(data.subtypes ?? []);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not load assets. Check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const subtypesForType = (typeId: number) =>
    subtypes.filter((s) => s.asset_type_id === typeId);

  const typeLabel = (id: number) =>
    types.find((t) => t.id === id)?.asset_type ?? String(id);
  const subtypeLabel = (tid: number, sid: number | null) => {
    if (sid == null) return "—";
    const s = subtypes.find((x) => x.id === sid && x.asset_type_id === tid);
    return s?.name ?? String(sid);
  };

  const closeSheet = () => {
    setSheetMode(null);
    setForm({});
    setFormTab("basic");
  };

  const startCreate = () => {
    if (!types.length) return;
    setSheetMode("create");
    setFormTab("basic");
    setForm(emptyForm(types));
  };

  const openView = (row: AssetRow) => {
    setForm({ ...row });
    setFormTab("basic");
    setSheetMode("view");
  };

  const openEdit = (row: AssetRow) => {
    setForm({ ...row });
    setFormTab("basic");
    setSheetMode("edit");
  };

  const saveNewAsset = async () => {
    if (sheetMode !== "create" || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          asset_name: (form.asset_name ?? "").trim() || "New asset",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? `Create failed (${res.status})`);
        return;
      }
      toast.success("Asset saved");
      closeSheet();
      await load();
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (sheetMode !== "edit" || saving || form.id == null) return;
    setSaving(true);
    try {
      const id = form.id;
      const body = {
        asset_id: form.asset_id ?? "",
        asset_name: form.asset_name ?? "",
        owner: form.owner ?? "",
        location: form.location ?? "",
        asset_description: form.asset_description ?? null,
        asset_classification: form.asset_classification ?? "",
        asset_risk_level: form.asset_risk_level ?? "",
        asset_criticality: form.asset_criticality ?? "",
        iso_clause_ref: form.iso_clause_ref ?? "",
        controls: form.controls ?? null,
        custodianEmail: form.custodianEmail ?? null,
        sku_number: form.sku_number ?? null,
        asset_condition: form.asset_condition ?? "",
        asset_associated_risks: form.asset_associated_risks ?? null,
        vulnerabilities: form.vulnerabilities ?? null,
        maintenance_schedule: form.maintenance_schedule ?? null,
        acquired_date: form.acquired_date ?? "",
        disposal_date: form.disposal_date ?? null,
        asset_cost: form.asset_cost ?? 0,
        asset_type_id: form.asset_type_id,
        asset_subtype_id: form.asset_subtype_id ?? null,
      };
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? `Save failed (${res.status})`);
        return;
      }
      toast.success("Asset updated");
      closeSheet();
      await load();
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async (row: AssetRow) => {
    if (
      !window.confirm(
        `Delete asset “${row.asset_name}” (${row.asset_id})? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/assets/${row.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Delete failed");
        return;
      }
      toast.success("Asset deleted");
      if (form.id === row.id) closeSheet();
      await load();
    } catch {
      toast.error("Network error during delete");
    }
  };

  const exportReport = useCallback(() => {
    const headers = [
      "id",
      "asset_id",
      "sku_number",
      "asset_name",
      "asset_type_id",
      "asset_subtype_id",
      "asset_description",
      "owner",
      "createdBy",
      "updatedBy",
      "custodianEmail",
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
      "created_at",
      "updated_at",
    ];
    const rows = assets.map((a) =>
      headers.map((h) => a[h as keyof AssetRow] as string | number | null),
    );
    downloadCsv(
      `assets-register_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    );
    toast.success("Report downloaded");
  }, [assets]);

  useEffect(() => {
    const fn = () => {
      if (!assets.length) {
        toast.message("No rows to export yet.");
        return;
      }
      exportReport();
    };
    window.addEventListener("cc-assets-download-report", fn);
    return () => window.removeEventListener("cc-assets-download-report", fn);
  }, [assets.length, exportReport]);

  const assetTemplateRows = (() => {
    const ex = assetTemplateExampleRow();
    return [ASSET_IMPORT_HEADERS.map((h) => ex[h] ?? "")];
  })();

  const formTabs: { id: FormTab; label: string }[] = [
    { id: "basic", label: "Basic Info" },
    { id: "classification", label: "Classification" },
    { id: "risk", label: "Risk & Status" },
    { id: "additional", label: "Additional" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section
        className="rounded-2xl border border-neutral-200/80 bg-white px-5 py-4 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)]"
        aria-labelledby="assets-config-heading"
      >
        <h2
          id="assets-config-heading"
          className="text-sm font-semibold tracking-tight text-neutral-950"
        >
          Assets Configuration
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Columns follow the{" "}
          <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-mono text-neutral-900 ring-1 ring-neutral-200/80">
            iso_asset
          </code>{" "}
          table. Category unchecked in scope cascades to level 1 &amp; 2 in
          Risk / Compliance screens.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)]">
        <h2 className="text-base font-semibold tracking-tight text-neutral-950">
          Asset register
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-neutral-300"
            onClick={() => setImportOpen(true)}
          >
            <Upload data-icon="inline-start" className="size-4" />
            Import CSV
          </Button>
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={loading || !types.length}
            onClick={startCreate}
          >
            <Plus data-icon="inline-start" className="size-4" />
            Add asset
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
            Loading assets…
          </div>
        ) : assets.length === 0 ? (
          <div className="py-14 text-center text-sm text-neutral-600">
            No assets yet. Use <strong>Add asset</strong> or{" "}
            <strong>Import CSV</strong>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  <th className="px-3 py-2.5">Asset ID</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">Subtype</th>
                  <th className="hidden px-3 py-2.5 md:table-cell">Location</th>
                  <th className="hidden px-3 py-2.5 xl:table-cell">Owner</th>
                  <th className="hidden px-3 py-2.5 lg:table-cell">Class.</th>
                  <th className="hidden px-3 py-2.5 xl:table-cell">Risk</th>
                  <th className="sticky right-0 z-20 w-[7.5rem] min-w-[7.5rem] border-l border-neutral-200 bg-neutral-50 px-2 py-2.5 text-right shadow-[-8px_0_14px_-6px_rgba(0,0,0,0.08)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, idx) => (
                  <tr
                    key={a.id}
                    className={cn(
                      "group border-b border-neutral-100",
                      idx % 2 === 0 ? "bg-white" : "bg-neutral-50/70",
                    )}
                  >
                    <td className="max-w-[10rem] px-3 py-2 font-mono text-xs text-neutral-900">
                      <TruncatedText text={a.asset_id} maxChars={22} />
                    </td>
                    <td className="max-w-[14rem] px-3 py-2 font-medium text-neutral-900">
                      <TruncatedText text={a.asset_name} maxChars={40} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-700">
                      {typeLabel(a.asset_type_id)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-neutral-600 lg:table-cell">
                      {subtypeLabel(a.asset_type_id, a.asset_subtype_id)}
                    </td>
                    <td className="hidden max-w-[10rem] px-3 py-2 text-neutral-600 md:table-cell">
                      <TruncatedText text={a.location} maxChars={24} />
                    </td>
                    <td className="hidden px-3 py-2 text-neutral-600 xl:table-cell">
                      <TruncatedText text={a.owner} maxChars={20} />
                    </td>
                    <td className="hidden px-3 py-2 lg:table-cell">
                      <span className="text-xs text-neutral-600">
                        {a.asset_classification.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 xl:table-cell">
                      <RiskBadge level={a.asset_risk_level} />
                    </td>
                    <td
                      className={cn(
                        "sticky right-0 z-10 w-[7.5rem] min-w-[7.5rem] border-l border-neutral-200 px-1 py-1.5 text-right shadow-[-8px_0_14px_-6px_rgba(0,0,0,0.06)]",
                        idx % 2 === 0 ? "bg-white" : "bg-neutral-50/70",
                      )}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 text-neutral-700 hover:text-neutral-950"
                          title="View"
                          onClick={() => openView(a)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 text-neutral-700 hover:text-neutral-950"
                          title="Edit"
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 text-red-700 hover:text-red-900"
                          title="Delete"
                          onClick={() => void deleteAsset(a)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {importOpen ? (
        <div
          className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto bg-black/35 p-4 pt-[8vh] backdrop-blur-[1px]"
          role="presentation"
          onClick={() => setImportOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-import-title"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3
                id="asset-import-title"
                className="text-base font-semibold text-neutral-950"
              >
                Import assets (CSV)
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-neutral-300"
                onClick={() => setImportOpen(false)}
              >
                Close
              </Button>
            </div>
            <CsvImportToolbar
              title="Import"
              templateFileName="asset_import_template.csv"
              templateHeaders={ASSET_IMPORT_HEADERS}
              templateRows={assetTemplateRows}
              importUrl="/api/assets/import"
              hint={ASSET_TEMPLATE_NOTE}
              onImportDone={() => {
                void load();
                setImportOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}

      {sheetMode ? (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/40 p-2 backdrop-blur-[1px] sm:p-4">
          <div className="mx-auto flex h-full max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
              <h2 className="text-base font-semibold text-neutral-950">
                {sheetMode === "create"
                  ? "Add asset"
                  : sheetMode === "view"
                    ? "View asset"
                    : "Edit asset"}
              </h2>
              <div className="flex shrink-0 items-center gap-2">
                {sheetMode !== "view" ? (
                  <button
                    type="button"
                    className="btn-save"
                    disabled={saving}
                    onClick={() =>
                      void (sheetMode === "create"
                        ? saveNewAsset()
                        : saveEdit())
                    }
                  >
                    {saving ? (
                      <>
                        <Loader2
                          className="size-4 shrink-0 animate-spin"
                          aria-hidden
                        />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="size-4 shrink-0" aria-hidden />
                        {sheetMode === "create"
                          ? "Save asset"
                          : "Save changes"}
                      </>
                    )}
                  </button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-neutral-300"
                  onClick={closeSheet}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
        <Card className="rounded-none border-0 shadow-none ring-0">
          <CardHeader className="space-y-4 border-b border-neutral-100 bg-white pb-4">
            <div className="inline-flex rounded-xl bg-neutral-100/90 p-1 ring-1 ring-neutral-200/60">
              {formTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFormTab(t.id)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition",
                    formTab === t.id
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <fieldset
              disabled={sheetMode === "view"}
              className="m-0 min-h-0 space-y-6 border-0 p-0 disabled:[&_button]:pointer-events-none"
            >
            {formTab === "basic" ? (
              <div className="space-y-2">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Basic Information
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Core asset identification and ownership details
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="asset_id" className="text-sm text-neutral-700">
                      Asset ID
                      <Req />
                    </Label>
                    <Input
                      id="asset_id"
                      className="font-mono text-sm"
                      value={form.asset_id ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, asset_id: e.target.value }))
                      }
                    />
                    <p className="text-xs text-neutral-500">
                      Unique identifier for the asset
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="asset_name"
                      className="text-sm text-neutral-700"
                    >
                      Asset Name
                      <Req />
                    </Label>
                    <Input
                      id="asset_name"
                      placeholder="New asset"
                      value={form.asset_name ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, asset_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="asset_type_id"
                      className="text-sm text-neutral-700"
                    >
                      Asset Type
                      <Req />
                    </Label>
                    <Select
                      value={String(form.asset_type_id ?? "")}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          asset_type_id: Number(selectStr(v)),
                          asset_subtype_id: null,
                        }))
                      }
                    >
                      <SelectTrigger id="asset_type_id" className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {types.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.asset_type}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sku_number" className="text-sm text-neutral-700">
                      SKU Number
                    </Label>
                    <Input
                      id="sku_number"
                      placeholder="SKU number"
                      value={form.sku_number ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          sku_number: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="owner" className="text-sm text-neutral-700">
                      Owner
                      <Req />
                    </Label>
                    <Input
                      id="owner"
                      placeholder="Asset owner name"
                      value={form.owner ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, owner: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="custodianEmail"
                      className="text-sm text-neutral-700"
                    >
                      Custodial Email
                    </Label>
                    <Input
                      id="custodianEmail"
                      type="email"
                      placeholder="email@example.com"
                      value={form.custodianEmail ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          custodianEmail: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="location" className="text-sm text-neutral-700">
                      Location
                      <Req />
                    </Label>
                    <Input
                      id="location"
                      placeholder="Physical location"
                      value={form.location ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, location: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label
                      htmlFor="asset_subtype_id"
                      className="text-sm text-neutral-700"
                    >
                      Subtype{" "}
                      <span className="font-normal text-neutral-500">(optional)</span>
                    </Label>
                    <Select
                      value={
                        form.asset_subtype_id != null
                          ? String(form.asset_subtype_id)
                          : ""
                      }
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          asset_subtype_id: selectStr(v)
                            ? Number(selectStr(v))
                            : null,
                        }))
                      }
                    >
                      <SelectTrigger id="asset_subtype_id" className="w-full">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="">—</SelectItem>
                          {subtypesForType(Number(form.asset_type_id ?? 0)).map(
                            (s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ),
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            {formTab === "classification" ? (
              <div className="space-y-2">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Asset Classification
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Security and compliance classification details
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="asset_classification"
                      className="text-sm text-neutral-700"
                    >
                      Asset Classification
                      <Req />
                    </Label>
                    <Select
                      value={form.asset_classification ?? ""}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          asset_classification: selectStr(v),
                        }))
                      }
                    >
                      <SelectTrigger
                        id="asset_classification"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CLASSIFICATION.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="asset_cost" className="text-sm text-neutral-700">
                      Asset Cost
                      <Req />
                    </Label>
                    <Input
                      id="asset_cost"
                      type="number"
                      value={form.asset_cost ?? 0}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          asset_cost: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label
                      htmlFor="asset_risk_level"
                      className="text-sm text-neutral-700"
                    >
                      Risk Level
                      <Req />
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <Select
                        value={form.asset_risk_level ?? ""}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            asset_risk_level: selectStr(v),
                          }))
                        }
                      >
                        <SelectTrigger
                          id="asset_risk_level"
                          className="w-full sm:max-w-md"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {RISK_LEVEL.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c.replaceAll("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {form.asset_risk_level ? (
                        <RiskBadge level={form.asset_risk_level} />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="asset_criticality"
                      className="text-sm text-neutral-700"
                    >
                      Criticality
                      <Req />
                    </Label>
                    <Select
                      value={form.asset_criticality ?? ""}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          asset_criticality: selectStr(v),
                        }))
                      }
                    >
                      <SelectTrigger id="asset_criticality" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {RISK_LEVEL.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            {formTab === "risk" ? (
              <div className="space-y-2">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Risk &amp; Status
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Asset condition and timeline information
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="asset_condition"
                      className="text-sm text-neutral-700"
                    >
                      Asset Condition
                      <Req />
                    </Label>
                    <Select
                      value={form.asset_condition ?? ""}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          asset_condition: selectStr(v),
                        }))
                      }
                    >
                      <SelectTrigger id="asset_condition" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CONDITION.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="acquired_date"
                      className="text-sm text-neutral-700"
                    >
                      Acquisition Date
                      <Req />
                    </Label>
                    <Input
                      id="acquired_date"
                      type="date"
                      value={form.acquired_date?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          acquired_date: e.target.value
                            ? `${e.target.value} 00:00:00`
                            : "",
                        }))
                      }
                    />
                    <p className="text-xs text-neutral-500">dd-mm-yyyy</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="disposal_date"
                      className="text-sm text-neutral-700"
                    >
                      Disposal Date
                    </Label>
                    <Input
                      id="disposal_date"
                      type="date"
                      value={form.disposal_date?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          disposal_date: e.target.value
                            ? `${e.target.value} 00:00:00`
                            : null,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label
                      htmlFor="maintenance_schedule"
                      className="text-sm text-neutral-700"
                    >
                      Maintenance Schedule
                    </Label>
                    <Input
                      id="maintenance_schedule"
                      placeholder="e.g., Monthly, Quarterly"
                      value={form.maintenance_schedule ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          maintenance_schedule: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {formTab === "additional" ? (
              <div className="space-y-2">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Additional Information
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Detailed documentation and risk assessment
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="asset_description"
                      className="text-sm text-neutral-700"
                    >
                      Asset Description
                    </Label>
                    <Textarea
                      id="asset_description"
                      rows={4}
                      placeholder="Provide a detailed description of the asset"
                      value={form.asset_description ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          asset_description: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="asset_associated_risks"
                      className="text-sm text-neutral-700"
                    >
                      Associated Risks
                    </Label>
                    <Textarea
                      id="asset_associated_risks"
                      rows={4}
                      placeholder="Document any risks associated with this asset"
                      value={form.asset_associated_risks ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          asset_associated_risks: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="vulnerabilities"
                      className="text-sm text-neutral-700"
                    >
                      Vulnerabilities
                    </Label>
                    <Textarea
                      id="vulnerabilities"
                      rows={4}
                      placeholder="List known vulnerabilities"
                      value={form.vulnerabilities ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          vulnerabilities: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="iso_clause_ref"
                      className="text-sm text-neutral-700"
                    >
                      ISO Clause Reference
                      <Req />
                    </Label>
                    <Input
                      id="iso_clause_ref"
                      placeholder="e.g., A.8.1.1"
                      value={form.iso_clause_ref ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          iso_clause_ref: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="controls" className="text-sm text-neutral-700">
                      Controls
                    </Label>
                    <Textarea
                      id="controls"
                      rows={4}
                      placeholder="Document applicable controls"
                      value={form.controls ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          controls: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}
            </fieldset>
          </CardContent>
          {sheetMode === "view" ? (
            <CardFooter className="flex justify-end border-t border-neutral-100 bg-neutral-50/50 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="border-neutral-300"
                onClick={closeSheet}
              >
                Done
              </Button>
            </CardFooter>
          ) : (
            <CardFooter className="flex justify-end border-t border-neutral-100 bg-neutral-50/50 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="border-neutral-300"
                disabled={saving}
                onClick={closeSheet}
              >
                Cancel
              </Button>
            </CardFooter>
          )}
        </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
