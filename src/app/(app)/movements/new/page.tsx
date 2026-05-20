import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { NewMovementForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewMovementPage() {
  const profile = (await getCurrentProfile())!;
  const supabase = createClient();

  // Pieces the user can see (RLS filtered).
  const { data: pieces } = await supabase
    .from("pieces")
    .select("id, sku, type, current_shop_id, status")
    .neq("status", "sold")
    .neq("status", "written_off")
    .order("sku")
    .limit(500);

  const { data: shops } = await supabase.from("shops").select("id, name").eq("active", true).order("name");

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New movement</h1>
        <p className="text-sm text-neutral-500">Request to transfer, pull, or write-off a piece. Owner approval required.</p>
      </header>
      <NewMovementForm
        pieces={pieces ?? []}
        shops={shops ?? []}
        defaultFromShopId={profile.default_shop_id ?? null}
      />
    </div>
  );
}
