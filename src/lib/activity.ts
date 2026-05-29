import { createAdminClient } from "./supabase/admin";

export async function logActivity(opts: {
  profile_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  shop_id?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("activity_log").insert({
      profile_id: opts.profile_id,
      action: opts.action,
      entity_type: opts.entity_type ?? null,
      entity_id: opts.entity_id ?? null,
      shop_id: opts.shop_id ?? null,
      details: opts.details ?? null,
    });
  } catch (e) {
    // Never fail the main operation due to logging
    console.error("[activity]", e);
  }
}
