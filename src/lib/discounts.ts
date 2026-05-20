import { createAdminClient } from "@/lib/supabase/admin";

/** Apply approve/deny to a discount_request. On approve, completes the sale at
 * the requested discount; on deny, just marks denied. Idempotent. */
export async function applyDiscountDecision(
  requestId: string,
  decision: "approved" | "denied" | "cancelled",
  actorId: string,
  approvedPctOverride?: number
) {
  const admin = createAdminClient();
  const { data: dr } = await admin
    .from("discount_requests")
    .select("piece_id, customer_id, staff_id, shop_id, requested_pct, reason, status")
    .eq("id", requestId)
    .single();
  if (!dr) throw new Error("Discount request not found");
  if (dr.status !== "pending") return;

  // Parse the stashed sale-draft JSON the sale flow saved into `reason` (best-effort).
  let payment_method: string | null = null;
  let notes: string | null = null;
  let reasonOriginal: string | null = null;
  try {
    const parsed = dr.reason ? JSON.parse(dr.reason) : {};
    payment_method = parsed.payment_method ?? null;
    notes = parsed.notes ?? null;
    reasonOriginal = parsed.reason ?? null;
  } catch {
    reasonOriginal = dr.reason;
  }

  if (decision !== "approved") {
    await admin
      .from("discount_requests")
      .update({ status: decision, approved_by: actorId, approved_at: new Date().toISOString() })
      .eq("id", requestId);
    return;
  }

  // Approve: complete the sale at the approved discount.
  const [pieceRes, settingsRes, staffRes] = await Promise.all([
    admin.from("pieces").select("sale_price, status").eq("id", dr.piece_id).single(),
    admin.from("settings").select("value").eq("key", "staff_commission_pct").single(),
    admin.from("profiles").select("commission_pct").eq("id", dr.staff_id).single(),
  ]);
  if (!pieceRes.data) throw new Error("Piece not found");
  if (pieceRes.data.status === "sold") throw new Error("Piece already sold");

  const approvedPct = approvedPctOverride ?? dr.requested_pct;
  const grossPrice = Number(pieceRes.data.sale_price ?? 0);
  const netPrice = +(grossPrice * (1 - approvedPct / 100)).toFixed(2);
  const commissionPct = Number(staffRes.data?.commission_pct ?? settingsRes.data?.value ?? 2);
  const commissionAmount = +(netPrice * (commissionPct / 100)).toFixed(2);

  const { data: sale, error: saleErr } = await admin
    .from("sales")
    .insert({
      piece_id: dr.piece_id,
      customer_id: dr.customer_id,
      staff_id: dr.staff_id,
      shop_id: dr.shop_id,
      gross_price: grossPrice,
      discount_pct: approvedPct,
      net_price: netPrice,
      staff_commission_pct: commissionPct,
      staff_commission_amount: commissionAmount,
      payment_method,
      notes: notes ? `${notes}${reasonOriginal ? ` · approved discount reason: ${reasonOriginal}` : ""}` : reasonOriginal,
    })
    .select("id")
    .single();
  if (saleErr) throw saleErr;

  await Promise.all([
    admin.from("pieces").update({ status: "sold" }).eq("id", dr.piece_id),
    admin
      .from("discount_requests")
      .update({
        status: "approved",
        approved_by: actorId,
        approved_at: new Date().toISOString(),
        approved_pct: approvedPct,
        resulting_sale_id: sale.id,
      })
      .eq("id", requestId),
  ]);
}
