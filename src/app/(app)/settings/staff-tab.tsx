"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "manager" | "staff";
  default_shop_id: string | null;
  shop_ids: string[];
  commission_pct: number;
  active: boolean;
  phone: string | null;
  last_sign_in_at: string | null;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Shop {
  id: string;
  name: string;
}

export function StaffTab({ profiles, shops }: { profiles: Profile[]; shops: Shop[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function update(id: string, patch: Record<string, unknown>) {
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
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Shops</th>
              <th className="text-left px-3 py-2">Comm %</th>
              <th className="text-left px-3 py-2">Active</th>
              <th className="text-left px-3 py-2">Last sign-in</th>
              <th className="text-left px-3 py-2">Password</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <ProfileRow key={p.id} p={p} shops={shops} onUpdate={update} />
            ))}
          </tbody>
        </table>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {pending && <p className="text-xs text-neutral-500">Saving…</p>}
    </div>
  );
}

function ProfileRow({
  p,
  shops,
  onUpdate,
}: {
  p: Profile;
  shops: Shop[];
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
}) {
  const [shopIds, setShopIds] = useState<string[]>(p.shop_ids);
  const [newPw, setNewPw] = useState("");

  function toggleShop(shopId: string, checked: boolean) {
    const newIds = checked ? [...shopIds, shopId] : shopIds.filter((id) => id !== shopId);
    setShopIds(newIds);
    onUpdate(p.id, { shop_ids: newIds });
  }

  return (
    <tr className="border-t border-neutral-200 dark:border-neutral-800">
      <td className="px-3 py-2 font-medium">{p.full_name}</td>
      <td className="px-3 py-2 text-xs text-neutral-500">{p.email || "—"}</td>

      {/* Role */}
      <td className="px-3 py-2">
        <select
          defaultValue={p.role}
          onChange={(e) => onUpdate(p.id, { role: e.target.value })}
          className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
        >
          <option value="staff">staff</option>
          <option value="manager">manager</option>
          <option value="owner">owner</option>
        </select>
      </td>

      {/* Shops — checkboxes */}
      <td className="px-3 py-2">
        <div className="flex flex-col gap-1">
          {shops.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={shopIds.includes(s.id)}
                onChange={(e) => toggleShop(s.id, e.target.checked)}
                className="accent-gold-600"
              />
              {s.name}
            </label>
          ))}
        </div>
      </td>

      {/* Commission % */}
      <td className="px-3 py-2 w-20">
        <input
          type="number"
          step="0.5"
          defaultValue={p.commission_pct}
          onBlur={(e) => onUpdate(p.id, { commission_pct: Number(e.target.value) })}
          className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
        />
      </td>

      {/* Active */}
      <td className="px-3 py-2">
        <input
          type="checkbox"
          defaultChecked={p.active}
          onChange={(e) => onUpdate(p.id, { active: e.target.checked })}
        />
      </td>

      {/* Last sign-in */}
      <td className={`px-3 py-2 text-xs whitespace-nowrap ${p.last_sign_in_at ? "text-neutral-500" : "text-amber-600"}`}>
        {relativeTime(p.last_sign_in_at)}
      </td>

      {/* Password reset */}
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <input
            type="password"
            placeholder="New password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-32 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          />
          <button
            disabled={newPw.length < 6}
            onClick={() => { onUpdate(p.id, { password: newPw }); setNewPw(""); }}
            className="px-2 py-1 rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs disabled:opacity-30"
          >
            Set
          </button>
        </div>
      </td>
    </tr>
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
      shop_ids: Array.from(fd.getAll("shop_ids")).map(String),
      password: String(fd.get("password") ?? "").trim() || undefined,
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
        <input name="password" type="password" autoComplete="new-password" placeholder="Password (optional — required if no real email)" className={inputCls} />
        <select name="role" defaultValue="staff" className={inputCls}>
          <option value="staff">staff</option>
          <option value="manager">manager</option>
          <option value="owner">owner</option>
        </select>

        {/* Shop checkboxes */}
        <div>
          <p className="text-xs text-neutral-500 mb-1.5">Shops</p>
          <div className="flex flex-col gap-1.5">
            {shops.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="shop_ids" value={s.id} className="accent-gold-600" />
                {s.name}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 text-sm disabled:opacity-50"
          >
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
