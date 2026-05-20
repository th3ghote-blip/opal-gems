import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  piece_id: z.string().uuid(),
  was_found: z.boolean(),
  notes: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  // Was this piece expected (i.e. assigned to that shop when the count began)?
  // If an entry already exists, we just update it. Otherwise it's an unexpected
  // present-piece — insert with was_expected = false.
  const { data: existing } = await admin
    .from("stock_count_entries")
    .select("piece_id")
    .eq("count_id", params.id)
    .eq("piece_id", parsed.data.piece_id)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("stock_count_entries")
      .update({ was_found: parsed.data.was_found, notes: parsed.data.notes ?? null })
      .eq("count_id", params.id)
      .eq("piece_id", parsed.data.piece_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin
      .from("stock_count_entries")
      .insert({
        count_id: params.id,
        piece_id: parsed.data.piece_id,
        was_expected: false,
        was_found: parsed.data.was_found,
        notes: parsed.data.notes ?? null,
      });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
