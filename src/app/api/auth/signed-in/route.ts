import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

// Called by the login page right after a successful sign-in.
// Attribution comes from the session cookie — no body is trusted.
export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  logActivity({
    profile_id: profile.id,
    action: "signed_in",
    entity_type: "auth",
  });

  return NextResponse.json({ ok: true });
}
