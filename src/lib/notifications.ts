import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";

type TemplateKey =
  | "sale_alert"
  | "movement_request"
  | "discount_request"
  | "wishlist_added";

interface Templates {
  sale_alert: {
    staff: string;
    piece: string;
    sku: string;
    shop: string;
    netPrice: string;
    customer?: string;
  };
  movement_request: {
    staff: string;
    piece: string;
    sku: string;
    movementType: string;
    fromShop?: string;
    toShop?: string;
    approveUrl: string;
    denyUrl: string;
  };
  discount_request: {
    staff: string;
    piece: string;
    sku: string;
    requestedPct: number;
    approveUrl: string;
    denyUrl: string;
  };
  wishlist_added: {
    staff: string;
    customer: string;
    description: string;
  };
}

function render<K extends TemplateKey>(key: K, p: Templates[K]): string {
  // Plain-text bodies (works for both SMS and WhatsApp sandbox).
  // For WhatsApp Business templates, register equivalent templates in Meta and
  // swap to `client.messages.create({ contentSid })` per the Twilio docs.
  switch (key) {
    case "sale_alert": {
      const x = p as Templates["sale_alert"];
      return [
        `💎 Opal Gems — SALE`,
        `${x.staff} sold ${x.piece} (${x.sku})`,
        `at ${x.shop} for $${x.netPrice}`,
        x.customer ? `Customer: ${x.customer}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "movement_request": {
      const x = p as Templates["movement_request"];
      const route = x.fromShop && x.toShop ? `${x.fromShop} → ${x.toShop}` : x.fromShop ?? x.toShop ?? "";
      return [
        `📦 Opal Gems — ${x.movementType.toUpperCase()} request`,
        `${x.staff}: ${x.piece} (${x.sku})`,
        route,
        ``,
        `Approve: ${x.approveUrl}`,
        `Deny:    ${x.denyUrl}`,
      ].join("\n");
    }
    case "discount_request": {
      const x = p as Templates["discount_request"];
      return [
        `🏷️ Opal Gems — discount request`,
        `${x.staff} asks ${x.requestedPct}% off on ${x.piece} (${x.sku})`,
        ``,
        `Approve: ${x.approveUrl}`,
        `Deny:    ${x.denyUrl}`,
      ].join("\n");
    }
    case "wishlist_added": {
      const x = p as Templates["wishlist_added"];
      return [
        `⭐ Opal Gems — wishlist`,
        `${x.staff} added for ${x.customer}:`,
        x.description,
      ].join("\n");
    }
  }
  return "";
}

async function logOutbox(
  channel: string,
  recipient: string,
  templateKey: string,
  payload: object,
  status: "sent" | "failed",
  error?: string
) {
  try {
    const sb = createAdminClient();
    await sb.from("notifications_outbox").insert({
      channel,
      recipient,
      template_key: templateKey,
      payload,
      status,
      attempts: 1,
      last_error: error ?? null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.error("notification outbox log failed", e);
  }
}

export async function notifyOwner<K extends TemplateKey>(
  key: K,
  payload: Templates[K]
): Promise<{ sent: boolean; reason?: string }> {
  const ownerPhone = process.env.OWNER_PHONE?.trim();
  const channel = (process.env.NOTIFICATION_CHANNEL || "whatsapp").toLowerCase();
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const body = render(key, payload);

  // Dev fallback: if Twilio isn't wired yet, log to console so flow still works.
  if (!sid || !token || !from || !ownerPhone) {
    console.log(`[notify:${key}] (Twilio not configured — printing)\n${body}`);
    await logOutbox(channel, ownerPhone ?? "(unset)", key, payload as object, "failed", "twilio not configured");
    return { sent: false, reason: "twilio not configured" };
  }

  try {
    const client = twilio(sid, token);
    const to = channel === "whatsapp" ? `whatsapp:${ownerPhone}` : ownerPhone;
    const fromAddr = channel === "whatsapp" && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from;
    await client.messages.create({ from: fromAddr, to, body });
    await logOutbox(channel, ownerPhone, key, payload as object, "sent");
    return { sent: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Twilio send failed", msg);
    await logOutbox(channel, ownerPhone, key, payload as object, "failed", msg);
    return { sent: false, reason: msg };
  }
}
