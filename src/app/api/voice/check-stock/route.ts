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

  let body: { type?: string; stone?: string; shop?: string; keywords?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const type = (body.type ?? "").trim();
  const stone = (body.stone ?? "").trim();
  const shopQuery = (body.shop ?? "").trim();
  // Specific-piece search: match each keyword against the item description,
  // e.g. "oval cross pendant" — lets callers ask for pieces they saw online.
  const keywords = (body.keywords ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5);
  if (!type && !keywords.length) {
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

  // In-stock pieces matching keywords/type (+stone), grouped by shop — booleans only.
  // Keywords take priority: a "pendant" the caller describes may be typed as
  // "Necklace" in inventory — don't let the type filter starve a keyword hit.
  let query = db
    .from("pieces")
    .select("current_shop_id")
    .eq("status", "in_stock")
    .gt("quantity", 0);
  if (keywords.length) {
    for (const w of keywords) query = query.ilike("description", `%${w}%`);
  } else if (type) {
    query = query.ilike("type", `%${type}%`);
  }
  if (stone) query = query.ilike("main_stone", `%${stone}%`);
  const first = await query.limit(1000);
  if (first.error) {
    return NextResponse.json({ result: "Availability can't be checked right now. Offer a callback." });
  }
  let pieces = first.data;

  // Data is sparse (no stone values; descriptions vary) — degrade gracefully:
  // exact-piece/stone miss falls back to broader matches with a caveat.
  let stoneUnconfirmed = false;
  let keywordsMissed = false;
  if ((pieces ?? []).length === 0 && (stone || keywords.length) && type) {
    const fallback = await db
      .from("pieces")
      .select("current_shop_id")
      .eq("status", "in_stock")
      .gt("quantity", 0)
      .ilike("type", `%${type}%`)
      .limit(1000);
    if (!fallback.error && (fallback.data ?? []).length > 0) {
      pieces = fallback.data;
      if (stone) stoneUnconfirmed = true;
      if (keywords.length) keywordsMissed = true;
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

  const described = keywords.length && !keywordsMissed ? `that piece (${keywords.join(" ")})` : "";
  const piece =
    described || (stone && !stoneUnconfirmed ? `${stone} ${type}` : type || keywords.join(" "));
  let caveat = "";
  if (stoneUnconfirmed)
    caveat += ` Note: you can't confirm the exact stone from here — say the boutique will confirm ${stone} options when they visit or call back.`;
  if (keywordsMissed)
    caveat += ` Note: the exact piece they described didn't match by name, so this is availability for ${type}s in general — the boutique can confirm the specific piece.`;
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
