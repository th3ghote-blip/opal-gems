import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Availability check for the AI phone receptionist.
// Deliberately returns ONLY yes/no per location — never counts, SKUs, or prices.
// Auth: shared secret header, env VOICE_API_SECRET.
export async function POST(req: Request) {
  const secret = process.env.VOICE_API_SECRET;
  if (!secret || req.headers.get("x-voice-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { type?: string; stone?: string; shop?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const type = (body.type ?? "").trim();
  const stone = (body.stone ?? "").trim();
  const shopQuery = (body.shop ?? "").trim();
  if (!type) {
    return NextResponse.json({ result: "Ask what kind of piece they are looking for." });
  }

  const db = createAdminClient();

  const { data: shops } = await db
    .from("shops")
    .select("id, name, hotel_name")
    .eq("active", true);
  if (!shops?.length) {
    return NextResponse.json({ result: "Availability can't be checked right now. Offer a callback." });
  }

  // In-stock pieces matching type (+stone), grouped by shop — booleans only.
  let query = db
    .from("pieces")
    .select("current_shop_id")
    .eq("status", "in_stock")
    .gt("quantity", 0)
    .ilike("type", `%${type}%`);
  if (stone) query = query.ilike("main_stone", `%${stone}%`);
  let { data: pieces, error } = await query.limit(1000);
  if (error) {
    return NextResponse.json({ result: "Availability can't be checked right now. Offer a callback." });
  }

  // Stone data is sparse in inventory — if a stone filter finds nothing but the
  // piece type IS stocked, fall back to type-level availability with a caveat.
  let stoneUnconfirmed = false;
  if (stone && (pieces ?? []).length === 0) {
    const fallback = await db
      .from("pieces")
      .select("current_shop_id")
      .eq("status", "in_stock")
      .gt("quantity", 0)
      .ilike("type", `%${type}%`)
      .limit(1000);
    if (!fallback.error && (fallback.data ?? []).length > 0) {
      pieces = fallback.data;
      stoneUnconfirmed = true;
    }
  }

  const shopIdsWithStock = new Set((pieces ?? []).map((p) => p.current_shop_id));
  const available = shops.filter((s) => shopIdsWithStock.has(s.id)).map((s) => s.name);

  const wanted = shopQuery
    ? shops.find(
        (s) =>
          s.name.toLowerCase().includes(shopQuery.toLowerCase()) ||
          (s.hotel_name ?? "").toLowerCase().includes(shopQuery.toLowerCase())
      )
    : null;

  const piece = stone && !stoneUnconfirmed ? `${stone} ${type}` : type;
  const caveat = stoneUnconfirmed
    ? ` Note: you can't confirm the exact stone from here — say the boutique will confirm ${stone} options when they visit or call back.`
    : "";
  let result: string;
  if (wanted) {
    if (shopIdsWithStock.has(wanted.id)) {
      result = `Yes — ${piece} available at ${wanted.name}.${caveat}`;
    } else if (available.length) {
      result = `Not at ${wanted.name} right now, but available at: ${available.join(", ")}. Offer those locations.${caveat}`;
    } else {
      result = `No ${piece} available at any location right now. Offer to arrange a callback when new pieces arrive.`;
    }
  } else if (available.length) {
    result = `${piece} available at: ${available.join(", ")}. Ask which location suits them.${caveat}`;
  } else {
    result = `No ${piece} available at any location right now. Offer to arrange a callback.`;
  }

  return NextResponse.json({ result });
}
