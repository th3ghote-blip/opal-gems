"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  full_name: string;
  role: "owner" | "manager" | "staff";
  default_shop_id: string | null;
  commission_pct: number;
  active: boolean;
  phone: string | null;
}

interface Shop {
  id: string;
  name: string;
}

export function StaffTab({ profiles, shops }: { profiles: Profile[]; shops: Shop[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function update(id: string, patch: Partial<Profile> & { email?: string }) {
    setErr(null);
    start(async () => {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error ?? `HTTP ${res.status}`);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <InviteForm shops={shops} onDone={() => router.refresh()} />

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Shop</th>
              <th className="text-left px-3 py-2">Comm %</th>
              <th className="text-left px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-3 py-2">{p.full_name}</td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={p.role}
                    onChange={(e) => update(p.id, { role: e.target.value as Profile["role"] })}
                    className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
                  >
                    <option value="staff">staff</option>
                    <option value="manager">manager</option>
                    <option value="owner">owner</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    defaultValue={p.default_shop_id ?? ""}
                    onChange={(e) => update(p.id, { default_shop_id: e.target.value || null })}
                    className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
                  >
                    <option value="">—</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 w-20">
                  <input
                    type="number"
                    step="0.5"
                    defaultValue={p.commission_pct}
                    onBlur={(e) => update(p.id, { commission_pct: Number(e.target.value) })}
                    className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    defaultChecked={p.active}
                    onChange={(e) => update(p.id, { active: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {pending && <p className="text-xs text-neutral-500">Saving…</p>}
    </div>
  );
}

function InviteForm({ shops, onDone }: { shops: Shop[]; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      email: String(fd.get("email") ?? "").trim(),
      full_name: String(fd.get("full_name") ?? "").trim(),
      role: String(fd.get("role") ?? "staff") as "staff" | "manager" | "owner",
      default_shop_id: (String(fd.get("default_shop_id") ?? "") || null) as string | null,
    };
    start(async () => {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? `HTTP ${res.status}`);
        return;
      }
      setMsg(`Added ${body.full_name}. They can now sign in at /login with their email.`);
      onDone();
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <details className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
      <summary className="cursor-pointer text-sm font-medium">+ Invite new staff</summary>
      <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input name="full_name" required placeholder="Full name" className={inputCls} />
        <input name="email"     required type="email" placeholder="email@example.com" className={inputCls} />
        <select name="role" defaultValue="staff" className={inputCls}>
          <option value="staff">staff</option>
          <option value="manager">manager</option>
          <option value="owner">owner</option>
        </select>
        <select name="default_shop_id" className={inputCls}>
          <option value="">— No shop —</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 text-sm disabled:opacity-50">
            {pending ? "Adding…" : "Add staff"}
          </button>
          {err && <span className="text-sm text-red-600">{err}</span>}
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        </div>
      </form>
    </details>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
