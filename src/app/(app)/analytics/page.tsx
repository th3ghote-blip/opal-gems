import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function Bar({ value, max, color = "bg-gold-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
      <div style={{ width: `${pct}%` }} className={`h-full ${color} rounded-full`} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Pill({ label, color }: { label: string; color: "green" | "amber" | "red" | "neutral" }) {
  const cls = {
    green:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber:   "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    red:     "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  }[color];
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const profile = (await getCurrentProfile())!;
  if (profile.role === "staff") redirect("/dashboard");

  const supabase = createClient();
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  const [salesRes, piecesRes, shopsRes, profilesRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, net_price, gross_price, discount_pct, staff_commission_amount, sale_date, staff_id, shop_id, pieces!piece_id(sku, type, description)")
      .gte("sale_date", yearStart)
      .order("sale_date", { ascending: false }),
    supabase
      .from("pieces")
      .select("id, sku, type, current_shop_id, sale_price, quantity, status"),
    supabase.from("shops").select("id, name").eq("active", true).order("name"),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  const sales   = (salesRes.data ?? []) as unknown as {
    id: string; net_price: number | string; gross_price: number | string;
    discount_pct: number | string; staff_commission_amount: number | string;
    sale_date: string; staff_id: string; shop_id: string;
    pieces: { sku: string; type: string; description: string | null } | null;
  }[];
  const allPieces  = piecesRes.data  ?? [];
  const shops      = shopsRes.data   ?? [];
  const profiles   = profilesRes.data ?? [];

  const shopName = (id: string | null) => shops.find((s) => s.id === id)?.name ?? "—";
  const staffName = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";

  // ── 1. Revenue by shop ─────────────────────────────────────────────────────
  const revenueByShop = new Map<string, { name: string; revenue: number; count: number; discount: number }>();
  for (const s of sales) {
    const key = s.shop_id;
    const row = revenueByShop.get(key) ?? { name: shopName(key), revenue: 0, count: 0, discount: 0 };
    row.revenue  += Number(s.net_price ?? 0);
    row.count    += 1;
    row.discount += Number(s.discount_pct ?? 0);
    revenueByShop.set(key, row);
  }
  const shopRows = Array.from(revenueByShop.values())
    .map((r) => ({ ...r, avgTicket: r.count ? r.revenue / r.count : 0, avgDiscount: r.count ? r.discount / r.count : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxShopRevenue = Math.max(...shopRows.map((r) => r.revenue), 1);

  // ── 2. Sales by item type ──────────────────────────────────────────────────
  const byType = new Map<string, { revenue: number; count: number }>();
  for (const s of sales) {
    const type = s.pieces?.type ?? "Unknown";
    const row = byType.get(type) ?? { revenue: 0, count: 0 };
    row.revenue += Number(s.net_price ?? 0);
    row.count   += 1;
    byType.set(type, row);
  }
  const typeRows = Array.from(byType.entries())
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxTypeRevenue = Math.max(...typeRows.map((r) => r.revenue), 1);

  // ── 3. Top pieces sold ─────────────────────────────────────────────────────
  const byPiece = new Map<string, { sku: string; desc: string; revenue: number; count: number; shop: string }>();
  for (const s of sales) {
    const sku = s.pieces?.sku ?? "—";
    const key = sku + "|" + s.shop_id;
    const row = byPiece.get(key) ?? { sku, desc: s.pieces?.description ?? "", revenue: 0, count: 0, shop: shopName(s.shop_id) };
    row.revenue += Number(s.net_price ?? 0);
    row.count   += 1;
    byPiece.set(key, row);
  }
  const topPieces = Array.from(byPiece.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // ── 4. Staff performance ───────────────────────────────────────────────────
  const byStaff = new Map<string, { name: string; revenue: number; count: number; commission: number; discount: number }>();
  for (const s of sales) {
    const row = byStaff.get(s.staff_id) ?? { name: staffName(s.staff_id), revenue: 0, count: 0, commission: 0, discount: 0 };
    row.revenue    += Number(s.net_price ?? 0);
    row.count      += 1;
    row.commission += Number(s.staff_commission_amount ?? 0);
    row.discount   += Number(s.discount_pct ?? 0);
    byStaff.set(s.staff_id, row);
  }
  const staffRows = Array.from(byStaff.values())
    .map((r) => ({ ...r, avgTicket: r.count ? r.revenue / r.count : 0, avgDiscount: r.count ? r.discount / r.count : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── 5. Inventory health — stock by type per shop ───────────────────────────
  const inStock = allPieces.filter((p) => p.status === "in_stock" || p.status === "reserved");
  // unique types that have sold this year
  const soldTypes = new Set<string>(sales.map((s) => s.pieces?.type).filter((t): t is string => !!t));
  // stock matrix: shopId → type → qty
  const stockMatrix = new Map<string, Map<string, number>>();
  for (const p of inStock) {
    const shopId = p.current_shop_id ?? "unassigned";
    if (!stockMatrix.has(shopId)) stockMatrix.set(shopId, new Map());
    const typeMap = stockMatrix.get(shopId)!;
    typeMap.set(p.type, (typeMap.get(p.type) ?? 0) + (p.quantity ?? 1));
  }
  // shortage: shops with 0 of a sold type
  const shortages: { shop: string; type: string; inStock: number }[] = [];
  for (const type of Array.from(soldTypes)) {
    for (const shop of shops) {
      const qty = stockMatrix.get(shop.id)?.get(type as string) ?? 0;
      if (qty < 2) shortages.push({ shop: shop.name, type: type as string, inStock: qty });
    }
  }
  shortages.sort((a, b) => a.inStock - b.inStock);

  // ── 6. Inventory value by shop ─────────────────────────────────────────────
  const invByShop = new Map<string, { name: string; value: number; units: number }>();
  for (const p of inStock) {
    const shopId = p.current_shop_id ?? "unassigned";
    const row = invByShop.get(shopId) ?? { name: shopName(shopId), value: 0, units: 0 };
    row.value += Number(p.sale_price ?? 0) * (p.quantity ?? 1);
    row.units += (p.quantity ?? 1);
    invByShop.set(shopId, row);
  }
  const invRows = Array.from(invByShop.values()).sort((a, b) => b.value - a.value);
  const maxInvValue = Math.max(...invRows.map((r) => r.value), 1);

  // ── 7. Discount analysis ───────────────────────────────────────────────────
  const discountedSales = sales.filter((s) => Number(s.discount_pct) > 0);
  const totalDiscountedRevenue = discountedSales.reduce((s, x) => s + (Number(x.gross_price) - Number(x.net_price)), 0);
  const avgOverallDiscount = sales.length ? sales.reduce((s, x) => s + Number(x.discount_pct), 0) / sales.length : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-neutral-500">Year-to-date · {now.getFullYear()}</p>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "YTD revenue",       value: money(sales.reduce((s, x) => s + Number(x.net_price), 0)) },
          { label: "Sales",             value: sales.length.toString() },
          { label: "Avg ticket",        value: money(sales.length ? sales.reduce((s, x) => s + Number(x.net_price), 0) / sales.length : 0) },
          { label: "Revenue discounted",value: money(totalDiscountedRevenue), sub: `avg ${avgOverallDiscount.toFixed(1)}% off` },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="text-xs text-neutral-500">{k.label}</div>
            <div className="text-lg font-semibold tabular-nums">{k.value}</div>
            {k.sub && <div className="text-xs text-neutral-400">{k.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Revenue by shop */}
        <Card title="Revenue by shop">
          {shopRows.length === 0 ? <p className="text-sm text-neutral-500">No sales yet.</p> : (
            <div className="space-y-3">
              {shopRows.map((r) => (
                <div key={r.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="tabular-nums">{money(r.revenue)}</span>
                  </div>
                  <Bar value={r.revenue} max={maxShopRevenue} />
                  <div className="flex gap-3 text-xs text-neutral-500">
                    <span>{r.count} sale{r.count !== 1 ? "s" : ""}</span>
                    <span>avg {money(r.avgTicket)}</span>
                    <span>avg {r.avgDiscount.toFixed(1)}% off</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Inventory value by shop */}
        <Card title="Inventory value (retail) by shop">
          {invRows.length === 0 ? <p className="text-sm text-neutral-500">No inventory.</p> : (
            <div className="space-y-3">
              {invRows.map((r) => (
                <div key={r.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="tabular-nums">{money(r.value)}</span>
                  </div>
                  <Bar value={r.value} max={maxInvValue} color="bg-blue-400" />
                  <div className="text-xs text-neutral-500">{r.units} unit{r.units !== 1 ? "s" : ""} in stock</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Sales by item type */}
        <Card title="Sales by item type">
          {typeRows.length === 0 ? <p className="text-sm text-neutral-500">No sales yet.</p> : (
            <div className="space-y-3">
              {typeRows.map((r) => (
                <div key={r.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.type}</span>
                    <span className="tabular-nums">{money(r.revenue)}</span>
                  </div>
                  <Bar value={r.revenue} max={maxTypeRevenue} color="bg-plum-500" />
                  <div className="text-xs text-neutral-500">{r.count} sold</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Staff performance */}
        <Card title="Staff performance">
          {staffRows.length === 0 ? <p className="text-sm text-neutral-500">No sales yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <th className="text-left py-1 pr-3">Staff</th>
                    <th className="text-right py-1 pr-3">Revenue</th>
                    <th className="text-right py-1 pr-3">Sales</th>
                    <th className="text-right py-1 pr-3">Avg ticket</th>
                    <th className="text-right py-1">Avg disc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {staffRows.map((r) => (
                    <tr key={r.name}>
                      <td className="py-1.5 pr-3 font-medium">{r.name}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{money(r.revenue)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{r.count}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{money(r.avgTicket)}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {r.avgDiscount > 0
                          ? <span className="text-amber-600">{r.avgDiscount.toFixed(1)}%</span>
                          : <span className="text-neutral-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Inventory shortages */}
      <Card title="⚠ Stock alerts — low inventory on sold types">
        {shortages.length === 0 ? (
          <p className="text-sm text-emerald-600">All shops are well stocked on every type that&apos;s been selling.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-neutral-500">
                <tr>
                  <th className="text-left py-1 pr-4">Shop</th>
                  <th className="text-left py-1 pr-4">Type</th>
                  <th className="text-left py-1">In stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {shortages.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-4">{r.shop}</td>
                    <td className="py-1.5 pr-4">{r.type}</td>
                    <td className="py-1.5">
                      {r.inStock === 0
                        ? <Pill label="Out of stock" color="red" />
                        : <Pill label={`${r.inStock} left`} color="amber" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Top pieces */}
      <Card title="Top selling pieces (YTD)">
        {topPieces.length === 0 ? <p className="text-sm text-neutral-500">No sales yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-neutral-500">
                <tr>
                  <th className="text-left py-1 pr-3">SKU</th>
                  <th className="text-left py-1 pr-3">Description</th>
                  <th className="text-left py-1 pr-3">Shop</th>
                  <th className="text-right py-1 pr-3">Revenue</th>
                  <th className="text-right py-1">Qty sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {topPieces.map((r) => (
                  <tr key={r.sku + r.shop}>
                    <td className="py-1.5 pr-3 font-mono text-xs">{r.sku}</td>
                    <td className="py-1.5 pr-3 text-xs text-neutral-600 dark:text-neutral-400 max-w-xs truncate">{r.desc || "—"}</td>
                    <td className="py-1.5 pr-3 text-xs">{r.shop}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{money(r.revenue)}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inventory by type per shop matrix */}
      <Card title="Inventory matrix — units in stock by type × shop">
        {(() => {
          const types = Array.from(new Set(inStock.map((p) => p.type))).sort();
          if (types.length === 0) return <p className="text-sm text-neutral-500">No inventory.</p>;
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    <th className="text-left px-2 py-2 sticky left-0 bg-neutral-50 dark:bg-neutral-900">Type</th>
                    {shops.map((s) => <th key={s.id} className="text-right px-2 py-2 whitespace-nowrap">{s.name}</th>)}
                    <th className="text-right px-2 py-2 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {types.map((type) => {
                    const total = shops.reduce((s, sh) => s + (stockMatrix.get(sh.id)?.get(type) ?? 0), 0);
                    return (
                      <tr key={type}>
                        <td className="px-2 py-1.5 font-medium sticky left-0 bg-white dark:bg-neutral-950">{type}</td>
                        {shops.map((sh) => {
                          const qty = stockMatrix.get(sh.id)?.get(type) ?? 0;
                          const sold = soldTypes.has(type);
                          return (
                            <td key={sh.id} className="px-2 py-1.5 text-right tabular-nums">
                              {qty === 0 && sold
                                ? <span className="text-red-500 font-medium">0 ⚠</span>
                                : qty === 0
                                  ? <span className="text-neutral-300 dark:text-neutral-700">—</span>
                                  : qty <= 1 && sold
                                    ? <span className="text-amber-600 font-medium">{qty}</span>
                                    : qty}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
