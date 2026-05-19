export function money(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function moneyExact(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(v);
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
