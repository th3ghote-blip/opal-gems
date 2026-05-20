"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface Movement {
  id: string;
  type: string;
  status: string;
  requested_at: string;
  approved_at: string | null;
  reason: string | null;
  piece_sku: string;
  piece_type: string;
  from_shop: string | null;
  to_shop: string | null;
  requested_by: string;
  approved_by: string | null;
}

export function MovementRow({
  m,
  isOwner,
  typeLabel,
  statusStyle,
}: {
  m: Movement;
  isOwner: boolean;
  typeLabel: string;
  statusStyle: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function decide(decision: "approved" | "denied") {
    start(async () => {
      const res = await fetch(`/api/movements/${m.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusStyle}`}>{m.status}</span>
          <span className="text-sm font-medium">{typeLabel}</span>
          <span className="text-xs font-mono text-neutral-500">{m.piece_sku}</span>
          <span className="text-xs text-neutral-600 dark:text-neutral-400">{m.piece_type}</span>
        </div>
        <div className="text-xs text-neutral-500 mt-0.5">
          {[m.from_shop, m.to_shop].filter(Boolean).join(" → ")}
          {" · "}
          requested by {m.requested_by}
        </div>
        {m.reason && <div className="text-xs text-neutral-500 mt-0.5 italic">&ldquo;{m.reason}&rdquo;</div>}
      </div>
      {isOwner && (
        <div className="flex gap-1.5 shrink-0">
          <button
            disabled={pending}
            onClick={() => decide("approved")}
            className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-600 text-white disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={pending}
            onClick={() => decide("denied")}
            className="px-2.5 py-1 rounded text-xs font-medium bg-red-600 text-white disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      )}
    </li>
  );
}
