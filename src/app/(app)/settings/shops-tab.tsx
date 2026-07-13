"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Shop {
  id: string;
  name: string;
  hotel_name: string | null;
  address: string | null;
  manager_id: string | null;
  hotel_commission_pct: number | null;
  sales_tax_pct: number;
  active: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

export function ShopsTab({ shops, profiles }: { shops: Shop[]; profiles: Profile[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const managers = profiles.filter((p) => p.role === "manager" || p.role === "owner");

  function save(id: string, patch: Partial<Shop>) {
    setErr(null);
    start(async () => {
      const res = await fetch(`/api/shops/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error ?? `HTTP ${res.status}`);
      else router.refresh();
    });
  }

  function addShop(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) {
      setErr("Shop name is required.");
      return;
    }
    const payload = {
      name,
      hotel_name: String(fd.get("hotel_name") ?? "").trim() || null,
      address: String(fd.get("address") ?? "").trim() || null,
      sales_tax_pct: Number(fd.get("sales_tax_pct") ?? 0) || 0,
    };
    start(async () => {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error ?? `HTTP ${res.status}`);
      else {
        setShowAdd(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {showAdd ? (
        <form onSubmit={addShop} className="rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-4 space-y-3">
          <div className="text-sm font-medium">New shop</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Shop name *">
              <input name="name" required autoFocus className={inputCls} placeholder="e.g. Olde Naples Hotel" />
            </Field>
            <Field label="Hotel name">
              <input name="hotel_name" className={inputCls} />
            </Field>
            <Field label="Address">
              <input name="address" className={inputCls} />
            </Field>
            <Field label="Sales tax %">
              <input name="sales_tax_pct" type="number" step="0.01" defaultValue={0} className={inputCls} />
            </Field>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 text-sm disabled:opacity-50"
            >
              Create shop
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-3 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          + Add shop
        </button>
      )}
      {shops.map((s) => (
        <div key={s.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Shop name">
              <input defaultValue={s.name} onBlur={(e) => save(s.id, { name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Hotel name">
              <input defaultValue={s.hotel_name ?? ""} onBlur={(e) => save(s.id, { hotel_name: e.target.value || null })} className={inputCls} />
            </Field>
            <Field label="Address">
              <input defaultValue={s.address ?? ""} onBlur={(e) => save(s.id, { address: e.target.value || null })} className={inputCls} />
            </Field>
            <Field label="Manager">
              <select
                defaultValue={s.manager_id ?? ""}
                onChange={(e) => save(s.id, { manager_id: e.target.value || null })}
                className={inputCls}
              >
                <option value="">— None —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </Field>
            <Field label="Hotel commission % (hidden until set)">
              <input
                type="number"
                step="0.01"
                defaultValue={s.hotel_commission_pct ?? ""}
                onBlur={(e) => save(s.id, { hotel_commission_pct: e.target.value === "" ? null : Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
            <Field label="Sales tax %">
              <input
                type="number"
                step="0.01"
                defaultValue={s.sales_tax_pct}
                onBlur={(e) => save(s.id, { sales_tax_pct: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={s.active} onChange={(e) => save(s.id, { active: e.target.checked })} />
            Active
          </label>
        </div>
      ))}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {pending && <p className="text-xs text-neutral-500">Saving…</p>}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
