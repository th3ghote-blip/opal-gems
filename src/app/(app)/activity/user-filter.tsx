"use client";

import { useRouter } from "next/navigation";

export function UserFilter({
  staff,
  selected,
}: {
  staff: { id: string; full_name: string }[];
  selected: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => router.push(e.target.value ? `/activity?user=${e.target.value}` : "/activity")}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm"
      >
        <option value="">All users</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>{s.full_name}</option>
        ))}
      </select>
      {selected && (
        <a href="/activity" className="text-xs text-neutral-500 hover:underline">Clear</a>
      )}
    </div>
  );
}
