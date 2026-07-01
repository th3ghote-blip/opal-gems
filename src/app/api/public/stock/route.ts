import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sku  = searchParams.get("sku")?.trim()  ?? null;
  const shop = searchParams.get("shop")?.trim()  ?? null;
  const type = searchParams.get("type")?.trim()  ?? null;

  const admin = createAdminClient();

  let query = admin
    .from("pieces")
    .select("sku, type, quantity, status, shops!current_shop_id(name)")
    .eq("status", "in_stock")
    .gt("quantity", 0)
    .order("sku");

  if (sku)  query = query.ilike("sku", `%${sku}%`);
  if (type) query = query.ilike("type", `%${type}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let results = (data ?? []).map((p) => ({
    sku:      p.sku,
    type:     p.type,
    quantity: p.quantity,
    status:   p.status,
    shop:     (p.shops as unknown as { name: string } | null)?.name ?? null,
  }));

  if (shop) {
    const shopLower = shop.toLowerCase();
    results = results.filter((p) => p.shop?.toLowerCase().includes(shopLower));
  }

  return NextResponse.json({ count: results.length, results });
}
