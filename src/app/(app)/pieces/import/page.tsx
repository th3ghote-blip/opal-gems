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
          Paste a Google Sheets URL or raw CSV. Preview, then commit. Existing SKUs are skipped — re-running is safe.
        </p>
      </header>
      <ImportFlow shops={shops ?? []} defaultShopId={"auto"} />
    </div>
  );
}
