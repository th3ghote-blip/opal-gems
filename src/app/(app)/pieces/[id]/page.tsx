import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { money, moneyExact } from "@/lib/format";
import { CostRevealButton } from "./cost-button";

export const dynamic = "force-dynamic";

export default async function PieceDetail({ params }: { params: { id: string } }) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  const { data: piece } = await supabase
    .from("pieces")
    .select("*, shops!current_shop_id(name, hotel_name)")
    .eq("id", params.id)
    .single();

  if (!piece) notFound();

  const { data: photos } = await supabase
    .from("piece_photos")
    .select("storage_path")
    .eq("piece_id", piece.id)
    .order("sort_order");

  const photoUrls = (photos ?? []).map(
    (p) => supabase.storage.from("piece-photos").getPublicUrl(p.storage_path).data.publicUrl
  );

  const { data: tags } = await supabase.from("piece_tags").select("tag").eq("piece_id", piece.id);

  const shop = (piece.shops as unknown as { name: string; hotel_name: string | null } | null) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/pieces" className="text-xs text-neutral-500 hover:underline">← Pieces</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{piece.type}</h1>
          <p className="text-sm text-neutral-500 font-mono">{piece.sku}</p>
        </div>
        <StatusBadge status={piece.status} />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-2">
          {photoUrls.length === 0 ? (
            <div className="col-span-2 aspect-square grid place-items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-300 dark:text-neutral-700 text-5xl">
              ◇
            </div>
          ) : (
            photoUrls.map((u) => (
              <div key={u} className="relative aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden">
                <Image src={u} alt={piece.sku} fill sizes="(max-width:640px) 50vw, 33vw" className="object-cover" />
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-xs text-neutral-500">Sale price</div>
            <div className="text-2xl font-semibold">{moneyExact(piece.sale_price)}</div>
            {piece.original_price && Number(piece.original_price) > Number(piece.sale_price) && (
              <div className="text-xs text-neutral-500 mt-1">
                Orig {money(piece.original_price)} (after standard discount)
              </div>
            )}
            {profile.role === "owner" && <CostRevealButton pieceId={piece.id} />}
          </div>

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 grid grid-cols-2 gap-y-2 text-sm">
            <Detail label="Shop"      value={shop?.name} />
            <Detail label="Hotel"     value={shop?.hotel_name} />
            <Detail label="Metal"     value={piece.metal} />
            <Detail label="Karat"     value={piece.karat} />
            <Detail label="Stone"     value={piece.main_stone} />
            <Detail label="Cut"       value={piece.stone_cut} />
            <Detail label="Clarity"   value={piece.clarity} />
            <Detail label="Color"     value={piece.color_grade} />
            <Detail label="CTW"       value={piece.ctw ? `${piece.ctw} ct` : null} />
            <Detail label="Weight"    value={piece.gram_weight ? `${piece.gram_weight} g` : null} />
            <Detail label="Length"    value={piece.length_in ? `${piece.length_in}"` : null} />
            <Detail label="Width"     value={piece.width_mm ? `${piece.width_mm} mm` : null} />
            <Detail label="Ring size" value={piece.ring_size} />
          </div>

          {piece.description && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 text-sm">
              <div className="text-xs text-neutral-500 mb-1">Description</div>
              {piece.description}
            </div>
          )}

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t.tag} className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  {t.tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === false) return null;
  return (
    <>
      <div className="text-neutral-500 text-xs">{label}</div>
      <div className="text-sm">{value}</div>
    </>
  );
}
