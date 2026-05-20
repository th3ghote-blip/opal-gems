import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  updates: z.array(z.object({ key: z.string().min(1), value: z.unknown() })),
});

export async function PUT(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  for (const u of parsed.data.updates) {
    const { error } = await admin
      .from("settings")
      .upsert({ key: u.key, value: u.value, updated_by: profile.id }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: `${u.key}: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
