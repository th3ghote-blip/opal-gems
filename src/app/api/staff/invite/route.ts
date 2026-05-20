import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["owner", "manager", "staff"]).default("staff"),
  default_shop_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  const { email, full_name, role, default_shop_id } = parsed.data;

  const admin = createAdminClient();

  // Create user (email_confirm: true so they can sign in without confirmation email)
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (cErr || !created.user) {
    return NextResponse.json({ error: cErr?.message ?? "Failed to create user" }, { status: 500 });
  }

  // The profile-on-signup trigger already inserted a row; update to set role/shop/active/full_name.
  const { error: uErr } = await admin
    .from("profiles")
    .update({
      role,
      active: true,
      full_name,
      default_shop_id: default_shop_id ?? null,
    })
    .eq("id", created.user.id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ id: created.user.id });
}
