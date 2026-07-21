import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOwner } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const body = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(40),
  shop: z.string().min(1).max(80),
  timeframe: z.string().max(200).nullable().optional(),
  interest: z.string().max(300).nullable().optional(),
});

// Called by the phone receptionist to book a store-viewing request.
// The owner is notified via the configured channels (WhatsApp/SMS/email).
export async function POST(req: NextRequest) {
  const requiredKey = process.env.RECEPTIONIST_API_KEY;
  if (requiredKey && req.headers.get("x-api-key") !== requiredKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  }
  const data = parsed.data;

  // Resolve the shop by fuzzy name; virtual/inactive shops are not bookable.
  const admin = createAdminClient();
  const { data: shops } = await admin.from("shops").select("name").eq("active", true);
  const match = (shops ?? []).find(
    (s) =>
      s.name.toLowerCase() !== "friends & family" &&
      (s.name.toLowerCase().includes(data.shop.toLowerCase()) ||
        data.shop.toLowerCase().includes(s.name.toLowerCase()))
  );
  if (!match) {
    return NextResponse.json(
      { error: "Unknown store", stores: (shops ?? []).map((s) => s.name).filter((n) => n.toLowerCase() !== "friends & family") },
      { status: 400 }
    );
  }

  await notifyOwner("viewing_request", {
    caller: data.name,
    phone: data.phone,
    shop: match.name,
    timeframe: data.timeframe ?? undefined,
    interest: data.interest ?? undefined,
  });

  return NextResponse.json({ ok: true, shop: match.name });
}
