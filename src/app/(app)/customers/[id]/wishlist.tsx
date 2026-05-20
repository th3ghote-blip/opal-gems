"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { shortDate } from "@/lib/format";

interface Wish {
  id: string;
  description: string;
  status: string;
  requested_at: string;
  fulfilled_at: string | null;
  notes: string | null;
}

const statusStyles: Record<string, string> = {
  open:      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  fulfilled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

export function WishlistSection({ customerId, items }: { customerId: string; items: Wish[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      customer_id: customerId,
      description: String(fd.get("description") ?? "").trim(),
      notes: String(fd.get("notes") ?? "").trim() || null,
    };
    if (!body.description) { setErr("Describe what they're looking for."); return; }
    start(async () => {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      setAdding(false);
      router.refresh();
    });
  }

  function setStatus(id: string, status: "fulfilled" | "cancelled" | "open") {
    start(async () => {
      const res = await fetch(`/api/wishlist/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
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
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Wishlist</h2>
        <button onClick={() => setAdding((s) => !s)} className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700">
          + Add request
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 mb-3 space-y-2">
          <input name="description" required placeholder="What are they looking for?" className={inputCls} />
          <input name="notes" placeholder="Notes (optional)" className={inputCls} />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm disabled:opacity-50">
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">Cancel</button>
            {err && <span className="text-sm text-red-600 self-center">{err}</span>}
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
          No wishlist entries yet.
        </p>
      ) : (
        <ul className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((w) => (
            <li key={w.id} className="px-3 py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusStyles[w.status]}`}>{w.status}</span>
                  <span className="text-sm">{w.description}</span>
                </div>
                {w.notes && <div className="text-xs text-neutral-500 mt-0.5">{w.notes}</div>}
                <div className="text-xs text-neutral-500 mt-0.5">{shortDate(w.requested_at)}</div>
              </div>
              {w.status === "open" && (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setStatus(w.id, "fulfilled")} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white">Fulfilled</button>
                  <button onClick={() => setStatus(w.id, "cancelled")} className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700">Cancel</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const inputCls = "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
