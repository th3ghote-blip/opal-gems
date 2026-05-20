import { verifyApprovalToken } from "@/lib/approval-tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyMovementDecision } from "@/lib/movements";

interface Props {
  params: { token: string };
  searchParams: { d?: string };
}

// Public landing page hit by WhatsApp/SMS approval links. Verifies signed token,
// applies the decision via service_role (no auth needed — token IS the auth).
export default async function ApprovePage({ params, searchParams }: Props) {
  const decision = (searchParams.d === "denied" ? "denied" : "approved") as "approved" | "denied";

  const verified = verifyApprovalToken(params.token, "movement");
  if (!verified.ok) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Link invalid</h1>
          <p className="mt-2 text-sm text-neutral-500">{verified.reason}</p>
        </div>
      </main>
    );
  }

  // System actor — fall back to the owner profile (a real audit will still be created via trigger)
  const admin = createAdminClient();
  const { data: owner } = await admin.from("profiles").select("id, full_name").eq("role", "owner").eq("active", true).limit(1).single();

  try {
    await applyMovementDecision(verified.id, decision, owner?.id ?? "00000000-0000-0000-0000-000000000000");
  } catch (e) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Could not apply decision</h1>
          <p className="mt-2 text-sm text-neutral-500">{e instanceof Error ? e.message : String(e)}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Movement {decision}</h1>
        <p className="mt-2 text-sm text-neutral-500">Recorded by {owner?.full_name ?? "owner"}.</p>
      </div>
    </main>
  );
}
