import Link from "next/link";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { shortDate } from "@/lib/format";
import { MovementRow } from "./movement-row";

export const dynamic = "force-dynamic";

const typeLabels: Record<string, string> = {
  transfer: "Transfer",
  pull: "Pull",
  restock: "Restock",
  write_off: "Write-off",
};

const statusStyles: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved:  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  denied:    "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

interface MovementJoined {
  id: string;
  movement_type: string;
  approval_status: string;
  requested_at: string;
  approved_at: string | null;
  reason: string | null;
  notes: string | null;
  pieces: { sku: string; type: string } | null;
  from_shop: { name: string } | null;
  to_shop: { name: string } | null;
  requested_by_profile: { full_name: string } | null;
  approved_by_profile: { full_name: string } | null;
}

export default async function MovementsPage() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  const { data: movements } = await supabase
    .from("movements")
    .select(`
      id, movement_type, approval_status, requested_at, approved_at, reason, notes,
      pieces!piece_id (sku, type),
      from_shop:shops!from_shop_id (name),
      to_shop:shops!to_shop_id (name),
      requested_by_profile:profiles!requested_by (full_name),
      approved_by_profile:profiles!approved_by (full_name)
    `)
    .order("requested_at", { ascending: false })
    .limit(100);

  const list = (movements ?? []) as unknown as MovementJoined[];
  const pending = list.filter((m) => m.approval_status === "pending");
  const others = list.filter((m) => m.approval_status !== "pending");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movements</h1>
          <p className="text-sm text-neutral-500">Transfers, pulls, and write-offs.</p>
        </div>
        <Link href="/movements/new" className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">
          + New
        </Link>
      </header>

      <section>
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          Pending {pending.length > 0 && <span className="ml-1 text-amber-600">({pending.length})</span>}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
            No pending movements.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((m) => (
              <MovementRow
                key={m.id}
                m={{
                  id: m.id,
                  type: m.movement_type,
                  status: m.approval_status,
                  requested_at: m.requested_at,
                  approved_at: m.approved_at,
                  reason: m.reason,
                  piece_sku: m.pieces?.sku ?? "—",
                  piece_type: m.pieces?.type ?? "",
                  from_shop: m.from_shop?.name ?? null,
                  to_shop: m.to_shop?.name ?? null,
                  requested_by: m.requested_by_profile?.full_name ?? "—",
                  approved_by: m.approved_by_profile?.full_name ?? null,
                }}
                isOwner={profile.role === "owner"}
                typeLabel={typeLabels[m.movement_type] ?? m.movement_type}
                statusStyle={statusStyles[m.approval_status]}
              />
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Recent</h2>
          <ul className="space-y-2">
            {others.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 text-sm flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusStyles[m.approval_status]}`}>
                      {m.approval_status}
                    </span>
                    <span className="font-medium">{typeLabels[m.movement_type]}</span>
                    <span className="font-mono text-neutral-500 text-xs">{m.pieces?.sku}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {[m.from_shop?.name, m.to_shop?.name].filter(Boolean).join(" → ")}
                    {" · "}
                    by {m.requested_by_profile?.full_name}
                    {m.approved_by_profile && ` · ${m.approval_status} by ${m.approved_by_profile.full_name}`}
                  </div>
                </div>
                <span className="text-xs text-neutral-500 whitespace-nowrap">{shortDate(m.requested_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
