import type { PieceStatus } from "@/lib/types";

const styles: Record<PieceStatus, string> = {
  in_stock:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  reserved:    "bg-amber-100  text-amber-800  dark:bg-amber-950  dark:text-amber-300",
  sold:        "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  in_transit:  "bg-sky-100    text-sky-800    dark:bg-sky-950    dark:text-sky-300",
  written_off: "bg-red-100    text-red-800    dark:bg-red-950    dark:text-red-300",
};

const labels: Record<PieceStatus, string> = {
  in_stock:    "In stock",
  reserved:    "Reserved",
  sold:        "Sold",
  in_transit:  "In transit",
  written_off: "Written off",
};

export function StatusBadge({ status }: { status: PieceStatus }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
