import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

const body = z.object({ status: z.enum(["completed", "cancelled"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("stock_counts")
    .update({ status: parsed.data.status, completed_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity({
    profile_id: profile.id,
    action: `stock_count_${parsed.data.status}`,
    entity_type: "stock_count",
    entity_id: params.id,
    details: { status: parsed.data.status },
  });

  return NextResponse.json({ ok: true });
}
