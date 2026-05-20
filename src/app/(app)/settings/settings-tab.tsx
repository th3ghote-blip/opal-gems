"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Row {
  key: string;
  value: unknown;
}

const editable: { key: string; label: string; type: "number" | "string"; help?: string }[] = [
  { key: "staff_commission_pct",         label: "Staff commission %",                      type: "number", help: "Applied to net sale price." },
  { key: "max_no_approval_discount_pct", label: "Max discount % staff can apply silently", type: "number", help: "Anything more requires owner approval." },
  { key: "reservation_default_hours",    label: "Reservation default hours",               type: "number" },
  { key: "owner_phone",                  label: "Owner phone (for WhatsApp alerts)",       type: "string", help: "E.164 format, e.g. +13055551234" },
  { key: "notification_channel",         label: "Notification channel",                    type: "string", help: "'whatsapp' or 'sms'" },
  { key: "company_name",                 label: "Company name",                            type: "string" },
];

export function SettingsTab({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const map = new Map(rows.map((r) => [r.key, r.value]));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const updates: { key: string; value: unknown }[] = [];
    for (const f of editable) {
      const raw = String(fd.get(f.key) ?? "");
      let parsedValue: unknown;
      if (f.type === "number") {
        if (raw.trim() === "") parsedValue = null;
        else {
          const n = Number(raw);
          if (!Number.isFinite(n)) {
            setErr(`"${f.label}" must be a number.`);
            return;
          }
          parsedValue = n;
        }
      } else {
        parsedValue = raw;
      }
      updates.push({ key: f.key, value: parsedValue });
    }
    start(async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setMsg("Saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      {editable.map((f) => {
        const v = map.get(f.key);
        return (
          <div key={f.key}>
            <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">{f.label}</label>
            <input
              name={f.key}
              defaultValue={v == null ? "" : typeof v === "string" ? v : String(v)}
              type={f.type === "number" ? "number" : "text"}
              step={f.type === "number" ? "0.01" : undefined}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            />
            {f.help && <p className="mt-1 text-xs text-neutral-500">{f.help}</p>}
          </div>
        );
      })}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </form>
  );
}
