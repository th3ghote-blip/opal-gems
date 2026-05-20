import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  full_name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("").transform(() => null)),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  marketing_consent: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  const data = parsed.data;

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("customers")
    .insert({
      full_name: data.full_name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      marketing_consent: data.marketing_consent,
      consent_at: data.marketing_consent ? new Date().toISOString() : null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: row.id });
}
