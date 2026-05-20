import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseInventoryCsv, googleSheetsCsvUrl, type ParsedRow } from "@/lib/import-csv";

const body = z.object({
  source: z.enum(["url", "csv"]),
  url: z.string().optional(),
  csv: z.string().optional(),
  shop_id: z.string().uuid(),
  dry_run: z.boolean().default(true),
});

interface PreviewRow extends ParsedRow {
  is_duplicate: boolean;
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  const data = parsed.data;

  // Get the CSV text from URL or paste
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

  // Check for existing SKUs (duplicates)
  const skus = rows.filter((r) => r.sku).map((r) => r.sku);
  const { data: existing } = await admin.from("pieces").select("sku").in("sku", skus);
  const existingSkus = new Set((existing ?? []).map((p) => p.sku));

  const preview: PreviewRow[] = rows.map((r) => {
    const is_duplicate = existingSkus.has(r.sku);
    let status = r.status;
    const issues = [...r.issues];
    if (is_duplicate && status === "ok") {
      status = "skip";
      issues.push("SKU already exists");
    }
    return { ...r, is_duplicate, status, issues };
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

  // Commit: insert all "ok" rows.
  const toInsert = preview.filter((r) => r.status === "ok").map((r) => ({
    sku: r.sku,
    description: r.description,
    type: r.type,
    ctw: r.ctw,
    original_price: r.price ?? 0,
    sale_price: r.price ?? 0,
    current_shop_id: data.shop_id,
    status: "in_stock" as const,
    created_by: profile.id,
  }));

  if (toInsert.length === 0) {
    return NextResponse.json({ preview, summary, inserted: 0, message: "Nothing to insert." });
  }

  // Insert in chunks of 50 for safety.
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error, count } = await admin.from("pieces").insert(chunk, { count: "exact" });
    if (error) return NextResponse.json({ error: `Insert failed at chunk ${i}: ${error.message}`, inserted }, { status: 500 });
    inserted += count ?? chunk.length;
  }
  return NextResponse.json({ preview, summary, inserted });
}
