import Link from "next/link";
import { cookies } from "next/headers";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { PieceCard } from "@/components/PieceCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PiecesFilters } from "./filters";
import { money } from "@/lib/format";
import type { PieceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  shop?: string;
  type?: string;
  status?: string;
  sort?: string;
  view?: string;
  metal?: string;
  karat?: string;
  price_min?: string;
  price_max?: string;
  ctw_min?: string;
  ctw_max?: string;
}

// Build a URL that preserves all current filters but swaps the sort key.
// Clicking an already-active asc column → desc; desc → asc; inactive → asc.
function sortHref(sp: SearchParams, ascKey: string, descKey: string): string {
  const cur = sp.sort ?? "newest";
  const next = cur === ascKey ? descKey : ascKey;
  const p = new URLSearchParams();
  if (sp.q)         p.set("q",         sp.q);
  if (sp.shop)      p.set("shop",      sp.shop);
  if (sp.type)      p.set("type",      sp.type);
  if (sp.status)    p.set("status",    sp.status);
  if (sp.view)      p.set("view",      sp.view);
  if (sp.metal)     p.set("metal",     sp.metal);
  if (sp.karat)     p.set("karat",     sp.karat);
  if (sp.price_min) p.set("price_min", sp.price_min);
  if (sp.price_max) p.set("price_max", sp.price_max);
  if (sp.ctw_min)   p.set("ctw_min",   sp.ctw_min);
  if (sp.ctw_max)   p.set("ctw_max",   sp.ctw_max);
  p.set("sort", next);
  return `/pieces?${p.toString()}`;
}

function SortArrow({ sp, ascKey, descKey }: { sp: SearchParams; ascKey: string; descKey: string }) {
  const cur = sp.sort ?? "newest";
  if (cur === ascKey)  return <span className="ml-0.5 text-gold-600 dark:text-gold-400">↑</span>;
  if (cur === descKey) return <span className="ml-0.5 text-gold-600 dark:text-gold-400">↓</span>;
  return <span className="ml-0.5 opacity-25 group-hover:opacity-60">⇅</span>;
}

