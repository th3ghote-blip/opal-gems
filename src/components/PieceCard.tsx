import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "./StatusBadge";
import { money } from "@/lib/format";
import type { Piece, PieceStatus } from "@/lib/types";

interface CardPiece
  extends Pick<Piece, "id" | "sku" | "type" | "main_stone" | "ctw" | "sale_price" | "status"> {
  thumb_url: string | null;
  shop_name: string | null;
}

export function PieceCard({ piece }: { piece: CardPiece }) {
  return (
    <Link
      href={`/pieces/${piece.id}`}
      className="group block rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
    >
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
        {piece.thumb_url ? (
          <Image
            src={piece.thumb_url}
            alt={piece.sku}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:opacity-90"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-neutral-300 dark:text-neutral-700 text-3xl">
            ◇
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <StatusBadge status={piece.status as PieceStatus} />
        </div>
      </div>
      <div className="p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-mono text-neutral-500">{piece.sku}</span>
          <span className="text-sm font-medium">{money(piece.sale_price)}</span>
        </div>
        <div className="mt-0.5 text-sm truncate">{piece.type}</div>
        <div className="text-xs text-neutral-500 truncate">
          {[piece.main_stone, piece.ctw ? `${piece.ctw}ct` : null, piece.shop_name].filter(Boolean).join(" · ")}
        </div>
      </div>
    </Link>
  );
}
