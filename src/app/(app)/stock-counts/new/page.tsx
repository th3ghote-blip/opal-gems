import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { NewCountForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewCountPage() {
  const profile = (await getCurrentProfile())!;
  if (profile.role === "staff") redirect("/stock-counts");
  const supabase = createClient();
  const { data: shops } = await supabase.from("shops").select("id, name").eq("active", true).order("name");
  return (
    <div className="space-y-6 max-w-md">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Start stock count</h1>
        <p className="text-sm text-neutral-500">Snapshot what should be in the shop, then walk through and tick what you find.</p>
      </header>
      <NewCountForm shops={shops ?? []} />
    </div>
  );
}
