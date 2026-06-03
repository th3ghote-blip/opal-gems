import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

const body = z.object({
  staff_id: z.string().uuid().optional(),
  sale_date: z.string().optional(),
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

  if (parsed.data.staff_id) {
    const [saleRes, staffRes] = await Promise.all([
      admin.from("sales").select("id, net_price").eq("id", params.id).single(),
      admin.from("profiles").select("commission_pct").eq("id", parsed.data.staff_id).single(),
    ]);
    if (!saleRes.data) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    if (!staffRes.data) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    const commissionPct = Number(staffRes.data.commission_pct ?? 2);
    update.staff_id = parsed.data.staff_id;
    update.staff_commission_pct = commissionPct;
    update.staff_commission_amount = +(Number(saleRes.data.net_price) * commissionPct / 100).toFixed(2);
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
