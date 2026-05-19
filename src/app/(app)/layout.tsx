import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (!profile.active) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Account pending approval</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Your account ({profile.full_name}) exists, but the owner needs to activate it before you can use the app.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <NavBar role={profile.role} fullName={profile.full_name} />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
    </>
  );
}
