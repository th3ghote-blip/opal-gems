import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  name: z.string().min(1),
  hotel_name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  sales_tax_pct: z.number().default(0),
});

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shops")
    .insert({ ...parsed.data, active: true })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
