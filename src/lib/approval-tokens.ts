import { createHmac, timingSafeEqual } from "crypto";

// Signed, expiring tokens used in WhatsApp/SMS approval links.
// Layout: base64url(payload) + "." + hex(hmac).
// Payload: { k: kind, i: id, e: expiryUnixMs }.

type TokenKind = "movement" | "discount";

interface Payload {
  k: TokenKind;
  i: string;
  e: number;
}

function secret(): string {
  const s = process.env.APPROVAL_TOKEN_SECRET;
  if (!s || s.length < 32) {
    throw new Error("APPROVAL_TOKEN_SECRET must be set and >= 32 chars");
  }
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function signApprovalToken(
  kind: TokenKind,
  id: string,
  ttlMinutes = 60 * 24 * 7
): string {
  const payload: Payload = {
    k: kind,
    i: id,
    e: Date.now() + ttlMinutes * 60_000,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifyApprovalToken(
  token: string,
  expectedKind: TokenKind
): { ok: true; id: string } | { ok: false; reason: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret()).update(body).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad signature" };
  }
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return { ok: false, reason: "bad payload" };
  }
  if (payload.k !== expectedKind) return { ok: false, reason: "wrong kind" };
  if (Date.now() > payload.e) return { ok: false, reason: "expired" };
  return { ok: true, id: payload.i };
}
