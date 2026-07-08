import Link from "next/link";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

interface SaleRow {
  id: string;
  piece_id: string;
  net_price: number | string;
  gross_price: number | string;
  discount_pct: number | string;
  staff_commission_amount: number | string;
  sale_date: string;
  staff_id: string;
  shop_id: string;
  profiles: { full_name: string } | null;
  shops: { name: string } | null;
  pieces: { sku: string; type: string } | null;
}

function isMisc(sku: string | null | undefined) {
  if (!sku || !sku.trim()) return true;
  return sku.trim().toLowerCase() === "misc" || sku.trim().toLowerCase().startsWith("misc");
}

const RANGES = ["today", "7d", "month", "lastmonth", "3m", "ytd"] as const;
type Range = (typeof RANGES)[number];
const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  "7d": "Last 7 days",
  month: "This month",
  lastmonth: "Last month",
  "3m": "Last 3 months",
  ytd: "Year to date",
};

export default async function Dashboard({ searchParams }: { searchParams: { shop?: string; misc?: string; range?: string; from?: string; to?: string } }) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const isOwner = profile.role === "owner";
  const canSeeCommission = isOwner || profile.role === "manager";
  const shopFilter   = searchParams.shop ?? null;
  const includeMisc  = searchParams.misc === "1";
  const isJupiterAll = shopFilter === "jupiter_all";

  const now = new Date();
  const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const customFrom = isDate(searchParams.from) ? searchParams.from! : null;
  const customTo   = isDate(searchParams.to)   ? searchParams.to!   : null;
  const range: Range = RANGES.includes(searchParams.range as Range) ? (searchParams.range as Range) : "month";

  // Resolve the sales window. Custom from/to beats presets; default "This month".
  let periodStart: string;
  let periodEnd: string | null = null; // exclusive
  let rangeLabel: string;
  if (customFrom || customTo) {
    periodStart = customFrom
      ? new Date(customFrom + "T00:00:00").toISOString()
      : new Date(now.getFullYear(), 0, 1).toISOString();
    if (customTo) {
      const end = new Date(customTo + "T00:00:00");
      end.setDate(end.getDate() + 1);
      periodEnd = end.toISOString();
    }
    rangeLabel = `${customFrom ?? "…"} → ${customTo ?? "today"}`;
  } else {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    periodStart = {
      today:     todayStart.toISOString(),
      "7d":      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString(),
      month:     new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      lastmonth: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      "3m":      new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString(),
      ytd:       new Date(now.getFullYear(), 0, 1).toISOString(),
    }[range];
    if (range === "lastmonth") periodEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    rangeLabel = RANGE_LABELS[range];
  }

  // Links that swap one filter while keeping the rest
  const buildQs = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = {
      range: customFrom || customTo ? null : (range === "month" ? null : range),
      from: customFrom, to: customTo,
      shop: shopFilter, misc: includeMisc ? "1" : null,
      ...patch,
    };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/dashboard${qs ? `?${qs}` : ""}`;
  };

  // Shops must resolve first so jupiterIds is available for piece/sales filters
  const { data: shopsData } = await supabase.from("shops").select("id, name").eq("active", true).order("name");
  const shops = (shopsData ?? []) as { id: string; name: string }[];
  const jupiterIds = shops.filter((s) => s.name.toLowerCase().startsWith("jupiter")).map((s) => s.id);

  const [piecesRes, salesRes, pendingMovesRes, pendingDiscountsRes] = await Promise.all([
    (() => {
      let q = supabase.from("pieces").select("id, sku, sale_price, quantity, status");
      if (isJupiterAll && jupiterIds.length) q = q.or(jupiterIds.map((id) => `current_shop_id.eq.${id}`).join(","));
      else if (shopFilter) q = q.eq("current_shop_id", shopFilter);
      if (!includeMisc) q = q.not("sku", "ilike", "misc%").not("sku", "is", null);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("sales")
        .select("id, piece_id, net_price, gross_price, discount_pct, staff_commission_amount, sale_date, staff_id, shop_id, profiles!staff_id(full_name), shops!shop_id(name), pieces!piece_id(sku, type)")
        .gte("sale_date", periodStart)
        .order("sale_date", { ascending: false });
      if (periodEnd) q = q.lt("sale_date", periodEnd);
      if (isJupiterAll && jupiterIds.length) q = q.or(jupiterIds.map((id) => `shop_id.eq.${id}`).join(","));
      else if (shopFilter) q = q.eq("shop_id", shopFilter);
      return q;
    })(),
    isOwner ? supabase.from("movements").select("id").eq("approval_status", "pending") : Promise.resolve({ data: [] }),
    isOwner ? supabase.from("discount_requests").select("id").eq("status", "pending") : Promise.resolve({ data: [] }),
  ]);

  const pieces = piecesRes.data ?? [];
  if (salesRes.error) console.error("sales query error", salesRes.error);
  const allSales = (salesRes.data ?? []) as unknown as SaleRow[];
  const sales = includeMisc
    ? allSales
    : allSales.filter((s) => !isMisc((s.pieces as { sku?: string } | null)?.sku));
  const pendingMoves = (pendingMovesRes.data ?? []) as { id: string }[];
  const pendingDiscounts = (pendingDiscountsRes.data ?? []) as { id: string }[];
  const activeShop = isJupiterAll ? { id: "jupiter_all", name: "Jupiter (all)" }
    : shops.find((s) => s.id === shopFilter) ?? null;

  const inStock  = pieces.filter((p) => p.status === "in_stock") .reduce((sum, p) => sum + (p.quantity ?? 1), 0);
  const reserved = pieces.filter((p) => p.status === "reserved") .reduce((sum, p) => sum + (p.quantity ?? 1), 0);
  const inventoryRetail = pieces
    .filter((p) => p.status === "in_stock" || p.status === "reserved")
    .reduce((sum, p) => sum + Number(p.sale_price ?? 0) * (p.quantity ?? 1), 0);

  // The sales query is already bounded to the selected timeframe,
  // so every section below (tiles, monthly, staff, recent) reflects it.
  const periodRevenue = sales.reduce((s, x) => s + Number(x.net_price ?? 0), 0);
  const periodCommissions = sales.reduce((s, x) => s + Number(x.staff_commission_amount ?? 0), 0);
  const periodAvg = sales.length ? periodRevenue / sales.length : 0;

  // Monthly breakdown
  const monthly = new Map<string, { revenue: number; count: number }>();
  for (const s of sales) {
    const d = new Date(s.sale_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = monthly.get(key) ?? { revenue: 0, count: 0 };
    row.revenue += Number(s.net_price ?? 0);
    row.count += 1;
    monthly.set(key, row);
  }
  const monthlyRows = Array.from(monthly.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([k, v]) => ({
      month: monthLabel(k),
      revenue: v.revenue,
      count: v.count,
      avg: v.count ? v.revenue / v.count : 0,
    }));

  // By staff
  const byStaff = new Map<string, { name: string; revenue: number; commissions: number; count: number }>();
  for (const s of sales) {
    const name = s.profiles?.full_name ?? "—";
    const row = byStaff.get(s.staff_id) ?? { name, revenue: 0, commissions: 0, count: 0 };
    row.revenue += Number(s.net_price ?? 0);
    row.commissions += Number(s.staff_commission_amount ?? 0);
    row.count += 1;
    byStaff.set(s.staff_id, row);
  }
  const staffRows = Array.from(byStaff.values()).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="text-sm text-neutral-500">
          {profile.full_name} · {profile.role} · {rangeLabel}{activeShop ? ` · ${activeShop.name}` : ""}
        </p>
      </header>

      {/* Shop switcher + misc toggle */}
      {shops.length > 1 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <Link
            href={buildQs({ shop: null })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !shopFilter
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            All shops
          </Link>
          {/* Jupiter (all) — shown only when there are 2+ Jupiter shops */}
          {jupiterIds.length > 1 && (
            <Link
              href={buildQs({ shop: "jupiter_all" })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isJupiterAll
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              Jupiter (all)
            </Link>
          )}
          {shops.map((s) => (
            <Link
              key={s.id}
              href={buildQs({ shop: s.id })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                shopFilter === s.id
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {s.name}
            </Link>
          ))}

          <span className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

          <Link
            href={buildQs({ misc: includeMisc ? null : "1" })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              includeMisc
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {includeMisc ? "Misc included" : "+ Include misc"}
          </Link>
        </div>
      )}

      {/* Timeframe — drives every section below */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={buildQs({ range: r === "month" ? null : r, from: null, to: null })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !customFrom && !customTo && range === r
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {RANGE_LABELS[r]}
          </Link>
        ))}

        <span className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

        {/* Custom range — plain GET form */}
        <form method="get" action="/dashboard" className="flex flex-wrap gap-1.5 items-center">
          {shopFilter && <input type="hidden" name="shop" value={shopFilter} />}
          {includeMisc && <input type="hidden" name="misc" value="1" />}
          <input
            type="date" name="from" defaultValue={customFrom ?? ""}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          />
          <span className="text-sm text-neutral-400">→</span>
          <input
            type="date" name="to" defaultValue={customTo ?? ""}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          />
          <button type="submit" className="px-3 py-1.5 rounded-full text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700">
            Apply
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="In stock"           value={inStock} />
        <Stat label="Reserved"           value={reserved} />
        <Stat label="Inventory (retail)" value={money(inventoryRetail)} />
      </section>

      {isOwner && (pendingMoves.length > 0 || pendingDiscounts.length > 0) && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <strong>{pendingMoves.length + pendingDiscounts.length}</strong> pending approval
            {pendingMoves.length + pendingDiscounts.length === 1 ? "" : "s"}
            {pendingMoves.length > 0 && ` · ${pendingMoves.length} movement${pendingMoves.length === 1 ? "" : "s"}`}
            {pendingDiscounts.length > 0 && ` · ${pendingDiscounts.length} discount${pendingDiscounts.length === 1 ? "" : "s"}`}
          </div>
          <Link href="/movements" className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline">
            Review →
          </Link>
        </section>
      )}

      {canSeeCommission && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Stat
            label="Revenue"
            value={money(periodRevenue)}
            sub={`${sales.length} sale${sales.length === 1 ? "" : "s"}`}
          />
          <Stat label="Commissions" value={money(periodCommissions)} />
          <Stat label="Avg ticket" value={money(periodAvg)} />
        </section>
      )}

      {sales.length > 0 && (
        <>
          <section>
            <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Monthly breakdown</h2>
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    <th className="text-left  px-3 py-2">Month</th>
                    <th className="text-right px-3 py-2">Revenue</th>
                    <th className="text-right px-3 py-2"># Sales</th>
                    <th className="text-right px-3 py-2">Avg ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((r) => (
                    <tr key={r.month} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="px-3 py-2">{r.month}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.revenue)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {isOwner && staffRows.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Sales by staff</h2>
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="text-left  px-3 py-2">Staff</th>
                      <th className="text-right px-3 py-2">Revenue</th>
                      <th className="text-right px-3 py-2"># Sales</th>
                      <th className="text-right px-3 py-2">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffRows.map((r) => (
                      <tr key={r.name} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(r.revenue)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(r.commissions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Recent sales — owner and manager */}
          {(isOwner || profile.role === "manager") && (
            <section>
              <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Recent sales</h2>
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="text-left  px-3 py-2">Date</th>
                      <th className="text-left  px-3 py-2">Piece</th>
                      <th className="text-left  px-3 py-2">Sold by</th>
                      <th className="text-left  px-3 py-2">Shop</th>
                      <th className="text-right px-3 py-2">Tag price</th>
                      <th className="text-right px-3 py-2">Discount</th>
                      <th className="text-right px-3 py-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 50).map((s) => {
                      const disc = Number(s.discount_pct ?? 0);
                      return (
                        <tr key={s.id} className="border-t border-neutral-200 dark:border-neutral-800">
                          <td className="px-3 py-2 text-xs text-neutral-500 whitespace-nowrap">
                            {new Date(s.sale_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/pieces/${s.piece_id}`} className="hover:underline">
                              <span className="font-mono text-xs">{s.pieces?.sku ?? "—"}</span>
                              {s.pieces?.type && <span className="text-neutral-500 text-xs ml-1">· {s.pieces.type}</span>}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-xs">{s.profiles?.full_name ?? "—"}</td>
                          <td className="px-3 py-2 text-xs text-neutral-500">{s.shops?.name ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-xs">{money(s.gross_price)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-xs">
                            {disc > 0
                              ? <span className="text-amber-600 font-medium">{disc}%</span>
                              : <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{money(s.net_price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {sales.length === 0 && (
        <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
          No sales in this period ({rangeLabel.toLowerCase()}). Try a wider timeframe, or record a sale from a piece&apos;s detail page.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(month) - 1]} ${year}`;
}
