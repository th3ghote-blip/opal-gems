import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseInventoryCsv, googleSheetsCsvUrl, type ParsedRow } from "@/lib/import-csv";

const body = z.object({
  source: z.enum(["url", "csv"]),
  url: z.string().optional(),
  csv: z.string().optional(),
  // shop_id: '' or 'auto' means use LOCATION column per row; uuid means force all rows to that shop.
  shop_id: z.string(),
  dry_run: z.boolean().default(true),
});

interface PreviewRow extends ParsedRow {
  is_duplicate: boolean;
  resolved_shop_id: string | null;
  resolved_shop_name: string | null;
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  const data = parsed.data;

  let csv = data.csv ?? "";
  if (data.source === "url") {
    const url = googleSheetsCsvUrl(data.url ?? "");
    if (!url) return NextResponse.json({ error: "Could not extract a Google Sheets ID from that URL" }, { status: 400 });
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return NextResponse.json({ error: `Failed to fetch sheet: HTTP ${res.status} (is it shared as Anyone-with-link?)` }, { status: 400 });
    csv = await res.text();
  }
  if (!csv.trim()) return NextResponse.json({ error: "No data to import" }, { status: 400 });

  const rows = parseInventoryCsv(csv);
  if (rows.length === 0) return NextResponse.json({ error: "Could not parse any rows" }, { status: 400 });

  const admin = createAdminClient();

  // Existing SKUs check (for de-dup on re-import)
  const skus = rows.filter((r) => r.sku).map((r) => r.sku);
  const { data: existing } = await admin.from("pieces").select("sku").in("sku", skus);
  const existingSkus = new Set((existing ?? []).map((p) => p.sku));

  // Shops: for "auto" mode, match LOCATION text → shop by case-insensitive substring on name/hotel_name
  const { data: shops } = await admin.from("shops").select("id, name, hotel_name").eq("active", true);
  const shopList = shops ?? [];
  function matchShop(location: string | null | undefined): { id: string; name: string } | null {
    if (!location) return null;
    const up = location.toUpperCase();
    const m = shopList.find(
      (s) => s.name.toUpperCase().includes(up) || up.includes(s.name.toUpperCase()) ||
             (s.hotel_name && (s.hotel_name.toUpperCase().includes(up) || up.includes(s.hotel_name.toUpperCase())))
    );
    return m ? { id: m.id, name: m.name } : null;
  }

  const useAuto = data.shop_id === "" || data.shop_id === "auto";
  const forcedShop = !useAuto ? shopList.find((s) => s.id === data.shop_id) ?? null : null;

  // Also detect SKUs that appear more than once within this same upload.
  const skuCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.sku) skuCounts.set(r.sku, (skuCounts.get(r.sku) ?? 0) + 1);
  }
  const seenInBatch = new Set<string>();

  const preview: PreviewRow[] = rows.map((r) => {
    const is_duplicate = existingSkus.has(r.sku);
    const issues = [...r.issues];
    let status = r.status;
    let resolved_shop_id: string | null = null;
    let resolved_shop_name: string | null = null;
    if (useAuto) {
      const m = matchShop(r.location);
      if (m) { resolved_shop_id = m.id; resolved_shop_name = m.name; }
      else if (status === "ok") { status = "error"; issues.push(`unknown location "${r.location ?? ""}"`); }
    } else if (forcedShop) {
      resolved_shop_id = forcedShop.id;
      resolved_shop_name = forcedShop.name;
    } else if (status === "ok") {
      status = "error";
      issues.push("invalid shop selection");
    }
    if (is_duplicate && status === "ok") { status = "skip"; issues.push("SKU already exists"); }
    if (status === "ok" && seenInBatch.has(r.sku)) {
      status = "skip";
      issues.push("duplicate SKU within this sheet");
    } else if (status === "ok") {
      seenInBatch.add(r.sku);
    }
    return { ...r, is_duplicate, status, issues, resolved_shop_id, resolved_shop_name };
  });

  const summary = {
    total: preview.length,
    valid: preview.filter((r) => r.status === "ok").length,
    skipped: preview.filter((r) => r.status === "skip").length,
    errors: preview.filter((r) => r.status === "error").length,
  };

  if (data.dry_run) {
    return NextResponse.json({ preview, summary });
  }

  const toInsert = preview
    .filter((r) => r.status === "ok" && r.resolved_shop_id)
    .map((r) => ({
      sku: r.sku,
      description: r.description,
      type: r.type,
      ctw: r.ctw,
      metal: r.metal ?? null,
      karat: r.karat ?? null,
      main_stone: r.main_stone ?? null,
      color_grade: r.color_grade ?? null,
      clarity: r.clarity ?? null,
      original_price: r.price ?? 0,
      sale_price: r.price ?? 0,
      current_shop_id: r.resolved_shop_id,
      status: (r.status_override ?? "in_stock") as "in_stock" | "sold",
      created_by: profile.id,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ preview, summary, inserted: 0, message: "Nothing to insert." });
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error, count } = await admin.from("pieces").insert(chunk, { count: "exact" });
    if (error) return NextResponse.json({ error: `Insert failed at chunk ${i}: ${error.message}`, inserted }, { status: 500 });
    inserted += count ?? chunk.length;
  }
  return NextResponse.json({ preview, summary, inserted });
}
