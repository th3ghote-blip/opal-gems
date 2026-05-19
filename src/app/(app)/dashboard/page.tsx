import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  // Counts visible to this user (RLS-filtered).
  const [piecesRes, salesRes, pendingMovesRes] = await Promise.all([
    supabase.from("pieces").select("id, sale_price, status"),
    supabase.from("sales").select("net_price, sale_date"),
    supabase.from("movements").select("id").eq("approval_status", "pending"),
  ]);

  const pieces = piecesRes.data ?? [];
  const sales = salesRes.data ?? [];
  const pendingMoves = pendingMovesRes.data ?? [];

  const inStock = pieces.filter((p) => p.status === "in_stock").length;
  const reserved = pieces.filter((p) => p.status === "reserved").length;
  const inventoryRetail = pieces
    .filter((p) => p.status === "in_stock" || p.status === "reserved")
    .reduce((sum, p) => sum + Number(p.sale_price ?? 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSales = sales.filter((s) => new Date(s.sale_date) >= monthStart);
  const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.net_price ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="text-sm text-neutral-500">
          {profile.full_name} · {profile.role}
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="In stock"            value={inStock} />
        <Stat label="Reserved"            value={reserved} />
        <Stat label="Inventory (retail)"  value={money(inventoryRetail)} />
        <Stat label="This month revenue"  value={money(monthRevenue)} sub={`${monthSales.length} sales`} />
      </section>

      {profile.role === "owner" && pendingMoves.length > 0 && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4">
          <p className="text-sm">
            <strong>{pendingMoves.length}</strong> stock movement{pendingMoves.length === 1 ? "" : "s"} pending your approval.
          </p>
        </section>
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
