import { createAdminClient } from "@/lib/supabase/admin";

/** Apply an approval/deny decision to a movement; if approving a transfer, also
 * move the piece's current_shop_id, etc. Idempotent — re-running on a non-pending
 * movement is a no-op. */
export async function applyMovementDecision(
  movementId: string,
  decision: "approved" | "denied" | "cancelled",
  actorId: string
) {
  const admin = createAdminClient();
  const { data: mov } = await admin
    .from("movements")
    .select("piece_id, movement_type, to_shop_id, approval_status")
    .eq("id", movementId)
    .single();
  if (!mov) throw new Error("Movement not found");
  if (mov.approval_status !== "pending") return;

  const { error: upErr } = await admin
    .from("movements")
    .update({
      approval_status: decision,
      approved_by: actorId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", movementId);
  if (upErr) throw upErr;

  if (decision === "approved") {
    if (mov.movement_type === "transfer" && mov.to_shop_id) {
      await admin.from("pieces").update({ current_shop_id: mov.to_shop_id, status: "in_stock" }).eq("id", mov.piece_id);
    } else if (mov.movement_type === "pull") {
      await admin.from("pieces").update({ status: "in_transit" }).eq("id", mov.piece_id);
    } else if (mov.movement_type === "write_off") {
      await admin.from("pieces").update({ status: "written_off" }).eq("id", mov.piece_id);
    }
  }
}
