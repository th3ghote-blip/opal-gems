"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function NewCountForm({ shops }: { shops: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const body = { shop_id: String(fd.get("shop_id") ?? "") };
    if (!body.shop_id) { setErr("Pick a shop."); return; }
    start(async () => {
      const res = await fetch("/api/stock-counts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      router.push(`/stock-counts/${j.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Shop</span>
        <select name="shop_id" required defaultValue="" className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
          <option value="">— Select shop —</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button type="submit" disabled={pending} className="px-4 py-2 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium disabled:opacity-50">
        {pending ? "Starting…" : "Start count"}
      </button>
    </form>
  );
}
