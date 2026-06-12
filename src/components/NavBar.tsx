"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

interface Props {
  role: UserRole;
  fullName: string;
}

const allItems: { href: string; label: string; roles: UserRole[]; icon: string }[] = [
  { href: "/dashboard",    label: "Home",      roles: ["owner", "manager", "staff"], icon: "◆" },
  { href: "/analytics",    label: "Analytics", roles: ["owner"],                     icon: "▲" },
  { href: "/pieces",       label: "Pieces",    roles: ["owner", "manager", "staff"], icon: "◇" },
  { href: "/customers",    label: "Customers", roles: ["owner", "manager", "staff"], icon: "◎" },
  { href: "/movements",    label: "Movements", roles: ["owner", "manager", "staff"], icon: "↔" },
  { href: "/stock-counts", label: "Counts",    roles: ["owner", "manager", "staff"], icon: "▦" },
  { href: "/activity",     label: "Activity",  roles: ["owner"],                     icon: "◈" },
  { href: "/settings",     label: "Settings",  roles: ["owner"],                     icon: "⚙" },
];

export function NavBar({ role, fullName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const items = allItems.filter((i) => i.roles.includes(role));

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Top header — desktop + mobile */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="font-semibold tracking-tight text-gold-600 dark:text-gold-300">Opal Gems</Link>
          <nav className="hidden md:flex gap-1">
            {items.map((i) => {
              const active = pathname?.startsWith(i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    active
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  {i.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-neutral-500">{fullName} · {role}</span>
            <button
              onClick={signOut}
              className="text-xs px-2 py-1 rounded text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-30 bg-white/95 dark:bg-neutral-950/95 backdrop-blur border-t border-neutral-200 dark:border-neutral-800">
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {items.slice(0, 5).map((i) => {
            const active = pathname?.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`flex flex-col items-center justify-center py-2.5 text-[11px] ${
                  active
                    ? "text-neutral-900 dark:text-neutral-100 font-medium"
                    : "text-neutral-500"
                }`}
              >
                <span className="text-base leading-none">{i.icon}</span>
                <span className="mt-0.5">{i.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
