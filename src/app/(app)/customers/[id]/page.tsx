import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { money, shortDate } from "@/lib/format";
import { CustomerEditor } from "./editor";
import { WishlistSection } from "./wishlist";

export const dynamic = "force-dynamic";

interface SaleRow {
  id: string;
  sale_date: string;
  net_price: number | string;
  discount_pct: number;
  pieces: { sku: string; type: string } | null;
  shops: { name: string } | null;
}

interface WishRow {
  id: string;
  description: string;
  status: string;
  requested_at: string;
  fulfilled_at: string | null;
  notes: string | null;
}

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  const [customerRes, salesRes, wishlistRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, phone, email, address, notes, marketing_consent, consent_at, created_at")
      .eq("id", params.id)
      .single(),
    supabase
      .from("sales")
      .select(`
        id, sale_date, net_price, discount_pct,
        pieces!piece_id (sku, type),
        shops!shop_id (name)
      `)
      .eq("customer_id", params.id)
      .order("sale_date", { ascending: false }),
    supabase
      .from("wishlist")
      .select("id, description, status, requested_at, fulfilled_at, notes")
      .eq("customer_id", params.id)
      .order("requested_at", { ascending: false }),
  ]);

  const customer = customerRes.data;
  if (!customer) notFound();

  const sales = (salesRes.data ?? []) as unknown as SaleRow[];
  const wishlist = (wishlistRes.data ?? []) as unknown as WishRow[];

  const totalSpent = sales.reduce((s, x) => s + Number(x.net_price ?? 0), 0);
  const isRepeat = sales.length > 1;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/customers" className="text-xs text-neutral-500 hover:underline">← Customers</Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.full_name}</h1>
            {isRepeat && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Repeat ×{sales.length}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">since {shortDate(customer.created_at)}</p>
        </div>
      </header>

      <CustomerEditor initial={customer} canEdit={profile.role !== "staff" || true} />

      <section>
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          Purchase history {sales.length > 0 && <span className="text-neutral-400">— total {money(totalSpent)}</span>}
        </h2>
        {sales.length === 0 ? (
          <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
            No purchases yet.
          </p>
        ) : (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900">
                <tr>
                  <th className="text-left  px-3 py-2">Date</th>
                  <th className="text-left  px-3 py-2">Piece</th>
                  <th className="text-left  px-3 py-2">Shop</th>
                  <th className="text-right px-3 py-2">Discount</th>
                  <th className="text-right px-3 py-2">Paid</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-3 py-2">{shortDate(s.sale_date)}</td>
                    <td className="px-3 py-2">
                      <div>{s.pieces?.type}</div>
                      <div className="text-xs font-mono text-neutral-500">{s.pieces?.sku}</div>
                    </td>
                    <td className="px-3 py-2">{s.shops?.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.discount_pct ? `${s.discount_pct}%` : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(s.net_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <WishlistSection customerId={customer.id} items={wishlist} />
    </div>
  );
}
