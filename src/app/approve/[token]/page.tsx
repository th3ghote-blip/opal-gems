import { verifyApprovalToken } from "@/lib/approval-tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyMovementDecision } from "@/lib/movements";
import { applyDiscountDecision } from "@/lib/discounts";

interface Props {
  params: { token: string };
  searchParams: { d?: string };
}

// Public landing for WhatsApp/SMS approval links. Verifies the signed token —
// works for both movement and discount_request kinds.
export default async function ApprovePage({ params, searchParams }: Props) {
  const decision = (searchParams.d === "denied" ? "denied" : "approved") as "approved" | "denied";

  // Try movement first, then discount.
  const movement = verifyApprovalToken(params.token, "movement");
  const discount = movement.ok ? null : verifyApprovalToken(params.token, "discount");
  if (!movement.ok && (!discount || !discount.ok)) {
    return (
      <Layout title="Link invalid" detail={movement.ok ? "" : movement.reason} />
    );
  }

  const admin = createAdminClient();
  const { data: owner } = await admin.from("profiles").select("id, full_name").eq("role", "owner").eq("active", true).limit(1).single();
  const actorId = owner?.id ?? "00000000-0000-0000-0000-000000000000";

  try {
    if (movement.ok) {
      await applyMovementDecision(movement.id, decision, actorId);
      return <Layout title={`Movement ${decision}`} detail={`Recorded by ${owner?.full_name ?? "owner"}.`} />;
    } else if (discount?.ok) {
      await applyDiscountDecision(discount.id, decision, actorId);
      return <Layout title={`Discount ${decision}`} detail={`Recorded by ${owner?.full_name ?? "owner"}.`} />;
    }
  } catch (e) {
    return <Layout title="Could not apply decision" detail={e instanceof Error ? e.message : String(e)} />;
  }
  return null;
}

function Layout({ title, detail }: { title: string; detail?: string }) {
  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {detail && <p className="mt-2 text-sm text-neutral-500">{detail}</p>}
      </div>
    </main>
  );
}
