"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

interface Shop { id: string; name: string }
interface TypeOpt { value: string }

const METALS = ["White Gold", "Yellow Gold", "Rose Gold", "Silver", "Platinum"];
const KARATS = ["10k", "14k", "18k", "22k"];

export function PiecesFilters({ shops, types, view: viewProp }: { shops: Shop[]; types: TypeOpt[]; view: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, start] = useTransition();

  // Debounced text/number inputs
  const [q,        setQ]        = useState(params.get("q")         ?? "");
  const [priceMin, setPriceMin] = useState(params.get("price_min") ?? "");
  const [priceMax, setPriceMax] = useState(params.get("price_max") ?? "");
  const [ctwMin,   setCtwMin]   = useState(params.get("ctw_min")   ?? "");
  const [ctwMax,   setCtwMax]   = useState(params.get("ctw_max")   ?? "");

  const hasExtended = !!(
    params.get("metal") || params.get("karat") ||
    params.get("price_min") || params.get("price_max") ||
    params.get("ctw_min")   || params.get("ctw_max")
  );
  const [expanded, setExpanded] = useState(hasExtended);

  function pushWith(updates: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v); else sp.delete(k);
    }
    start(() => router.push(`/pieces${sp.toString() ? `?${sp.toString()}` : ""}`));
  }

  // Single debounce for all text/number inputs
  useEffect(() => {
    const id = setTimeout(() => {
      const updates: Record<string, string> = {};
      if (q        !== (params.get("q")         ?? "")) updates.q         = q;
      if (priceMin !== (params.get("price_min") ?? "")) updates.price_min = priceMin;
      if (priceMax !== (params.get("price_max") ?? "")) updates.price_max = priceMax;
      if (ctwMin   !== (params.get("ctw_min")   ?? "")) updates.ctw_min   = ctwMin;
      if (ctwMax   !== (params.get("ctw_max")   ?? "")) updates.ctw_max   = ctwMax;
      if (Object.keys(updates).length) pushWith(updates);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, priceMin, priceMax, ctwMin, ctwMax]);

  // Set cookie so the preference survives navigation (server reads it as fallback)
  function setView(v: string) {
    document.cookie = `pieces_view=${v};path=/;max-age=31536000;SameSite=Lax`;
    pushWith({ view: v });
  }

  const inputCls =
    "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm";
  // Use the server-resolved prop so the button reflects the saved preference
  // even when the URL doesn't carry the ?view= param
  const view = viewProp;
  const hasAnyFilter =
    params.get("q") || params.get("shop") || params.get("type") ||
    params.get("status") || hasExtended;

  function clearAll() {
    setQ(""); setPriceMin(""); setPriceMax(""); setCtwMin(""); setCtwMax("");
    router.push("/pieces");
  }

  return (
    <div className="space-y-2">

      {/* ── Row 1: search + core dropdowns ───────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SKU or name"
          className={`flex-1 min-w-[160px] ${inputCls}`}
          autoComplete="off"
        />
        <select value={params.get("shop") ?? ""}   onChange={(e) => pushWith({ shop: e.target.value })}   className={inputCls}>
          <option value="">All shops</option>
          {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={params.get("type") ?? ""}   onChange={(e) => pushWith({ type: e.target.value })}   className={inputCls}>
          <option value="">All types</option>
          {types.map((t) => <option key={t.value} value={t.value}>{t.value}</option>)}
        </select>
        <select value={params.get("status") ?? ""} onChange={(e) => pushWith({ status: e.target.value })} className={inputCls}>
          <option value="">All status</option>
          <option value="in_stock">In stock</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
          <option value="in_transit">In transit</option>
          <option value="written_off">Written off</option>
        </select>
        {hasAnyFilter && (
          <button type="button" onClick={clearAll}
            className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
            Clear all
          </button>
        )}
      </div>

      {/* ── Row 2: sort + more-filters toggle + view toggle ─ */}
      <div className="flex gap-2 items-center justify-between flex-wrap">
        <div className="flex gap-2 items-center">
          <select value={params.get("sort") ?? "newest"} onChange={(e) => pushWith({ sort: e.target.value })} className={inputCls}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="sku_asc">SKU A→Z</option>
            <option value="sku_desc">SKU Z→A</option>
            <option value="price_asc">Price low→high</option>
            <option value="price_desc">Price high→low</option>
            <option value="type_asc">Type A→Z</option>
            <option value="status">Status</option>
          </select>
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
              hasExtended
                ? "border-gold-500 text-gold-700 dark:text-gold-400 bg-gold-50 dark:bg-gold-950/20 font-medium"
                : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
            }`}
          >
            More filters {hasExtended ? "●" : expanded ? "▲" : "▼"}
          </button>
        </div>

        <div className="flex rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden text-sm">
          <button type="button" onClick={() => setView("grid")} title="Grid view"
            className={`px-3 py-1.5 ${view !== "list" ? "bg-neutral-100 dark:bg-neutral-800 font-medium" : "bg-white dark:bg-neutral-900 text-neutral-500"}`}>
            ⊞
          </button>
          <button type="button" onClick={() => setView("list")} title="List view"
            className={`px-3 py-1.5 border-l border-neutral-300 dark:border-neutral-700 ${view === "list" ? "bg-neutral-100 dark:bg-neutral-800 font-medium" : "bg-white dark:bg-neutral-900 text-neutral-500"}`}>
            ☰
          </button>
        </div>
      </div>

      {/* ── Row 3: extended filters (collapsible) ──────────── */}
      {(expanded || hasExtended) && (
        <div className="flex flex-wrap gap-3 items-end rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 px-3 py-3">

          {/* Metal */}
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">Metal</span>
            <select value={params.get("metal") ?? ""} onChange={(e) => pushWith({ metal: e.target.value })} className={inputCls}>
              <option value="">Any</option>
              {METALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>

          {/* Karat */}
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">Karat</span>
            <select value={params.get("karat") ?? ""} onChange={(e) => pushWith({ karat: e.target.value })} className={inputCls}>
              <option value="">Any</option>
              {KARATS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>

          {/* Price range */}
          <div className="block">
            <span className="block text-xs text-neutral-500 mb-1">Price ($)</span>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" placeholder="min"
                value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                className={`w-[90px] ${inputCls}`}
              />
              <span className="text-xs text-neutral-400">–</span>
              <input
                type="number" min="0" placeholder="max"
                value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                className={`w-[90px] ${inputCls}`}
              />
            </div>
          </div>

          {/* CTW range */}
          <div className="block">
            <span className="block text-xs text-neutral-500 mb-1">CTW</span>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" step="0.01" placeholder="min"
                value={ctwMin} onChange={(e) => setCtwMin(e.target.value)}
                className={`w-[80px] ${inputCls}`}
              />
              <span className="text-xs text-neutral-400">–</span>
              <input
                type="number" min="0" step="0.01" placeholder="max"
                value={ctwMax} onChange={(e) => setCtwMax(e.target.value)}
                className={`w-[80px] ${inputCls}`}
              />
            </div>
          </div>

          {/* Clear extended only */}
          {hasExtended && (
            <button
              type="button"
              onClick={() => {
                setPriceMin(""); setPriceMax(""); setCtwMin(""); setCtwMax("");
                pushWith({ metal: "", karat: "", price_min: "", price_max: "", ctw_min: "", ctw_max: "" });
              }}
              className="self-end text-xs px-2 py-2 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-500"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
