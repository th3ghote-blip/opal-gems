import { notFound } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { CountRunner } from "./runner";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Piece {
  id: string;
  sku: string;
  type: string;
  status: string;
}

interface Entry {
  piece_id: string;
  was_expected: boolean;
  was_found: boolean;
  notes: string | null;
}

export default async function CountDetail({ params }: { params: { id: string } }) {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  const [countRes, entriesRes] = await Promise.all([
    supabase
      .from("stock_counts")
      .select(`
        id, shop_id, status, started_at, completed_at, notes,
        shops!shop_id (name),
        profiles!started_by (full_name)
      `)
      .eq("id", params.id)
      .single(),
    supabase
      .from("stock_count_entries")
      .select("piece_id, was_expected, was_found, notes")
      .eq("count_id", params.id),
  ]);

  const count = countRes.data;
  if (!count) notFound();

  const entries = (entriesRes.data ?? []) as Entry[];
  const shop = (count.shops as unknown as { name: string } | null) ?? null;
  const starter = (count.profiles as unknown as { full_name: string } | null) ?? null;

  // Load every piece either expected or currently in this shop, so staff can tick.
  const expectedIds = entries.map((e) => e.piece_id);
  const { data: pieces } = await supabase
    .from("pieces")
    .select("id, sku, type, status")
    .or(`id.in.(${expectedIds.length ? expectedIds.join(",") : "00000000-0000-0000-0000-000000000000"}),current_shop_id.eq.${count.shop_id}`)
    .order("sku");

  const variance = entries.filter((e) => e.was_expected !== e.was_found).length;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Count · {shop?.name}</h1>
          <p className="text-xs text-neutral-500">
            started by {starter?.full_name} on {shortDate(count.started_at)}
            {count.completed_at && ` · completed ${shortDate(count.completed_at)}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-neutral-500">Variance</div>
          <div className={`text-lg font-semibold tabular-nums ${variance > 0 ? "text-amber-600" : ""}`}>{variance}</div>
        </div>
      </header>

      <CountRunner
        countId={count.id}
        status={count.status}
        pieces={(pieces ?? []) as Piece[]}
        entries={entries}
        canEdit={profile.role !== "staff" || count.status === "in_progress"}
      />
    </div>
  );
}
