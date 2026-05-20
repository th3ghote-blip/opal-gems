"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

interface Shop { id: string; name: string }
interface TypeOpt { value: string }

export function PiecesFilters({ shops, types }: { shops: Shop[]; types: TypeOpt[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function pushWith(updates: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    start(() => router.push(`/pieces${sp.toString() ? `?${sp.toString()}` : ""}`));
  }

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => {
      if (q !== (params.get("q") ?? "")) pushWith({ q });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const inputCls = "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm";

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search SKU"
        className={`flex-1 min-w-[160px] ${inputCls}`}
        autoComplete="off"
      />
      <select
        value={params.get("shop") ?? ""}
        onChange={(e) => pushWith({ shop: e.target.value })}
        className={inputCls}
      >
        <option value="">All shops</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select
        value={params.get("type") ?? ""}
        onChange={(e) => pushWith({ type: e.target.value })}
        className={inputCls}
      >
        <option value="">All types</option>
        {types.map((t) => (
          <option key={t.value} value={t.value}>{t.value}</option>
        ))}
      </select>
      <select
        value={params.get("status") ?? ""}
        onChange={(e) => pushWith({ status: e.target.value })}
        className={inputCls}
      >
        <option value="">All status</option>
        <option value="in_stock">In stock</option>
        <option value="reserved">Reserved</option>
        <option value="sold">Sold</option>
        <option value="in_transit">In transit</option>
        <option value="written_off">Written off</option>
      </select>
      {(params.get("q") || params.get("shop") || params.get("type") || params.get("status")) && (
        <button
          type="button"
          onClick={() => { setQ(""); router.push("/pieces"); }}
          className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
        >
          Clear
        </button>
      )}
    </div>
  );
}
