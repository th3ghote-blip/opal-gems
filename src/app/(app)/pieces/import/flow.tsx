"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Shop {
  id: string;
  name: string;
}

interface PreviewRow {
  sku: string;
  description: string;
  type: string;
  ctw: number | null;
  price: number | null;
  status: "ok" | "skip" | "error";
  issues: string[];
}

interface Summary {
  total: number;
  valid: number;
  skipped: number;
  errors: number;
}

export function ImportFlow({ shops, defaultShopId }: { shops: Shop[]; defaultShopId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [shopId, setShopId] = useState(defaultShopId);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [committed, setCommitted] = useState(false);
  const [insertedCount, setInsertedCount] = useState(0);

  function parseInput(): { source: "url" | "csv"; url?: string; csv?: string } | null {
    const text = input.trim();
    if (!text) return null;
    if (text.startsWith("http://") || text.startsWith("https://")) return { source: "url", url: text };
    return { source: "csv", csv: text };
  }

  function doPreview() {
    setErr(null);
    setCommitted(false);
    const parsed = parseInput();
    if (!parsed) { setErr("Paste a Google Sheets URL or CSV content"); return; }
    if (!shopId) { setErr("Pick a shop"); return; }
    start(async () => {
      const res = await fetch("/api/pieces/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed, shop_id: shopId, dry_run: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      setPreview(j.preview);
      setSummary(j.summary);
    });
  }

  function doCommit() {
    setErr(null);
    const parsed = parseInput();
    if (!parsed) return;
    if (!confirm(`Import ${summary?.valid ?? 0} pieces into ${shops.find((s) => s.id === shopId)?.name}?`)) return;
    start(async () => {
      const res = await fetch("/api/pieces/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed, shop_id: shopId, dry_run: false }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      setCommitted(true);
      setInsertedCount(j.inserted);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="sm:col-span-2 block">
          <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Google Sheets URL or paste CSV</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit"
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Google Sheets must be shared as <em>Anyone with the link can view</em>.
          </p>
        </label>
        <label className="block">
          <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Target shop</span>
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          >
            <option value="">— Select shop —</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-neutral-500">All imported pieces land here.</p>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={doPreview}
          disabled={pending}
          className="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm font-medium disabled:opacity-50"
        >
          {pending && !preview ? "Parsing…" : "Preview"}
        </button>
        {preview && summary && summary.valid > 0 && !committed && (
          <button
            onClick={doCommit}
            disabled={pending}
            className="px-4 py-2 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Importing…" : `Import ${summary.valid} pieces`}
          </button>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {committed && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm">
          ✓ Imported <strong>{insertedCount}</strong> pieces. <a href="/pieces" className="underline">Go to pieces →</a>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-4 gap-2 text-sm">
          <Stat label="Rows"     value={summary.total} />
          <Stat label="Valid"    value={summary.valid}   tone={summary.valid > 0 ? "ok" : undefined} />
          <Stat label="Skipped"  value={summary.skipped} tone={summary.skipped > 0 ? "warn" : undefined} />
          <Stat label="Errors"   value={summary.errors}  tone={summary.errors > 0 ? "err" : undefined} />
        </div>
      )}

      {preview && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-900">
              <tr>
                <th className="text-left  px-3 py-2">SKU</th>
                <th className="text-left  px-3 py-2">Name</th>
                <th className="text-left  px-3 py-2">Type</th>
                <th className="text-right px-3 py-2">CTW</th>
                <th className="text-right px-3 py-2">Price</th>
                <th className="text-left  px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-3 py-2 font-mono text-xs">{r.sku || "—"}</td>
                  <td className="px-3 py-2">{r.description || "—"}</td>
                  <td className="px-3 py-2">{r.type || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.ctw ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.price ? `$${r.price.toLocaleString("en-US")}` : "—"}</td>
                  <td className="px-3 py-2">
                    {r.status === "ok"   && <span className="text-emerald-700 dark:text-emerald-400 text-xs">✓ ok</span>}
                    {r.status === "skip" && <span className="text-amber-700 dark:text-amber-400 text-xs">⊘ {r.issues.join(", ")}</span>}
                    {r.status === "error" && <span className="text-red-700 dark:text-red-400 text-xs">✗ {r.issues.join(", ")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "err" }) {
  const color = tone === "ok" ? "text-emerald-700 dark:text-emerald-400"
    : tone === "warn" ? "text-amber-700 dark:text-amber-400"
    : tone === "err" ? "text-red-700 dark:text-red-400"
    : "";
  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-2">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
