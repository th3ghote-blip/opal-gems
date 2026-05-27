import { redirect } from "next/navigation";
import { createClient, getCurrentProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsTab } from "./settings-tab";
import { StaffTab } from "./staff-tab";
import { ShopsTab } from "./shops-tab";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { tab?: string };
}

export default async function SettingsPage({ searchParams }: Props) {
  const profile = (await getCurrentProfile())!;
  if (profile.role !== "owner") redirect("/dashboard");

  const tab = searchParams.tab ?? "settings";
  const supabase = createClient();

  const admin = createAdminClient();

  const [{ data: settings }, { data: shops }, { data: profiles }, { data: profileShopsRaw }, authUsers] = await Promise.all([
    supabase.from("settings").select("key, value").order("key"),
    supabase.from("shops").select("id, name, hotel_name, address, manager_id, hotel_commission_pct, sales_tax_pct, active").order("name"),
    supabase.from("profiles").select("id, full_name, role, default_shop_id, commission_pct, active, phone").order("full_name"),
    supabase.from("profile_shops").select("profile_id, shop_id"),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);

  // Build email map from auth.users
  const emailById: Record<string, string> = {};
  for (const u of authUsers.data?.users ?? []) {
    emailById[u.id] = u.email ?? "";
  }

  // Build shop_ids map: profile_id → shop_id[]
  const shopIdsByProfile: Record<string, string[]> = {};
  for (const row of profileShopsRaw ?? []) {
    if (!shopIdsByProfile[row.profile_id]) shopIdsByProfile[row.profile_id] = [];
    shopIdsByProfile[row.profile_id].push(row.shop_id);
  }
  const profilesWithShops = (profiles ?? []).map((p) => ({
    ...p,
    shop_ids: shopIdsByProfile[p.id] ?? [],
    email: emailById[p.id] ?? "",
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-500">Configure pricing, staff, and shops.</p>
      </header>

      <nav className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        <TabLink href="/settings?tab=settings" active={tab === "settings"}>General</TabLink>
        <TabLink href="/settings?tab=staff"    active={tab === "staff"}>Staff</TabLink>
        <TabLink href="/settings?tab=shops"    active={tab === "shops"}>Shops</TabLink>
      </nav>

      {tab === "settings" && <SettingsTab rows={settings ?? []} />}
      {tab === "staff"    && <StaffTab profiles={profilesWithShops} shops={shops ?? []} />}
      {tab === "shops"    && <ShopsTab shops={shops ?? []} profiles={profiles ?? []} />}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`px-3 py-2 text-sm border-b-2 ${
        active
          ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-medium"
          : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      }`}
    >
      {children}
    </a>
  );
}
