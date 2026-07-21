import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Availability-check endpoint for the phone receptionist.
// Deliberately coarse: says WHAT is available WHERE — never SKU lists,
// quantities, or prices. Friends & Family (virtual shop) is never exposed.
export async function GET(req: NextRequest) {
  const requiredKey = process.env.RECEPTIONIST_API_KEY;
  if (requiredKey && req.headers.get("x-api-key") !== requiredKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sku  = searchParams.get("sku")?.trim()  || null;
  const shop = searchParams.get("shop")?.trim() || null;
  const type = searchParams.get("type")?.trim() || null;

  // A filter is mandatory — the full catalog is never enumerable.
  if (!sku && !shop && !type) {
    return NextResponse.json(
      { error: "Provide at least one of: sku, type, shop" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  let query = admin
    .from("pieces")
    .select("type, shops!current_shop_id(name)")
    .eq("status", "in_stock")
    .gt("quantity", 0);

  if (sku)  query = query.ilike("sku", `%${sku}%`);
  if (type) query = query.ilike("type", `%${type}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Collapse to unique (type, shop) pairs — no per-piece detail leaves this API.
  const seen = new Set<string>();
  const matches: { type: string; shop: string }[] = [];
  for (const p of data ?? []) {
    const shopName = (p.shops as unknown as { name: string } | null)?.name;
    if (!shopName) continue;
    if (shopName.toLowerCase() === "friends & family") continue;
    if (shop && !shopName.toLowerCase().includes(shop.toLowerCase())) continue;
    const key = `${p.type}|${shopName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({ type: p.type, shop: shopName });
  }
  matches.sort((a, b) => a.type.localeCompare(b.type) || a.shop.localeCompare(b.shop));

  return NextResponse.json({ available: matches.length > 0, matches });
}