export default async function PiecesPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  // Build sort
  const sortMap: Record<string, { col: string; asc: boolean }> = {
    newest:      { col: "created_at",  asc: false },
    oldest:      { col: "created_at",  asc: true  },
    sku_asc:     { col: "sku",         asc: true  },
    sku_desc:    { col: "sku",         asc: false },
    desc_asc:    { col: "description", asc: true  },
    desc_desc:   { col: "description", asc: false },
    type_asc:    { col: "type",        asc: true  },
    type_desc:   { col: "type",        asc: false },
    metal_asc:   { col: "metal",       asc: true  },
    metal_desc:  { col: "metal",       asc: false },
    ctw_asc:     { col: "ctw",         asc: true  },
    ctw_desc:    { col: "ctw",         asc: false },
    price_asc:   { col: "sale_price",  asc: true  },
    price_desc:  { col: "sale_price",  asc: false },
    status_asc:  { col: "status",      asc: true  },
    status_desc: { col: "status",      asc: false },
    // legacy alias
    status:      { col: "status",      asc: true  },
  };
  const { col, asc } = sortMap[searchParams.sort ?? ""] ?? sortMap.newest;

  // Fetch shops first — needed to resolve jupiter_all filter before building pieces query
  const { data: shopsData } = await supabase.from("shops").select("id, name").eq("active", true).order("name");
  const shops = shopsData ?? [];

  // Build query — RLS handles shop scoping; UI filters are just helpers.
  let query = supabase
    .from("pieces")
    .select("id, sku, description, type, metal, karat, main_stone, ctw, sale_price, quantity, status, current_shop_id, shops!current_shop_id(name)")
    .order(col, { ascending: asc })
    .limit(250);

  if (searchParams.q) {
    query = query.or(`sku.ilike.%${searchParams.q}%,description.ilike.%${searchParams.q}%`);
  }
  if (searchParams.shop === "jupiter_all") {
    const jupiterIds = shops.filter((s) => s.name.toLowerCase().startsWith("jupiter")).map((s) => s.id);
    if (jupiterIds.length) query = query.or(jupiterIds.map((id) => `current_shop_id.eq.${id}`).join(","));
  } else if (searchParams.shop) {
    query = query.eq("current_shop_id", searchParams.shop);
  }
  if (searchParams.type)      query = query.eq("type", searchParams.type);
  // Default to in_stock; "all" param clears the filter
  const statusFilter = searchParams.status === "all" ? null : (searchParams.status ?? "in_stock");
  if (statusFilter)           query = query.eq("status", statusFilter);
  if (searchParams.metal)     query = query.eq("metal", searchParams.metal);
  if (searchParams.karat)     query = query.eq("karat", searchParams.karat);
  if (searchParams.price_min) query = query.gte("sale_price", parseFloat(searchParams.price_min));
  if (searchParams.price_max) query = query.lte("sale_price", parseFloat(searchParams.price_max));
  if (searchParams.ctw_min)   query = query.gte("ctw", parseFloat(searchParams.ctw_min));
  if (searchParams.ctw_max)   query = query.lte("ctw", parseFloat(searchParams.ctw_max));

  // Run pieces + type-enum queries in parallel (shops already fetched above)
  const [piecesRes, typesRes] = await Promise.all([
    query,
    supabase
      .from("enum_values")
      .select("value")
      .eq("enum_name", "type")
      .eq("active", true)
      .order("sort_order"),
  ]);
  const { data: pieces, error } = piecesRes;
  const { data: types } = typesRes;

  // Photos depend on piece ids, so this one runs after.
  const ids = (pieces ?? []).map((p) => p.id);
  const { data: photos } = ids.length
    ? await supabase
        .from("piece_photos")
        .select("piece_id, storage_path")
        .in("piece_id", ids)
        .order("sort_order")
    : { data: [] };
  const thumbByPiece: Record<string, string> = {};
  for (const ph of photos ?? []) {
    if (thumbByPiece[ph.piece_id]) continue;
    const { data } = supabase.storage.from("piece-photos").getPublicUrl(ph.storage_path);
    thumbByPiece[ph.piece_id] = data.publicUrl;
  }

  // Resolve view: URL param wins, then cookie, then default to grid
  const viewCookie = cookies().get("pieces_view")?.value;
  const effectiveView = searchParams.view ?? viewCookie ?? "grid";
  const isList = effectiveView === "list";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pieces</h1>
        <div className="flex gap-2">
          {profile.role === "owner" && (
            <Link
              href="/pieces/import"
              className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700"
            >
              Import
            </Link>
          )}
          {profile.role !== "staff" && (
            <Link
              href="/pieces/new"
              className="text-sm px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950"
            >
              + New piece
            </Link>
          )}
        </div>
      </header>

      <PiecesFilters shops={shops ?? []} types={types ?? []} view={effectiveView} />

      {(() => {
        const records = pieces?.length ?? 0;
        const totalUnits = (pieces ?? []).reduce((sum, p) => sum + ((p as { quantity?: number }).quantity ?? 1), 0);
        return (
          <p className="text-sm text-neutral-500">
            {totalUnits} {totalUnits === 1 ? "unit" : "units"}
            {totalUnits !== records && (
              <span className="ml-1 text-neutral-400">({records} unique {records === 1 ? "piece" : "pieces"})</span>
            )}
          </p>
        );
      })()}

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {(!pieces || pieces.length === 0) && (
        <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center text-sm text-neutral-500">
          No pieces match these filters.
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────── */}
      {isList && pieces && pieces.length > 0 && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900 sticky top-0 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="text-left px-3 py-2">
                  <Link href={sortHref(searchParams, "sku_asc", "sku_desc")} className="group inline-flex items-center font-medium hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap">
                    SKU <SortArrow sp={searchParams} ascKey="sku_asc" descKey="sku_desc" />
                  </Link>
                </th>
                <th className="text-left px-3 py-2">
                  <Link href={sortHref(searchParams, "desc_asc", "desc_desc")} className="group inline-flex items-center font-medium hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap">
                    Name / Description <SortArrow sp={searchParams} ascKey="desc_asc" descKey="desc_desc" />
                  </Link>
                </th>
                <th className="text-left px-3 py-2">
                  <Link href={sortHref(searchParams, "type_asc", "type_desc")} className="group inline-flex items-center font-medium hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap">
                    Type <SortArrow sp={searchParams} ascKey="type_asc" descKey="type_desc" />
                  </Link>
                </th>
                <th className="text-left px-3 py-2">
                  <Link href={sortHref(searchParams, "metal_asc", "metal_desc")} className="group inline-flex items-center font-medium hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap">
                    Metal <SortArrow sp={searchParams} ascKey="metal_asc" descKey="metal_desc" />
                  </Link>
                </th>
                <th className="text-right px-3 py-2">
                  <Link href={sortHref(searchParams, "ctw_asc", "ctw_desc")} className="group inline-flex items-center justify-end font-medium hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap">
                    CTW <SortArrow sp={searchParams} ascKey="ctw_asc" descKey="ctw_desc" />
                  </Link>
                </th>
                <th className="text-right px-3 py-2">
                  <Link href={sortHref(searchParams, "price_asc", "price_desc")} className="group inline-flex items-center justify-end font-medium hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap">
                    Price <SortArrow sp={searchParams} ascKey="price_asc" descKey="price_desc" />
                  </Link>
                </th>
                <th className="text-right px-3 py-2 font-medium">Qty</th>
                <th className="text-left px-3 py-2 font-medium">Shop</th>
                <th className="text-left px-3 py-2">
                  <Link href={sortHref(searchParams, "status_asc", "status_desc")} className="group inline-flex items-center font-medium hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap">
                    Status <SortArrow sp={searchParams} ascKey="status_asc" descKey="status_desc" />
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {pieces.map((p) => {
                const shopName = (p.shops as unknown as { name: string } | null)?.name ?? null;
                const metalLabel = [p.karat, p.metal].filter(Boolean).join(" ") || (p.main_stone ?? null);
                return (
                  <Link key={p.id} href={`/pieces/${p.id}`} legacyBehavior>
                    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer">
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{p.sku}</td>
                      <td className="px-3 py-2 max-w-[220px] truncate text-neutral-700 dark:text-neutral-300">
                        {p.description || "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.type || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-neutral-500">{metalLabel || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">{p.ctw ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{money(p.sale_price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {(p as unknown as { quantity: number }).quantity ?? 1}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-500 whitespace-nowrap">{shopName ?? "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={p.status as PieceStatus} />
                      </td>
                    </tr>
                  </Link>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── GRID VIEW ─────────────────────────────────────── */}
      {!isList && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(pieces ?? []).map((p) => (
            <PieceCard
              key={p.id}
              piece={{
                id: p.id,
                sku: p.sku,
                type: p.type,
                main_stone: p.main_stone,
                ctw: p.ctw,
                sale_price: p.sale_price,
                status: p.status,
                thumb_url: thumbByPiece[p.id] ?? null,
                shop_name: (p.shops as unknown as { name: string } | null)?.name ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
