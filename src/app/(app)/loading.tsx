// Shown immediately on every (app) navigation while the server fetches data.
// Makes page changes feel instant even when the dashboard/pieces queries run.
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[5/6] rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    </div>
  );
}
