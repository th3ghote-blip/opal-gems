import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOwner } from "@/lib/notifications";

const body = z.object({
  customer_id: z.string().uuid(),
  description: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("wishlist")
    .insert({
      customer_id: parsed.data.customer_id,
      description: parsed.data.description,
      notes: parsed.data.notes ?? null,
      requested_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Owner FYI
  try {
    const { data: customer } = await admin.from("customers").select("full_name").eq("id", parsed.data.customer_id).single();
    await notifyOwner("wishlist_added", {
      staff: profile.full_name,
      customer: customer?.full_name ?? "—",
      description: parsed.data.description,
    });
  } catch (e) {
    console.error("wishlist notify failed", e);
  }

  return NextResponse.json({ id: data.id });
}
