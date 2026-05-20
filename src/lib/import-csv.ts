/** Lightweight CSV parser — handles quoted commas + escaped quotes ("") */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.some((x) => x.trim() !== "")) rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((x) => x.trim() !== "")) rows.push(row);
  }
  return rows;
}

/** Parse a price string into a float. Handles US ($1,750.00) and European ($1.750,00). */
export function parsePrice(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let result: number;
  if (lastDot > lastComma) {
    result = parseFloat(cleaned.replace(/,/g, ""));
  } else if (lastComma > lastDot) {
    result = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  } else {
    result = parseFloat(cleaned);
  }
  return Number.isFinite(result) ? result : null;
}

/** Parse CTW — accept "1.5", "01.02", "1.9 CTW", "" */
export function parseCtw(raw: string): number | null {
  if (!raw) return null;
  const m = raw.match(/[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Normalize CATEGORY → piece type. Maps NECKLACE/necklace/etc → "Necklace". */
const typeMap: Record<string, string> = {
  necklace:  "Necklace",
  ring:      "Ring",
  bracelet:  "Bracelet",
  earring:   "Earrings",
  earrings:  "Earrings",
  choker:    "Choker",
  pendant:   "Pendant",
  cross:     "Cross",
  brooch:    "Brooch",
  anklet:    "Anklet",
  chain:     "Chain",
  watch:     "Watch",
};
export function normalizeType(raw: string): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return typeMap[key] ?? raw.trim();
}

export interface ParsedRow {
  sku: string;
  description: string;
  type: string;
  ctw: number | null;
  price: number | null;
  certification: boolean;
  stock: number;
  total: number;
  raw: Record<string, string>;
  issues: string[];
  status: "ok" | "skip" | "error";
}

/** Heuristic header detector — looks for NAME / CATEGORY / PRICE in any column. */
function isHeaderRow(row: string[]): boolean {
  const joined = row.join(",").toLowerCase();
  return joined.includes("name") && joined.includes("category") && joined.includes("price");
}

export function parseInventoryCsv(text: string): ParsedRow[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  // Drop header row if present.
  const dataStart = isHeaderRow(rows[0]) ? 1 : 0;

  const out: ParsedRow[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    const [sku, name, category, ctw, price, certification, stock, , , total] = r;
    const issues: string[] = [];

    const parsedPrice = parsePrice(price ?? "");
    const parsedCtw = parseCtw(ctw ?? "");
    const parsedStock = parseInt(stock ?? "", 10);
    const parsedTotal = parseInt(total ?? "", 10);
    const normalizedType = normalizeType(category ?? "");

    if (!sku?.trim()) issues.push("missing SKU");
    if (!name?.trim()) issues.push("missing name");
    if (!normalizedType) issues.push("missing type");
    if (parsedPrice == null || parsedPrice <= 0) issues.push("invalid price");

    let status: ParsedRow["status"] = "ok";
    if (issues.length > 0) status = "error";
    else if (Number.isFinite(parsedTotal) && parsedTotal === 0) {
      status = "skip";
      issues.push("not in stock (TOTAL=0)");
    }

    out.push({
      sku: (sku ?? "").trim(),
      description: (name ?? "").trim(),
      type: normalizedType ?? "",
      ctw: parsedCtw,
      price: parsedPrice,
      certification: (certification ?? "").trim().toUpperCase() === "TRUE",
      stock: Number.isFinite(parsedStock) ? parsedStock : 0,
      total: Number.isFinite(parsedTotal) ? parsedTotal : 0,
      raw: { sku, name, category, ctw, price, certification, stock, total },
      issues,
      status,
    });
  }
  return out;
}

/** Resolve a Google Sheets URL to its CSV-export URL. */
export function googleSheetsCsvUrl(input: string): string | null {
  const trimmed = input.trim();
  // Direct CSV URL passthrough
  if (trimmed.includes("export?format=csv") || trimmed.endsWith(".csv")) return trimmed;
  // Match a sheet ID from any docs.google.com URL
  const m = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
}
