import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { PieceForm } from "@/components/PieceForm";

export const dynamic = "force-dynamic";

export default async function NewPiecePage() {
  const profile = (await getCurrentProfile())!;
  if (profile.role === "staff") redirect("/pieces");

  const supabase = createClient();
  const [{ data: shops }, { data: enumRows }] = await Promise.all([
    supabase.from("shops").select("id, name").eq("active", true).order("name"),
    supabase.from("enum_values").select("enum_name, value").eq("active", true).order("sort_order"),
  ]);

  const enums: Record<string, { value: string }[]> = {};
  for (const row of enumRows ?? []) {
    (enums[row.enum_name] ??= []).push({ value: row.value });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New piece</h1>
        <p className="text-sm text-neutral-500">Add a piece to the inventory.</p>
      </header>
      <PieceForm
        mode="new"
        initial={{ current_shop_id: profile.default_shop_id ?? null, status: "in_stock" }}
        shops={shops ?? []}
        enums={enums}
        isOwner={profile.role === "owner"}
      />
    </div>
  );
}
