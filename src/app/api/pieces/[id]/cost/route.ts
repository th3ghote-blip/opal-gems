import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Owner-only: reveal the cost field of a piece. The cost column is REVOKEd
// from `authenticated`, so this route uses the service_role client AFTER a
// role check. Anyone non-owner gets 403.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pieces")
    .select("cost")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cost: data?.cost ?? null });
}
