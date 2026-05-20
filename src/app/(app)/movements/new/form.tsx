"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Piece {
  id: string;
  sku: string;
  type: string;
  current_shop_id: string | null;
  status: string;
}

interface Shop {
  id: string;
  name: string;
}

export function NewMovementForm({ pieces, shops, defaultFromShopId }: { pieces: Piece[]; shops: Shop[]; defaultFromShopId: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [pieceId, setPieceId] = useState<string>("");
  const [type, setType] = useState<string>("transfer");

  const selectedPiece = pieces.find((p) => p.id === pieceId);
  const fromShopId = selectedPiece?.current_shop_id ?? defaultFromShopId;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      piece_id: pieceId,
      movement_type: type,
      from_shop_id: fromShopId,
      to_shop_id: type === "transfer" ? String(fd.get("to_shop_id") ?? "") : null,
      reason: String(fd.get("reason") ?? "").trim() || null,
    };
    start(async () => {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push("/movements");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Piece *</label>
        <select required value={pieceId} onChange={(e) => setPieceId(e.target.value)} className={inputCls}>
          <option value="">— Select a piece —</option>
          {pieces.map((p) => (
            <option key={p.id} value={p.id}>{p.sku} · {p.type}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Type *</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
          <option value="transfer">Transfer to another shop</option>
          <option value="pull">Pull (e.g. for display, repair, photo)</option>
          <option value="write_off">Write-off (damaged, lost)</option>
          <option value="restock">Restock (new piece arriving)</option>
        </select>
      </div>

      {type === "transfer" && (
        <div>
          <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">To shop *</label>
          <select name="to_shop_id" required className={inputCls}>
            <option value="">— Select destination shop —</option>
            {shops.filter((s) => s.id !== fromShopId).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Reason / notes</label>
        <textarea name="reason" rows={3} className={inputCls + " resize-none"} placeholder="Optional context for the owner" />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending || !pieceId}
          className="px-4 py-2 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit for approval"}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls = "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
