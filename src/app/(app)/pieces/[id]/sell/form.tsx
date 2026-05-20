"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Piece {
  id: string;
  sku: string;
  type: string;
  original_price: number;
  sale_price: number;
  current_shop_id: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  role: "owner" | "manager" | "staff";
  default_shop_id: string | null;
  commission_pct: number;
  active: boolean;
}

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface Props {
  piece: Piece;
  currentUser: Profile;
  staff: Profile[];
  paymentMethods: string[];
  maxNoApprovalDiscount: number;
  defaultCommissionPct: number;
}

export function SellForm({
  piece,
  currentUser,
  staff,
  paymentMethods,
  maxNoApprovalDiscount,
  defaultCommissionPct,
}: Props) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [discountPct, setDiscountPct] = useState(0);
  const [staffId, setStaffId] = useState(currentUser.id);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);

  // Customer search (debounced) — uses RLS read access for authenticated users.
  useEffect(() => {
    if (customer || customerQuery.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      const term = customerQuery.trim();
      const { data } = await sb
        .from("customers")
        .select("id, full_name, phone, email, address")
        .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(8);
      setCustomerResults(data ?? []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [customerQuery, customer, sb]);

  const grossPrice = piece.sale_price;
  const netPrice = +(grossPrice * (1 - discountPct / 100)).toFixed(2);
  const selectedStaff = staff.find((s) => s.id === staffId) ?? currentUser;
  const commissionPct = selectedStaff.commission_pct ?? defaultCommissionPct;
  const commissionAmount = +(netPrice * (commissionPct / 100)).toFixed(2);
  const overThreshold = discountPct > maxNoApprovalDiscount;
  const isOwner = currentUser.role === "owner";

  async function quickAddCustomer(e: React.FormEvent<HTMLFormElement>) {
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
      setErr("Customer name is required.");
      return;
    }
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json.error ?? `HTTP ${res.status}`);
      return;
    }
    setCustomer({ id: json.id, full_name: body.full_name, phone: body.phone, email: body.email, address: body.address });
    setShowQuickAdd(false);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      piece_id: piece.id,
      customer_id: customer?.id ?? null,
      staff_id: staffId,
      discount_pct: discountPct,
      payment_method: String(fd.get("payment_method") ?? "") || null,
      notes: String(fd.get("notes") ?? "").trim() || null,
      reason: String(fd.get("discount_reason") ?? "").trim() || null,
    };
    start(async () => {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? `HTTP ${res.status}`);
        return;
      }
      if (json.kind === "discount_request") {
        setMsg("Discount request sent to owner. The sale will be completed once approved.");
        setTimeout(() => router.push(`/pieces/${piece.id}`), 1500);
      } else {
        router.push(`/pieces/${piece.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <div className="text-xs uppercase tracking-wide text-neutral-500">Customer</div>
        {customer ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{customer.full_name}</div>
              <div className="text-xs text-neutral-500">
                {[customer.phone, customer.email].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            <button type="button" onClick={() => setCustomer(null)} className="text-xs text-neutral-500 hover:underline">change</button>
          </div>
        ) : showQuickAdd ? (
          <div className="space-y-2">
            <form onSubmit={quickAddCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input name="full_name" required placeholder="Full name *" className={inputCls} />
              <input name="phone"      placeholder="Phone"  className={inputCls} />
              <input name="email" type="email" placeholder="Email" className={inputCls} />
              <input name="address"    placeholder="Address" className={inputCls} />
              <label className="sm:col-span-2 flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <input type="checkbox" name="consent" /> Customer consents to marketing follow-up
              </label>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 text-sm">Save customer</button>
                <button type="button" onClick={() => setShowQuickAdd(false)} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className={inputCls}
            />
            {customerQuery && (
              <div className="rounded-md border border-neutral-200 dark:border-neutral-800 max-h-48 overflow-y-auto">
                {searching && <div className="text-xs text-neutral-500 p-2">Searching…</div>}
                {!searching && customerResults.length === 0 && (
                  <div className="text-xs text-neutral-500 p-2">No matches.</div>
                )}
                {customerResults.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => { setCustomer(c); setCustomerQuery(""); setCustomerResults([]); }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-neutral-500">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</div>
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setShowQuickAdd(true)} className="text-xs text-neutral-600 hover:underline">+ Add new customer</button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <div className="text-xs uppercase tracking-wide text-neutral-500">Pricing</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Tag price"     value={fmt(grossPrice)} />
          <Stat label="Net price"     value={fmt(netPrice)} accent={overThreshold ? "amber" : undefined} />
          <Stat label="Commission %"  value={`${commissionPct}%`} />
          <Stat label="Commission $"  value={fmt(commissionAmount)} />
        </div>

        <div>
          <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Discount %</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
            className={inputCls}
          />
          {overThreshold && !isOwner && (
            <p className="mt-1 text-xs text-amber-600">
              Above {maxNoApprovalDiscount}% — requires owner approval. Sale will queue as a request.
            </p>
          )}
          {overThreshold && (
            <div className="mt-2">
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Reason for higher discount</label>
              <input name="discount_reason" className={inputCls} placeholder="e.g. honeymoon couple, repeat customer" />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <div className="text-xs uppercase tracking-wide text-neutral-500">Details</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Salesperson">
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputCls}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment method">
            <select name="payment_method" defaultValue="" className={inputCls}>
              <option value="">—</option>
              {paymentMethods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea name="notes" rows={2} className={inputCls + " resize-none"} placeholder="Optional" />
        </Field>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Recording…" : overThreshold && !isOwner ? "Request approval" : "Record sale"}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">
          Cancel
        </button>
      </div>
    </form>
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: "amber" }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-base font-medium tabular-nums ${accent === "amber" ? "text-amber-600" : ""}`}>{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
