import Link from "next/link";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { PieceCard } from "@/components/PieceCard";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  shop?: string;
  type?: string;
  status?: string;
}

export default async function PiecesPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  // Build query — RLS handles shop scoping; UI filters are just helpers.
  let query = supabase
    .from("pieces")
    .select("id, sku, type, main_stone, ctw, sale_price, status, current_shop_id, shops!current_shop_id(name)")
    .order("created_at", { ascending: false })
    .limit(120);

  if (searchParams.q) query = query.ilike("sku", `%${searchParams.q}%`);
  if (searchParams.shop) query = query.eq("current_shop_id", searchParams.shop);
  if (searchParams.type) query = query.eq("type", searchParams.type);
  if (searchParams.status) query = query.eq("status", searchParams.status);

  // Run pieces / shops / type-enum queries in parallel.
  const [piecesRes, shopsRes, typesRes] = await Promise.all([
    query,
    supabase.from("shops").select("id, name").eq("active", true).order("name"),
    supabase
      .from("enum_values")
      .select("value")
      .eq("enum_name", "type")
      .eq("active", true)
      .order("sort_order"),
  ]);
  const { data: pieces, error } = piecesRes;
  const { data: shops } = shopsRes;
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

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pieces</h1>
        {profile.role !== "staff" && (
          <Link
            href="/pieces/new"
            className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
          >
            + New piece
          </Link>
        )}
      </header>

      <form className="flex flex-wrap gap-2 items-center" method="get">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search SKU"
          className="flex-1 min-w-[160px] rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          autoComplete="off"
        />
        <select
          name="shop"
          defaultValue={searchParams.shop ?? ""}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm"
        >
          <option value="">All shops</option>
          {(shops ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={searchParams.type ?? ""}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm"
        >
          <option value="">All types</option>
          {(types ?? []).map((t) => (
            <option key={t.value} value={t.value}>{t.value}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="in_stock">In stock</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
          <option value="in_transit">In transit</option>
          <option value="written_off">Written off</option>
        </select>
        <button type="submit" className="text-sm px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700">
          Filter
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {(!pieces || pieces.length === 0) && (
        <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center text-sm text-neutral-500">
          No pieces match these filters.
        </div>
      )}

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
    </div>
  );
}
