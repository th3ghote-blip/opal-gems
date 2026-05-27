import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  role: z.enum(["owner", "manager", "staff"]).optional(),
  default_shop_id: z.string().uuid().nullable().optional(),
  commission_pct: z.number().optional(),
  active: z.boolean().optional(),
  full_name: z.string().min(1).optional(),
  // When provided, replaces all profile_shops rows and sets default_shop_id to first entry
  shop_ids: z.array(z.string().uuid()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const { shop_ids, ...profilePatch } = parsed.data;

  // If shop_ids is being updated, sync default_shop_id to the first selected shop
  if (shop_ids !== undefined) {
    profilePatch.default_shop_id = shop_ids[0] ?? null;
  }

  const admin = createAdminClient();

  // Update profile fields (if any beyond shop_ids)
  if (Object.keys(profilePatch).length > 0) {
    const { error } = await admin.from("profiles").update(profilePatch).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace profile_shops rows
  if (shop_ids !== undefined) {
    const { error: dErr } = await admin.from("profile_shops").delete().eq("profile_id", params.id);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
    if (shop_ids.length > 0) {
      const { error: iErr } = await admin
        .from("profile_shops")
        .insert(shop_ids.map((shop_id) => ({ profile_id: params.id, shop_id })));
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
