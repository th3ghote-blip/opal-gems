"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { shortDate } from "@/lib/format";

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  sales_count: number;
}

export function CustomersList({ initial, q }: { initial: Customer[]; q: string }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      full_name: String(fd.get("full_name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      address: String(fd.get("address") ?? "").trim() || null,
      marketing_consent: fd.get("consent") === "on",
    };
    if (!body.full_name) {
      setErr("Name required.");
      return;
    }
    start(async () => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      setShowAdd(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <form className="flex-1" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name / phone / email…"
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          />
        </form>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="px-3 py-2 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm whitespace-nowrap"
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <form onSubmit={onAdd} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input name="full_name" required placeholder="Full name *" className={inputCls} />
          <input name="phone"     placeholder="Phone"   className={inputCls} />
          <input name="email" type="email" placeholder="Email" className={inputCls} />
          <input name="address"   placeholder="Address" className={inputCls} />
          <label className="sm:col-span-2 flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <input type="checkbox" name="consent" /> Customer consents to marketing follow-up
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm disabled:opacity-50">
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">Cancel</button>
            {err && <span className="text-sm text-red-600 self-center">{err}</span>}
          </div>
        </form>
      )}

      {initial.length === 0 ? (
        <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
          No customers yet.
        </p>
      ) : (
        <ul className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
          {initial.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {c.full_name}
                    {c.sales_count > 1 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Repeat ×{c.sales_count}</span>}
                  </div>
                  <div className="text-xs text-neutral-500 truncate">
                    {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <span className="text-xs text-neutral-500 whitespace-nowrap">{shortDate(c.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
