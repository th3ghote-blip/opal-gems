import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signApprovalToken } from "@/lib/approval-tokens";
import { notifyOwner } from "@/lib/notifications";

const body = z.object({
  piece_id: z.string().uuid(),
  customer_id: z.string().uuid().nullable().optional(),
  staff_id: z.string().uuid(),
  discount_pct: z.number().min(0).max(100),
  qty_sold: z.number().int().min(1).default(1),
  payment_method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  }
  const data = parsed.data;
  const admin = createAdminClient();

  // Load piece + threshold + staff commission rate in parallel.
  const [pieceRes, settingsRes, staffRes] = await Promise.all([
    admin
      .from("pieces")
      .select("id, sku, type, sale_price, quantity, current_shop_id, status, shops!current_shop_id(name)")
      .eq("id", data.piece_id)
      .single(),
    admin
      .from("settings")
      .select("key, value")
      .in("key", ["max_no_approval_discount_pct", "staff_commission_pct"]),
    admin.from("profiles").select("commission_pct, full_name").eq("id", data.staff_id).single(),
  ]);

  if (!pieceRes.data) return NextResponse.json({ error: "Piece not found" }, { status: 404 });
  if (pieceRes.data.status === "sold") return NextResponse.json({ error: "Piece already sold" }, { status: 409 });
  if (pieceRes.data.status === "written_off") return NextResponse.json({ error: "Piece written off" }, { status: 409 });
  if (data.qty_sold > (pieceRes.data.quantity ?? 1)) {
    return NextResponse.json({ error: `Only ${pieceRes.data.quantity ?? 1} in stock` }, { status: 409 });
  }

  const settings = Object.fromEntries((settingsRes.data ?? []).map((s) => [s.key, s.value]));
  const threshold = Number(settings.max_no_approval_discount_pct ?? 10);
  const defaultCommPct = Number(settings.staff_commission_pct ?? 2);

  const piece = pieceRes.data;
  const grossPrice = Number(piece.sale_price ?? 0);
  const commissionPct = Number(staffRes.data?.commission_pct ?? defaultCommPct);
  const staffName = staffRes.data?.full_name ?? "staff";

  // Above-threshold discount: queue an approval request, don't complete the sale yet.
  if (data.discount_pct > threshold && profile.role !== "owner") {
    const { data: dr, error: drErr } = await admin
      .from("discount_requests")
      .insert({
        piece_id: data.piece_id,
        customer_id: data.customer_id ?? null,
        staff_id: data.staff_id,
        shop_id: piece.current_shop_id,
        requested_pct: data.discount_pct,
        reason: data.reason ?? null,
      })
      .select("id")
      .single();
    if (drErr) return NextResponse.json({ error: drErr.message }, { status: 500 });

    const token = signApprovalToken("discount", dr.id);
    await admin.from("discount_requests").update({ approval_token: token }).eq("id", dr.id);

    // Stash sale draft as JSON on the discount_request so we can complete it on approve.
    await admin
      .from("discount_requests")
      .update({
        reason: JSON.stringify({
          reason: data.reason ?? null,
          payment_method: data.payment_method ?? null,
          notes: data.notes ?? null,
        }),
      })
      .eq("id", dr.id);

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await notifyOwner("discount_request", {
      staff: staffName,
      piece: piece.type,
      sku: piece.sku,
      requestedPct: data.discount_pct,
      approveUrl: `${base}/approve/${token}?d=approved`,
      denyUrl: `${base}/approve/${token}?d=denied`,
    });

    return NextResponse.json({ kind: "discount_request", id: dr.id });
  }

  // Complete sale immediately.
  const netPrice = +(grossPrice * (1 - data.discount_pct / 100)).toFixed(2);
  const commissionAmount = +(netPrice * (commissionPct / 100)).toFixed(2);
  const qtySold = data.qty_sold ?? 1;

  const saleRow = {
    piece_id: data.piece_id,
    customer_id: data.customer_id ?? null,
    staff_id: data.staff_id,
    shop_id: piece.current_shop_id,
    gross_price: grossPrice,
    discount_pct: data.discount_pct,
    net_price: netPrice,
    staff_commission_pct: commissionPct,
    staff_commission_amount: commissionAmount,
    payment_method: data.payment_method ?? null,
    notes: data.notes ?? null,
  };

  // Insert one sale record per unit sold
  const { data: insertedSales, error: saleErr } = await admin
    .from("sales")
    .insert(Array.from({ length: qtySold }, () => ({ ...saleRow })))
    .select("id");
  if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 500 });
  const sale = insertedSales?.[0];

  // Decrement quantity. Flip to 'sold' only when stock hits 0.
  const newQty = Math.max(0, (piece.quantity ?? 1) - qtySold);
  await admin.from("pieces").update({
    quantity: newQty,
    ...(newQty === 0 ? { status: "sold" } : {}),
  }).eq("id", data.piece_id);

  // Fire owner FYI notification.
  const shop = (piece.shops as unknown as { name: string } | null) ?? null;
  const { data: customer } = data.customer_id
    ? await admin.from("customers").select("full_name").eq("id", data.customer_id).single()
    : { data: null };

  try {
    await notifyOwner("sale_alert", {
      staff: staffName,
      piece: piece.type,
      sku: piece.sku,
      shop: shop?.name ?? "—",
      netPrice: netPrice.toLocaleString("en-US"),
      customer: customer?.full_name,
    });
  } catch (e) {
    console.error("sale alert notify failed", e);
  }

  return NextResponse.json({ kind: "sale", id: sale.id });
}
