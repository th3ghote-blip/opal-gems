import twilio from "twilio";
import { Resend } from "resend";
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

function subject<K extends TemplateKey>(key: K, p: Templates[K]): string {
  switch (key) {
    case "sale_alert": {
      const x = p as Templates["sale_alert"];
      return `💎 Sale — ${x.piece} (${x.sku}) for $${x.netPrice}`;
    }
    case "movement_request": {
      const x = p as Templates["movement_request"];
      return `📦 ${x.movementType.toUpperCase()} request — ${x.piece} (${x.sku})`;
    }
    case "discount_request": {
      const x = p as Templates["discount_request"];
      return `🏷️ Discount request ${x.requestedPct}% — ${x.piece} (${x.sku})`;
    }
    case "wishlist_added": {
      const x = p as Templates["wishlist_added"];
      return `⭐ Wishlist — ${x.customer}`;
    }
  }
  return "Opal Gems notification";
}

function plainBody<K extends TemplateKey>(key: K, p: Templates[K]): string {
  switch (key) {
    case "sale_alert": {
      const x = p as Templates["sale_alert"];
      return [
        `💎 Opal Gems — SALE`,
        `${x.staff} sold ${x.piece} (${x.sku})`,
        `at ${x.shop} for $${x.netPrice}`,
        x.customer ? `Customer: ${x.customer}` : null,
      ].filter(Boolean).join("\n");
    }
    case "movement_request": {
      const x = p as Templates["movement_request"];
      const route = x.fromShop && x.toShop ? `${x.fromShop} → ${x.toShop}` : x.fromShop ?? x.toShop ?? "";
      return [
        `📦 ${x.movementType.toUpperCase()} request`,
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
        `🏷️ Discount request`,
        `${x.staff} asks ${x.requestedPct}% off on ${x.piece} (${x.sku})`,
        ``,
        `Approve: ${x.approveUrl}`,
        `Deny:    ${x.denyUrl}`,
      ].join("\n");
    }
    case "wishlist_added": {
      const x = p as Templates["wishlist_added"];
      return [
        `⭐ Wishlist`,
        `${x.staff} added for ${x.customer}:`,
        x.description,
      ].join("\n");
    }
  }
  return "";
}

function htmlBody<K extends TemplateKey>(key: K, p: Templates[K]): string {
  const wrap = (inner: string) =>
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;color:#171717;line-height:1.5">${inner}<hr style="border:0;border-top:1px solid #e5e5e5;margin:20px 0"><div style="color:#737373;font-size:12px">Sent by Opal Gems · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "#"}" style="color:#737373">open app</a></div></div>`;

  const button = (href: string, label: string, color: string) =>
    `<a href="${href}" style="display:inline-block;padding:10px 18px;background:${color};color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;font-weight:500">${label}</a>`;

  switch (key) {
    case "sale_alert": {
      const x = p as Templates["sale_alert"];
      return wrap(`
        <h2 style="margin:0 0 8px;font-size:18px">💎 Sale recorded</h2>
        <p style="margin:0"><strong>${x.staff}</strong> sold <strong>${x.piece}</strong> (${x.sku}) at <strong>${x.shop}</strong> for <strong>$${x.netPrice}</strong>.${x.customer ? ` Customer: ${x.customer}.` : ""}</p>
      `);
    }
    case "movement_request": {
      const x = p as Templates["movement_request"];
      const route = x.fromShop && x.toShop ? `${x.fromShop} → ${x.toShop}` : x.fromShop ?? x.toShop ?? "";
      return wrap(`
        <h2 style="margin:0 0 8px;font-size:18px">📦 ${x.movementType.toUpperCase()} request</h2>
        <p style="margin:0 0 6px"><strong>${x.staff}</strong> requested: <strong>${x.piece}</strong> (${x.sku})${route ? ` — ${route}` : ""}.</p>
        <p style="margin:16px 0 0">${button(x.approveUrl, "Approve", "#16a34a")}${button(x.denyUrl, "Deny", "#dc2626")}</p>
      `);
    }
    case "discount_request": {
      const x = p as Templates["discount_request"];
      return wrap(`
        <h2 style="margin:0 0 8px;font-size:18px">🏷️ Discount request</h2>
        <p style="margin:0"><strong>${x.staff}</strong> is asking for <strong>${x.requestedPct}%</strong> off on <strong>${x.piece}</strong> (${x.sku}).</p>
        <p style="margin:16px 0 0">${button(x.approveUrl, "Approve", "#16a34a")}${button(x.denyUrl, "Deny", "#dc2626")}</p>
      `);
    }
    case "wishlist_added": {
      const x = p as Templates["wishlist_added"];
      return wrap(`
        <h2 style="margin:0 0 8px;font-size:18px">⭐ Wishlist entry</h2>
        <p style="margin:0"><strong>${x.staff}</strong> added a request for <strong>${x.customer}</strong>:<br>${x.description}</p>
      `);
    }
  }
  return wrap("");
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

async function getActiveOwnerEmails(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data: owners } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "owner")
      .eq("active", true);
    if (!owners?.length) return [];
    // auth.users holds the email; fetch in one listUsers and filter.
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const ownerIds = new Set(owners.map((o) => o.id));
    return users.users.filter((u) => ownerIds.has(u.id) && u.email).map((u) => u.email!);
  } catch (e) {
    console.error("failed to load owner emails", e);
    return [];
  }
}

