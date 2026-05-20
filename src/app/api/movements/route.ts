import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signApprovalToken } from "@/lib/approval-tokens";
import { notifyOwner } from "@/lib/notifications";

const body = z.object({
  piece_id: z.string().uuid(),
  movement_type: z.enum(["transfer", "pull", "restock", "write_off"]),
  from_shop_id: z.string().uuid().nullable().optional(),
  to_shop_id: z.string().uuid().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  const data = parsed.data;

  const admin = createAdminClient();

  // Insert movement
  const { data: mov, error: mErr } = await admin
    .from("movements")
    .insert({
      piece_id: data.piece_id,
      movement_type: data.movement_type,
      from_shop_id: data.from_shop_id ?? null,
      to_shop_id: data.to_shop_id ?? null,
      requested_by: profile.id,
      reason: data.reason ?? null,
    })
    .select("id")
    .single();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Sign approval/deny tokens, save approval_token for traceability
  const approveToken = signApprovalToken("movement", mov.id);
  await admin.from("movements").update({ approval_token: approveToken }).eq("id", mov.id);

  // Fire owner notification (best-effort; falls back to console log if Twilio missing)
  try {
    const [{ data: piece }, { data: fromShop }, { data: toShop }] = await Promise.all([
      admin.from("pieces").select("sku, type").eq("id", data.piece_id).single(),
      data.from_shop_id ? admin.from("shops").select("name").eq("id", data.from_shop_id).single() : { data: null },
      data.to_shop_id ? admin.from("shops").select("name").eq("id", data.to_shop_id).single() : { data: null },
    ]);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await notifyOwner("movement_request", {
      staff: profile.full_name,
      piece: piece?.type ?? "piece",
      sku: piece?.sku ?? "",
      movementType: data.movement_type,
      fromShop: fromShop?.name,
      toShop: toShop?.name,
      approveUrl: `${base}/approve/${approveToken}?d=approved`,
      denyUrl: `${base}/approve/${approveToken}?d=denied`,
    });
  } catch (e) {
    console.error("notify failed", e);
  }

  return NextResponse.json({ id: mov.id });
}
