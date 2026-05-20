"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Piece {
  id: string;
  sku: string;
  type: string;
  status: string;
}

interface Entry {
  piece_id: string;
  was_expected: boolean;
  was_found: boolean;
  notes: string | null;
}

export function CountRunner({
  countId,
  status,
  pieces,
  entries,
  canEdit,
}: {
  countId: string;
  status: string;
  pieces: Piece[];
  entries: Entry[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Map current state of each piece
  const found = new Map<string, boolean>();
  for (const e of entries) found.set(e.piece_id, e.was_found);

  function tick(pieceId: string, value: boolean) {
    if (status !== "in_progress" || !canEdit) return;
    setErr(null);
    start(async () => {
      const res = await fetch(`/api/stock-counts/${countId}/entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ piece_id: pieceId, was_found: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  function complete() {
    if (!confirm("Complete this count? Variance will be locked in.")) return;
    start(async () => {
      const res = await fetch(`/api/stock-counts/${countId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  const total = pieces.length;
  const counted = pieces.filter((p) => found.has(p.id)).length;
  const missing = pieces.filter((p) => found.get(p.id) === false).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-2 text-center">
          <div className="text-xs text-neutral-500">Expected</div>
          <div className="text-base font-semibold">{total}</div>
        </div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-2 text-center">
          <div className="text-xs text-neutral-500">Counted</div>
          <div className="text-base font-semibold">{counted}</div>
        </div>
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-2 text-center">
          <div className="text-xs text-neutral-500">Missing</div>
          <div className={`text-base font-semibold ${missing > 0 ? "text-amber-600" : ""}`}>{missing}</div>
        </div>
      </div>

      <ul className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
        {pieces.map((p) => {
          const state = found.get(p.id);
          return (
            <li key={p.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm">{p.type}</div>
                <div className="text-xs font-mono text-neutral-500">{p.sku}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  disabled={!canEdit || status !== "in_progress"}
                  onClick={() => tick(p.id, true)}
                  className={`text-xs px-3 py-1 rounded border ${state === true ? "bg-emerald-600 text-white border-emerald-600" : "border-neutral-300 dark:border-neutral-700"}`}
                >
                  Present
                </button>
                <button
                  disabled={!canEdit || status !== "in_progress"}
                  onClick={() => tick(p.id, false)}
                  className={`text-xs px-3 py-1 rounded border ${state === false ? "bg-red-600 text-white border-red-600" : "border-neutral-300 dark:border-neutral-700"}`}
                >
                  Missing
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {status === "in_progress" && (
        <button
          onClick={complete}
          disabled={pending}
          className="px-4 py-2 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Working…" : "Complete count"}
        </button>
      )}
    </div>
  );
}
