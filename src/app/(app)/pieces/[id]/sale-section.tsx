"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

interface SaleRow {
  id: string;
  sale_date: string;
  net_price: number | string;
  gross_price: number | string;
  discount_pct: number | string;
  staff_commission_amount: number | string;
  payment_method: string | null;
  notes: string | null;
  staff_id: string;
  profiles: { full_name: string } | null;
}

interface StaffOption {
  id: string;
  full_name: string;
}

export function SaleSection({
  sales,
  staffOptions,
  isOwner,
}: {
  sales: SaleRow[];
  staffOptions: StaffOption[];
  isOwner: boolean;
}) {
  if (sales.length === 0) return null;

  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-900 text-xs font-medium text-neutral-500">
        Sale{sales.length > 1 ? "s" : ""}
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {sales.map((s) => (
          <SaleRow key={s.id} sale={s} staffOptions={staffOptions} isOwner={isOwner} />
        ))}
      </div>
    </section>
  );
}

function SaleRow({
  sale,
  staffOptions,
  isOwner,
}: {
  sale: SaleRow;
  staffOptions: StaffOption[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function changeStaff(newStaffId: string) {
    if (newStaffId === sale.staff_id) return;
    setErr(null);
    start(async () => {
      const res = await fetch(`/api/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staff_id: newStaffId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      router.refresh();
    });
  }

  const date = new Date(sale.sale_date).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  const discount = Number(sale.discount_pct);

  return (
    <div className="px-4 py-3 text-sm space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold tabular-nums">{money(sale.net_price)}</span>
            {discount > 0 && (
              <span className="text-xs text-neutral-500">
                ({discount}% off {money(sale.gross_price)})
              </span>
            )}
            {sale.payment_method && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                {sale.payment_method}
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-500">{date}</div>
        </div>

        {/* Seller */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Sold by</span>
          {isOwner ? (
            <select
              defaultValue={sale.staff_id}
              disabled={pending}
              onChange={(e) => changeStaff(e.target.value)}
              className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm disabled:opacity-50"
            >
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          ) : (
            <span>{sale.profiles?.full_name ?? "—"}</span>
          )}
          {pending && <span className="text-xs text-neutral-400">Saving…</span>}
        </div>
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}

      {sale.notes && (
        <p className="text-xs text-neutral-500 italic">{sale.notes}</p>
      )}

      {isOwner && (
        <div className="text-xs text-neutral-400">
          Commission: {money(sale.staff_commission_amount)}
        </div>
      )}
    </div>
  );
}
