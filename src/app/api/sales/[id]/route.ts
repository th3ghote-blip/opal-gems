import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

const body = z.object({
  staff_id: z.string().uuid(),
});

// Owner-only: reassign a sale to a different staff member.
// Recalculates commission based on the new staff member's rate.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const admin = createAdminClient();

  // Load the sale + new staff commission rate in parallel
  const [saleRes, staffRes] = await Promise.all([
    admin.from("sales").select("id, net_price").eq("id", params.id).single(),
    admin.from("profiles").select("commission_pct").eq("id", parsed.data.staff_id).single(),
  ]);

  if (!saleRes.data) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  if (!staffRes.data) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

  const commissionPct = Number(staffRes.data.commission_pct ?? 2);
  const commissionAmount = +(Number(saleRes.data.net_price) * commissionPct / 100).toFixed(2);

  const { error } = await admin
    .from("sales")
    .update({
      staff_id: parsed.data.staff_id,
      staff_commission_pct: commissionPct,
      staff_commission_amount: commissionAmount,
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const newStaff = staffRes.data as { commission_pct: number; full_name?: string } | null;
  logActivity({
    profile_id: profile.id,
    action: "sale_reassigned",
    entity_type: "sale",
    entity_id: params.id,
    details: { new_staff_id: parsed.data.staff_id },
  });

  return NextResponse.json({ ok: true });
}
