import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  sale_recorded:        "Sale recorded",
  sale_reassigned:      "Sale reassigned",
  piece_added:          "Piece added",
  piece_edited:         "Piece edited",
  movement_requested:   "Movement requested",
  movement_approved:    "Movement approved",
  movement_denied:      "Movement denied",
  movement_cancelled:   "Movement cancelled",
  stock_count_started:  "Stock count started",
  stock_count_completed:"Stock count completed",
  stock_count_cancelled:"Stock count cancelled",
  pieces_imported:      "Pieces imported",
  staff_invited:        "Staff invited",
};

const ACTION_COLORS: Record<string, string> = {
  sale_recorded:        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  sale_reassigned:      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  piece_added:          "bg-gold-100 text-gold-800 dark:bg-gold-900/40 dark:text-gold-300",
  piece_edited:         "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  movement_requested:   "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  movement_approved:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  movement_denied:      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  movement_cancelled:   "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  stock_count_started:  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  stock_count_completed:"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  pieces_imported:      "bg-plum-100 text-plum-800 dark:bg-plum-900/40 dark:text-plum-300",
  staff_invited:        "bg-gold-100 text-gold-800 dark:bg-gold-900/40 dark:text-gold-300",
};

function formatDetails(action: string, details: Record<string, unknown> | null): string {
  if (!details) return "";
  switch (action) {
    case "sale_recorded":
      return [
        details.sku && `SKU ${details.sku}`,
        details.type,
        details.shop,
        details.net_price && `$${Number(details.net_price).toLocaleString("en-US")}`,
        details.discount_pct && Number(details.discount_pct) > 0 && `${details.discount_pct}% off`,
        details.qty && Number(details.qty) > 1 && `×${details.qty}`,
      ].filter(Boolean).join(" · ");
    case "piece_added":
    case "piece_edited":
      return [details.sku && `SKU ${details.sku}`, details.type, details.price && `$${Number(details.price).toLocaleString("en-US")}`].filter(Boolean).join(" · ");
    case "pieces_imported":
      return `${details.inserted ?? 0} pieces`;
    case "movement_requested":
      return `${details.movement_type}`.replace("_", " ");
    case "staff_invited":
      return [details.full_name, details.role].filter(Boolean).join(" · ");
    case "stock_count_started":
      return details.expected ? `${details.expected} expected` : "";
    default:
      return "";
  }
}

export default async function ActivityPage({ searchParams }: { searchParams: { user?: string } }) {
  const profile = (await getCurrentProfile())!;
  if (profile.role !== "owner") redirect("/dashboard");

  const supabase = createClient();

  let q = supabase
    .from("activity_log")
    .select("id, action, entity_type, entity_id, shop_id, details, created_at, profile_id, profiles!profile_id(full_name), shops!shop_id(name)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (searchParams.user) q = q.eq("profile_id", searchParams.user);

  const [{ data: logs }, { data: staff }] = await Promise.all([
    q,
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-neutral-500">All user actions — most recent first</p>
        </div>

        {/* User filter */}
        <form method="GET" className="flex items-center gap-2">
          <select
            name="user"
            defaultValue={searchParams.user ?? ""}
            onChange={(e) => { (e.target.form as HTMLFormElement).submit(); }}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm"
          >
            <option value="">All users</option>
            {(staff ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
          {searchParams.user && (
            <a href="/activity" className="text-xs text-neutral-500 hover:underline">Clear</a>
          )}
        </form>
      </header>

      {(!logs || logs.length === 0) ? (
        <div className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center text-sm text-neutral-500">
          No activity logged yet. Actions will appear here as staff use the app.
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="text-left px-3 py-2 whitespace-nowrap">Date / Time</th>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Action</th>
                <th className="text-left px-3 py-2">Shop</th>
                <th className="text-left px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {(logs as unknown as {
                id: string;
                action: string;
                entity_id: string | null;
                shop_id: string | null;
                details: Record<string, unknown> | null;
                created_at: string;
                profile_id: string;
                profiles: { full_name: string } | null;
                shops: { name: string } | null;
              }[]).map((row) => {
                const label = ACTION_LABELS[row.action] ?? row.action.replace(/_/g, " ");
                const color = ACTION_COLORS[row.action] ?? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
                const dt = new Date(row.created_at);
                return (
                  <tr key={row.id} className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                    <td className="px-3 py-2 text-xs text-neutral-500 whitespace-nowrap">
                      {dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      <br />
                      <span className="text-neutral-400">{dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{row.profiles?.full_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-500">{row.shops?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">{formatDetails(row.action, row.details)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
