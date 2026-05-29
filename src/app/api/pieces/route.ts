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
  sale_price: z.number(),
  quantity: z.number().int().min(1).default(1),
  cost: z.number().nullable().optional(),
  current_shop_id: z.string().uuid().nullable().optional(),
  status: z.enum(["in_stock", "reserved", "sold", "in_transit", "written_off"]).default("in_stock"),
  tags: z.array(z.string()).default([]),
  new_photo_paths: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  }
  const data = parsed.data;

  // Non-owners can't set cost.
  const costToSet = profile.role === "owner" ? data.cost ?? null : null;

  const admin = createAdminClient();

  const { data: piece, error } = await admin
    .from("pieces")
    .insert({
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
      sale_price: data.sale_price,
      quantity: data.quantity,
      cost: costToSet,
      current_shop_id: data.current_shop_id ?? null,
      status: data.status,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const pieceId = piece.id;

  if (data.tags.length) {
    await admin.from("piece_tags").insert(data.tags.map((tag) => ({ piece_id: pieceId, tag })));
  }
  if (data.new_photo_paths.length) {
    await admin.from("piece_photos").insert(
      data.new_photo_paths.map((storage_path, idx) => ({ piece_id: pieceId, storage_path, sort_order: idx }))
    );
  }

  logActivity({
    profile_id: profile.id,
    action: "piece_added",
    entity_type: "piece",
    entity_id: pieceId,
    shop_id: data.current_shop_id ?? null,
    details: { sku: data.sku, type: data.type, price: data.sale_price, qty: data.quantity },
  });

  return NextResponse.json({ id: pieceId });
}
