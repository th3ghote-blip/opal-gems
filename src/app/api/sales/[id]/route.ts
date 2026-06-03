import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

const body = z.object({
  staff_id: z.string().uuid().optional(),
  sale_date: z.string().optional(),
  net_price: z.number().positive().optional(),
});

// Owner-only: reassign seller and/or change date on a sale.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  const update: Record<string, unknown> = {};

  if (parsed.data.sale_date) {
    update.sale_date = parsed.data.sale_date;
  }

  // Load sale whenever staff or net_price is changing (need gross_price / commission_pct)
  if (parsed.data.staff_id || parsed.data.net_price !== undefined) {
    const [saleRes, staffRes] = await Promise.all([
      admin.from("sales").select("id, net_price, gross_price, staff_commission_pct, staff_id").eq("id", params.id).single(),
      parsed.data.staff_id
        ? admin.from("profiles").select("commission_pct").eq("id", parsed.data.staff_id).single()
        : Promise.resolve({ data: null }),
    ]);
    if (!saleRes.data) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

    const netPrice  = parsed.data.net_price ?? Number(saleRes.data.net_price);
    const grossPrice = Number(saleRes.data.gross_price);
    const commissionPct = staffRes.data
      ? Number((staffRes.data as { commission_pct: number }).commission_pct ?? 2)
      : Number(saleRes.data.staff_commission_pct ?? 2);

    if (parsed.data.staff_id) update.staff_id = parsed.data.staff_id;
    if (parsed.data.net_price !== undefined) {
      update.net_price     = netPrice;
      update.discount_pct  = grossPrice > 0 ? +((1 - netPrice / grossPrice) * 100).toFixed(2) : 0;
    }
    update.staff_commission_pct    = commissionPct;
    update.staff_commission_amount = +(netPrice * commissionPct / 100).toFixed(2);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await admin.from("sales").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity({
    profile_id: profile.id,
    action: parsed.data.sale_date ? "sale_date_changed" : "sale_reassigned",
    entity_type: "sale",
    entity_id: params.id,
    details: { staff_id: parsed.data.staff_id, sale_date: parsed.data.sale_date },
  });

  return NextResponse.json({ ok: true });
}
