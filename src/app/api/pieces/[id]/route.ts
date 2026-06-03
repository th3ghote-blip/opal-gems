import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

const body = z.object({
  sku: z.string().min(1),
  type: z.string().min(1),
  metal: z.string().nullable().optional(),
  karat: z.string().nullable().optional(),
  main_stone: z.string().nullable().optional(),
  stone_cut: z.string().nullable().optional(),
  clarity: z.string().nullable().optional(),
  color_grade: z.string().nullable().optional(),
  ctw: z.number().nullable().optional(),
  gram_weight: z.number().nullable().optional(),
  length_in: z.number().nullable().optional(),
  width_mm: z.number().nullable().optional(),
  ring_size: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  original_price: z.number(),
  sale_price: z.number().optional(),
  quantity: z.number().int().min(0).default(1),
  cost: z.number().nullable().optional(),
  current_shop_id: z.string().uuid().nullable().optional(),
  status: z.enum(["in_stock", "reserved", "sold", "in_transit", "written_off"]),
  tags: z.array(z.string()).default([]),
  new_photo_paths: z.array(z.string()).default([]),
  kept_photo_ids: z.array(z.string().uuid()).default([]),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  }
  const data = parsed.data;

  const admin = createAdminClient();

  // Build update payload. Don't touch cost unless owner.
  const update: Record<string, unknown> = {
    sku: data.sku,
    type: data.type,
    metal: data.metal ?? null,
    karat: data.karat ?? null,
    main_stone: data.main_stone ?? null,
    stone_cut: data.stone_cut ?? null,
    clarity: data.clarity ?? null,
    color_grade: data.color_grade ?? null,
    ctw: data.ctw ?? null,
    gram_weight: data.gram_weight ?? null,
    length_in: data.length_in ?? null,
    width_mm: data.width_mm ?? null,
    ring_size: data.ring_size ?? null,
    description: data.description ?? null,
    original_price: data.original_price,
    sale_price: data.sale_price ?? data.original_price,
    quantity: data.quantity,
    current_shop_id: data.current_shop_id ?? null,
    status: data.status,
  };
  if (profile.role === "owner") update.cost = data.cost ?? null;

  const { error: upErr } = await admin.from("pieces").update(update).eq("id", params.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Tags: simple replace.
  await admin.from("piece_tags").delete().eq("piece_id", params.id);
  if (data.tags.length) {
    await admin.from("piece_tags").insert(data.tags.map((tag) => ({ piece_id: params.id, tag })));
  }

  // Photos: delete removed, append new.
  const { data: existing } = await admin
    .from("piece_photos")
    .select("id, storage_path")
    .eq("piece_id", params.id);
  const toRemove = (existing ?? []).filter((p) => !data.kept_photo_ids.includes(p.id));
  if (toRemove.length) {
    await admin.storage.from("piece-photos").remove(toRemove.map((p) => p.storage_path));
    await admin.from("piece_photos").delete().in("id", toRemove.map((p) => p.id));
  }
  if (data.new_photo_paths.length) {
    const baseOrder = (data.kept_photo_ids.length ?? 0);
    await admin.from("piece_photos").insert(
      data.new_photo_paths.map((storage_path, idx) => ({
        piece_id: params.id,
        storage_path,
        sort_order: baseOrder + idx,
      }))
    );
  }

  logActivity({
    profile_id: profile.id,
    action: "piece_edited",
    entity_type: "piece",
    entity_id: params.id,
    shop_id: data.current_shop_id ?? null,
    details: { sku: data.sku, type: data.type, price: data.sale_price },
  });

  return NextResponse.json({ id: params.id });
}
