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
  shop_id: string | null;
  profiles: { full_name: string } | null;
}

interface StaffOption {
  id: string;
  full_name: string;
}

interface ShopOption {
  id: string;
  name: string;
}

export function SaleSection({
  sales,
  staffOptions,
  shopOptions,
  isOwner,
}: {
  sales: SaleRow[];
  staffOptions: StaffOption[];
  shopOptions: ShopOption[];
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
          <SaleRow
            key={`${s.id}-${s.net_price}-${s.sale_date}-${s.staff_id}-${s.shop_id}`}
            sale={s}
            staffOptions={staffOptions}
            shopOptions={shopOptions}
            isOwner={isOwner}
          />
        ))}
      </div>
    </section>
  );
}

function SaleRow({
  sale,
  staffOptions,
  shopOptions,
  isOwner,
}: {
  sale: SaleRow;
  staffOptions: StaffOption[];
  shopOptions: ShopOption[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [netPriceInput, setNetPriceInput] = useState(Number(sale.net_price));
  const [dateInput, setDateInput] = useState(sale.sale_date.slice(0, 10));

  function patch(body: Record<string, string | number>) {
    setErr(null);
    start(async () => {
      const res = await fetch(`/api/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `HTTP ${res.status}`); return; }
      router.refresh();
    });
  }

  function changeStaff(newStaffId: string) {
    if (newStaffId === sale.staff_id) return;
    patch({ staff_id: newStaffId });
  }

  function saveDate(val: string) {
    if (!val || val === sale.sale_date.slice(0, 10)) return;
    patch({ sale_date: val });
  }

  function saveNetPrice(val: number) {
    if (!val || val === Number(sale.net_price)) return;
    patch({ net_price: val });
  }

  const discount = Number(sale.discount_pct);

  return (
    <div className="px-4 py-3 text-sm space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Editable net price for owner */}
            {isOwner ? (
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={netPriceInput}
                  onChange={(e) => setNetPriceInput(Number(e.target.value) || 0)}
                  disabled={pending}
                  className="w-28 font-semibold tabular-nums bg-transparent border border-neutral-300 dark:border-neutral-600 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-neutral-400 disabled:opacity-50"
                />
                {netPriceInput !== Number(sale.net_price) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => saveNetPrice(netPriceInput)}
                    className="text-xs px-2 py-0.5 rounded bg-gold-600 hover:bg-gold-700 text-white disabled:opacity-50"
                  >
                    {pending ? "…" : "Save"}
                  </button>
                )}
              </span>
            ) : (
              <span className="font-semibold tabular-nums">{money(sale.net_price)}</span>
            )}
            <span className="text-xs text-neutral-500">
              tag {money(sale.gross_price)}
              {discount > 0 && ` · ${discount}% off`}
            </span>
            {sale.payment_method && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                {sale.payment_method}
              </span>
            )}
          </div>
          {isOwner ? (
            <input
              type="date"
              value={dateInput}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDateInput(e.target.value)}
              onBlur={() => saveDate(dateInput)}
              disabled={pending}
              className="text-xs text-neutral-500 bg-transparent border-b border-dashed border-neutral-300 dark:border-neutral-600 focus:outline-none focus:border-neutral-500"
            />
          ) : (
            <div className="text-xs text-neutral-500">
              {new Date(sale.sale_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </div>
          )}
        </div>

        {/* Shop + Seller */}
        <div className="flex flex-wrap items-center gap-3">
          {isOwner && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">Shop</span>
              <select
                defaultValue={sale.shop_id ?? ""}
                disabled={pending}
                onChange={(e) => patch({ shop_id: e.target.value })}
                className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm disabled:opacity-50"
              >
                {shopOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
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
