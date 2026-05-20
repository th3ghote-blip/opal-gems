"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  marketing_consent: boolean;
}

export function CustomerEditor({ initial, canEdit }: { initial: Customer; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      full_name: String(fd.get("full_name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      address: String(fd.get("address") ?? "").trim() || null,
      notes: String(fd.get("notes") ?? "").trim() || null,
      marketing_consent: fd.get("consent") === "on",
    };
    start(async () => {
      const res = await fetch(`/api/customers/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Full name"><input name="full_name" required defaultValue={initial.full_name} className={inputCls} /></Field>
        <Field label="Phone">    <input name="phone" defaultValue={initial.phone ?? ""} className={inputCls} /></Field>
        <Field label="Email">    <input name="email" type="email" defaultValue={initial.email ?? ""} className={inputCls} /></Field>
        <Field label="Address">  <input name="address" defaultValue={initial.address ?? ""} className={inputCls} /></Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea name="notes" rows={2} defaultValue={initial.notes ?? ""} className={inputCls + " resize-none"} />
          </Field>
        </div>
        <label className="sm:col-span-2 flex items-center gap-2 text-xs">
          <input type="checkbox" name="consent" defaultChecked={initial.marketing_consent} />
          Marketing consent
        </label>
        <div className="sm:col-span-2 flex gap-2">
          <button type="submit" disabled={pending} className="px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">Cancel</button>
          {err && <span className="text-sm text-red-600 self-center">{err}</span>}
        </div>
      </form>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <D label="Phone"    value={initial.phone} />
          <D label="Email"    value={initial.email} />
          <D label="Address"  value={initial.address} className="col-span-2" />
          <D label="Notes"    value={initial.notes}   className="col-span-2" />
          <D label="Consent"  value={initial.marketing_consent ? "Yes" : "No"} />
        </div>
        {canEdit && (
          <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700">
            Edit
          </button>
        )}
      </div>
    </section>
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

function D({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}
