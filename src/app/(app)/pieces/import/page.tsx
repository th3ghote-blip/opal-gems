import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { ImportFlow } from "./flow";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const profile = (await getCurrentProfile())!;
  if (profile.role !== "owner") redirect("/pieces");

  const supabase = createClient();
  const { data: shops } = await supabase.from("shops").select("id, name").eq("active", true).order("name");

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Import inventory</h1>
        <p className="text-sm text-neutral-500">
          Paste a Google Sheets URL or raw CSV. Preview, then commit.
        </p>
      </header>

      {/* Template guide */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Universal format</h2>
          <a
            href="/import-template.csv"
            download
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            ↓ Download template
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left py-1 pr-4 font-medium">Column</th>
                <th className="text-left py-1 pr-4 font-medium">Required</th>
                <th className="text-left py-1 font-medium">Accepted values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {[
                ["SKU",      "✓", "Any text — e.g. DM-001, 493056"],
                ["NAME",     "✓", "Free text description of the piece"],
                ["TYPE",     "✓", "Ring · Necklace · Bracelet · Earrings · Pendant · Choker · Cross · Brooch · Anklet · Chain · Watch"],
                ["METAL",    "—", "White Gold · Yellow Gold · Rose Gold · Silver · Platinum"],
                ["KARAT",    "—", "10k · 14k · 18k · 22k"],
                ["CTW",      "—", "Decimal number, e.g. 1.5"],
                ["PRICE",    "✓", "Retail price — $1,500 or 1500"],
                ["QUANTITY", "—", "Whole number, defaults to 1 if blank"],
                ["LOCATION", "—", "Shop name (partial match OK). Leave blank to assign manually."],
                ["STATUS",   "—", "in_stock (default) · sold"],
              ].map(([col, req, vals]) => (
                <tr key={col}>
                  <td className="py-1.5 pr-4 font-mono font-medium">{col}</td>
                  <td className="py-1.5 pr-4 text-center">{req}</td>
                  <td className="py-1.5 text-neutral-500">{vals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-400">
          Columns can be in any order. Extra columns are ignored. Google Sheets URL must be shared as <em>Anyone with the link can view</em>.
        </p>
      </div>

      <ImportFlow shops={shops ?? []} defaultShopId={"auto"} />
    </div>
  );
}
