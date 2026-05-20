import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({ shop_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: count, error } = await admin
    .from("stock_counts")
    .insert({
      shop_id: parsed.data.shop_id,
      started_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Snapshot: every in_stock or reserved piece currently assigned to that shop is "expected".
  const { data: expected } = await admin
    .from("pieces")
    .select("id")
    .eq("current_shop_id", parsed.data.shop_id)
    .in("status", ["in_stock", "reserved"]);
  if (expected && expected.length) {
    await admin.from("stock_count_entries").insert(
      expected.map((p) => ({ count_id: count.id, piece_id: p.id, was_expected: true, was_found: false }))
    );
  }

  return NextResponse.json({ id: count.id });
}
