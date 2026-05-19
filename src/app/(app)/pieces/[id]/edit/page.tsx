import { notFound, redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PieceForm } from "@/components/PieceForm";

export const dynamic = "force-dynamic";

export default async function EditPiecePage({ params }: { params: { id: string } }) {
  const profile = (await getCurrentProfile())!;
  if (profile.role === "staff") redirect(`/pieces/${params.id}`);

  const supabase = createClient();
  const { data: piece } = await supabase
    .from("pieces")
    .select("id, sku, type, metal, karat, main_stone, stone_cut, clarity, color_grade, ctw, gram_weight, length_in, width_mm, ring_size, description, original_price, sale_price, current_shop_id, status")
    .eq("id", params.id)
    .single();

  if (!piece) notFound();

  // Cost — only owner; pulled via admin client (column is revoked from authenticated).
  let cost: number | null = null;
  if (profile.role === "owner") {
    const admin = createAdminClient();
    const { data } = await admin.from("pieces").select("cost").eq("id", piece.id).single();
    cost = data?.cost ?? null;
  }

  const [{ data: shops }, { data: enumRows }, { data: tagRows }, { data: photos }] = await Promise.all([
    supabase.from("shops").select("id, name").eq("active", true).order("name"),
    supabase.from("enum_values").select("enum_name, value").eq("active", true).order("sort_order"),
    supabase.from("piece_tags").select("tag").eq("piece_id", piece.id),
    supabase.from("piece_photos").select("id, storage_path").eq("piece_id", piece.id).order("sort_order"),
  ]);

  const enums: Record<string, { value: string }[]> = {};
  for (const row of enumRows ?? []) {
    (enums[row.enum_name] ??= []).push({ value: row.value });
  }

  const existing_photos = (photos ?? []).map((p) => ({
    id: p.id,
    storage_path: p.storage_path,
    url: supabase.storage.from("piece-photos").getPublicUrl(p.storage_path).data.publicUrl,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Edit piece</h1>
        <p className="text-sm text-neutral-500 font-mono">{piece.sku}</p>
      </header>
      <PieceForm
        mode="edit"
        initial={{
          ...piece,
          cost,
          tags: (tagRows ?? []).map((t) => t.tag),
          existing_photos,
        }}
        shops={shops ?? []}
        enums={enums}
        isOwner={profile.role === "owner"}
      />
    </div>
  );
}
