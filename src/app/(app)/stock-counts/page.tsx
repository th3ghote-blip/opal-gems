import Link from "next/link";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const statusStyle: Record<string, string> = {
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  completed:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled:   "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

interface CountRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  shops: { name: string } | null;
  profiles: { full_name: string } | null;
}

export default async function StockCountsPage() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();
  const { data } = await supabase
    .from("stock_counts")
    .select(`
      id, started_at, completed_at, status,
      shops!shop_id (name),
      profiles!started_by (full_name)
    `)
    .order("started_at", { ascending: false })
    .limit(40);

  const counts = (data ?? []) as unknown as CountRow[];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Stock counts</h1>
        {profile.role !== "staff" && (
          <Link href="/stock-counts/new" className="text-sm px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">
            + Start count
          </Link>
        )}
      </header>

      {counts.length === 0 ? (
        <p className="text-sm text-neutral-500 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
          No counts yet. Run one monthly per shop to catch shrinkage.
        </p>
      ) : (
        <ul className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
          {counts.map((c) => (
            <li key={c.id}>
              <Link href={`/stock-counts/${c.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusStyle[c.status]}`}>{c.status.replace("_", " ")}</span>
                    <span className="text-sm font-medium">{c.shops?.name}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    started by {c.profiles?.full_name} · {shortDate(c.started_at)}
                    {c.completed_at && ` · completed ${shortDate(c.completed_at)}`}
                  </div>
                </div>
                <span className="text-neutral-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