async function sendEmail<K extends TemplateKey>(
  key: K,
  payload: Templates[K]
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Opal Gems <onboarding@resend.dev>";
  // Recipients: every active owner in DB, plus OWNER_EMAIL env if set (dedup).
  const owners = await getActiveOwnerEmails();
  const envEmail = process.env.OWNER_EMAIL?.trim();
  const recipients = Array.from(new Set([...owners, ...(envEmail ? [envEmail] : [])])).filter(Boolean);

  if (!apiKey || recipients.length === 0) {
    const body = plainBody(key, payload);
    console.log(`[notify:${key}] (Resend not configured / no owners — printing)\n${body}`);
    await logOutbox("email", recipients.join(",") || "(unset)", key, payload as object, "failed", "resend not configured");
    return { sent: false, reason: "resend not configured" };
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: recipients,
      subject: subject(key, payload),
      text: plainBody(key, payload),
      html: htmlBody(key, payload),
    });
    if (error) {
      await logOutbox("email", recipients.join(","), key, payload as object, "failed", error.message);
      return { sent: false, reason: error.message };
    }
    await logOutbox("email", recipients.join(","), key, payload as object, "sent");
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logOutbox("email", recipients.join(","), key, payload as object, "failed", msg);
    return { sent: false, reason: msg };
  }
}

async function sendTwilio<K extends TemplateKey>(
  key: K,
  payload: Templates[K],
  channel: "whatsapp" | "sms"
): Promise<{ sent: boolean; reason?: string }> {
  const ownerPhone = process.env.OWNER_PHONE?.trim();
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const body = plainBody(key, payload);

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Twilio send failed", msg);
    await logOutbox(channel, ownerPhone, key, payload as object, "failed", msg);
    return { sent: false, reason: msg };
  }
}

export async function notifyOwner<K extends TemplateKey>(
  key: K,
  payload: Templates[K]
): Promise<{ sent: boolean }> {
  // Comma-separated list: "email,whatsapp" sends both in parallel.
  // Falls back to legacy NOTIFICATION_CHANNEL (singular).
  const raw = (process.env.NOTIFICATION_CHANNELS || process.env.NOTIFICATION_CHANNEL || "email").toLowerCase();
  const channels = raw.split(",").map((c) => c.trim()).filter(Boolean);
  const results = await Promise.allSettled(
    channels.map((ch) => {
      if (ch === "email") return sendEmail(key, payload);
      if (ch === "sms" || ch === "whatsapp") return sendTwilio(key, payload, ch);
      return Promise.resolve({ sent: false, reason: `unknown channel ${ch}` });
    })
  );
  return { sent: results.some((r) => r.status === "fulfilled" && r.value.sent) };
}
