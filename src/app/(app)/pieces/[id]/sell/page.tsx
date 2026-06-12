import { notFound, redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { SellForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SellPage({ params }: { params: { id: string } }) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  const [pieceRes, settingsRes, staffRes, paymentMethodsRes, shopsRes] = await Promise.all([
    supabase
      .from("pieces")
      .select("id, sku, type, original_price, sale_price, quantity, status, current_shop_id, shops!current_shop_id(name)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("settings")
      .select("key, value")
      .in("key", ["max_no_approval_discount_pct", "staff_commission_pct"]),
    supabase
      .from("profiles")
      .select("id, full_name, role, default_shop_id, commission_pct, active")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("enum_values")
      .select("value")
      .eq("enum_name", "payment_method")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("shops").select("id, name").eq("active", true).order("name"),
  ]);

  const piece = pieceRes.data;
  if (!piece) notFound();
  if (piece.status === "sold") redirect(`/pieces/${piece.id}`);

  const settings = Object.fromEntries((settingsRes.data ?? []).map((s) => [s.key, s.value]));
  const maxNoApprovalDiscount = Number(settings.max_no_approval_discount_pct ?? 10);
  const defaultCommissionPct = Number(settings.staff_commission_pct ?? 2);

  const shop = (piece.shops as unknown as { name: string } | null) ?? null;

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Sell piece</h1>
        <p className="text-sm text-neutral-500 font-mono">
          {piece.sku} · {piece.type} {shop && `· ${shop.name}`}
        </p>
      </header>

      <SellForm
        piece={{
          id: piece.id,
          sku: piece.sku,
          type: piece.type,
          original_price: Number(piece.original_price ?? 0),
          sale_price: Number(piece.sale_price ?? 0),
          quantity: Number(piece.quantity ?? 1),
          current_shop_id: piece.current_shop_id,
        }}
        currentUser={profile}
        staff={staffRes.data ?? []}
        shops={shopsRes.data ?? []}
        paymentMethods={(paymentMethodsRes.data ?? []).map((p) => p.value)}
        maxNoApprovalDiscount={maxNoApprovalDiscount}
        defaultCommissionPct={defaultCommissionPct}
      />
    </div>
  );
}
