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

/** Parse a price string into a float. Handles:
 *   US:       "$1,400"      "$1,750.00"    "$875.00"
 *   European: "$1.400"      "$1.750,00"    "$875,00"
 *   Bare:     "1400"        "1500"
 * Heuristic: if both . and , present, the last one is the decimal mark.
 * If only one separator present, 3-digit trail = thousands, 1–2 digit trail = decimal. */
export function parsePrice(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  const dotIdx = cleaned.lastIndexOf(".");
  const commaIdx = cleaned.lastIndexOf(",");
  let normalized: string;
  if (dotIdx === -1 && commaIdx === -1) {
    normalized = cleaned;
  } else if (dotIdx >= 0 && commaIdx >= 0) {
    // Last separator is the decimal
    if (dotIdx > commaIdx) {
      normalized = cleaned.replace(/,/g, "");
    } else {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (dotIdx >= 0) {
    const after = cleaned.length - dotIdx - 1;
    normalized = after === 3 ? cleaned.replace(/\./g, "") : cleaned;
  } else {
    const after = cleaned.length - commaIdx - 1;
    normalized = after === 3 ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Parse CTW — accept "1.5", "01.02", "1.9 CTW", "" */
export function parseCtw(raw: string): number | null {
  if (!raw) return null;
  const m = raw.match(/[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** "14 KW" → { karat: "14k", metal: "White Gold" } */
export function parseGold(raw: string): { karat: string | null; metal: string | null } {
  if (!raw) return { karat: null, metal: null };
  const m = raw.trim().match(/^(\d+)\s*K([WYR]?)/i);
  if (!m) return { karat: null, metal: null };
  const code = (m[2] ?? "").toUpperCase();
  const metal = code === "W" ? "White Gold" : code === "Y" ? "Yellow Gold" : code === "R" ? "Rose Gold" : null;
  return { karat: `${m[1]}k`, metal };
}

/** "FVS1" → { color_grade: "F", clarity: "VS1" } */
export function parseDiamond(raw: string): { color_grade: string | null; clarity: string | null } {
  if (!raw) return { color_grade: null, clarity: null };
  const t = raw.trim().toUpperCase();
  const m = t.match(/^([D-Z])(VVS[12]|VS[12]|SI[12]|I[12]|IF|FL)$/);
  if (!m) return { color_grade: null, clarity: null };
  return { color_grade: m[1], clarity: m[2] };
}

const typeMap: Record<string, string> = {
  necklace: "Necklace", ring: "Ring", bracelet: "Bracelet",
  earring: "Earrings", earrings: "Earrings",
  choker: "Choker", pendant: "Pendant", cross: "Cross",
  brooch: "Brooch", anklet: "Anklet", chain: "Chain", watch: "Watch",
};
export function normalizeType(raw: string): string | null {
  if (!raw) return null;
  return typeMap[raw.trim().toLowerCase()] ?? raw.trim();
}

// Keyword → canonical type. Order matters: more specific first.
const typeKeywords: Array<[RegExp, string]> = [
  [/\bNECKLACE\b/i, "Necklace"],
  [/\bCHOKER\b/i,   "Choker"],
  [/\bCROSS\b/i,    "Cross"],
  [/\bPENDANT\b/i,  "Pendant"],
  [/\bBRACELET\b/i, "Bracelet"],
  [/\bBANGLE\b/i,   "Bracelet"],
  [/\bANKLET\b/i,   "Anklet"],
  [/\bEARRING(S)?\b/i, "Earrings"],
  [/\bSTUD(S)?\b/i,    "Earrings"],
  [/\bHOOP(S)?\b/i,    "Earrings"],
  [/\bHUGGIE(S)?\b/i,  "Earrings"],
  [/\bDANGLE(S)?\b/i,  "Earrings"],
  [/\bRING\b/i,     "Ring"],
  [/\bBAND\b/i,     "Ring"],
  [/\bBROOCH\b/i,   "Brooch"],
  [/\bCHAIN\b/i,    "Chain"],
  [/\bWATCH\b/i,    "Watch"],
];

/** Look inside a free-text name like "PEAR TENNIS BRACELET" → "Bracelet". */
export function extractTypeFromName(name: string): string | null {
  if (!name) return null;
  for (const [re, t] of typeKeywords) {
    if (re.test(name)) return t;
  }
  return null;
}

export interface ParsedRow {
  sku: string;
  description: string;
  type: string;
  ctw: number | null;
  price: number | null;
  // Optional extra fields (filled when the source format includes them)
  metal?: string | null;
  karat?: string | null;
  main_stone?: string | null;
  color_grade?: string | null;
  clarity?: string | null;
  location?: string | null;        // raw LOCATION string from sheet, if any
  image_url?: string | null;
  // Bookkeeping
  quantity: number;
  certification: boolean;
  stock: number;
  total: number;
  raw: Record<string, string>;
  issues: string[];
  status: "ok" | "skip" | "error";
  /** When set, the piece is inserted with this status instead of "in_stock". */
  status_override?: "sold" | null;
}

function isHeaderFormatA(row: string[]): boolean {
  const j = row.map((c) => c.toUpperCase());
  return j.includes("NAME") && j.includes("CATEGORY") && j.includes("PRICE");
}
function isHeaderFormatB(row: string[]): boolean {
  const j = row.map((c) => c.trim().toUpperCase());
  return j.includes("IMAGE") && j.includes("GOLD") && j.includes("DIAMOND") && j.includes("LOCATION");
}
/** Format C — universal template: SKU + NAME + TYPE + PRICE (named columns, any order). */
function isHeaderFormatC(row: string[]): boolean {
  const j = row.map((c) => c.trim().toUpperCase());
  return j.includes("SKU") && j.includes("NAME") && j.includes("TYPE") && j.includes("PRICE");
}

/** Smart dispatcher — tries C (universal) → B → A. Falls back to A. */
export function parseInventoryCsv(text: string): ParsedRow[] {
  const rows = parseCSV(text);
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (isHeaderFormatC(rows[i])) return parseFormatC(rows, i);
    if (isHeaderFormatB(rows[i])) return parseFormatB(rows, i);
    if (isHeaderFormatA(rows[i])) return parseFormatA(rows, i);
  }
  return parseFormatA(rows, isHeaderFormatA(rows[0] ?? []) ? 0 : -1);
}

// ---------- Format A (SKU,NAME,CATEGORY,CTW,PRICE,CERTIFICATION,STOCK,INBOUND,OUTBOUND,TOTAL) ----------
function parseFormatA(rows: string[][], headerIdx: number): ParsedRow[] {
  const start = headerIdx >= 0 ? headerIdx + 1 : 0;
  const out: ParsedRow[] = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    const [sku, name, category, ctw, price, certification, stock, , , total] = r;
    const issues: string[] = [];
    const parsedPrice = parsePrice(price ?? "");
    const parsedCtw = parseCtw(ctw ?? "");
    const parsedTotal = parseInt(total ?? "", 10);
    const normalizedType = normalizeType(category ?? "");

    if (!sku?.trim()) issues.push("missing SKU");
    if (!name?.trim()) issues.push("missing name");
    if (!normalizedType) issues.push("missing type");
    if (parsedPrice == null || parsedPrice <= 0) issues.push("invalid price");

    let status: ParsedRow["status"] = "ok";
    let status_override: "sold" | null = null;
    if (issues.length > 0) status = "error";
    else if (Number.isFinite(parsedTotal) && parsedTotal === 0) {
      status_override = "sold";
      issues.push("imported as sold (TOTAL=0)");
    }

    out.push({
      sku: (sku ?? "").trim(),
      description: (name ?? "").trim(),
      type: normalizedType ?? "",
      ctw: parsedCtw,
      price: parsedPrice,
      quantity: 1,
      certification: (certification ?? "").trim().toUpperCase() === "TRUE",
      stock: Number.isFinite(parseInt(stock ?? "", 10)) ? parseInt(stock ?? "", 10) : 0,
      total: Number.isFinite(parsedTotal) ? parsedTotal : 0,
      raw: { sku, name, category, ctw, price, certification, stock, total },
      issues,
      status,
      status_override,
    });
  }
  return out;
}

// ---------- Format B (IMAGE,NOTE,NAME,...,SKU,CTW,GOLD,DIAMOND,NEW PRICE,QTY,LOCATION,...,SOLD BY,...) ----------
function parseFormatB(rows: string[][], headerIdx: number): ParsedRow[] {
  const header = rows[headerIdx].map((c) => c.trim().toUpperCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    image:    col("IMAGE"),
    name:     col("NAME"),
    sku:      col("SKU"),
    ctw:      col("CTW"),
    gold:     col("GOLD"),
    diamond:  col("DIAMOND"),
    price:    col("NEW PRICE"),
    location: col("LOCATION"),
    soldBy:   col("SOLD BY"),
  };

  const out: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const sku = (r[idx.sku] ?? "").trim();
    const name = (r[idx.name] ?? "").trim();
    if (!sku && !name) continue;                                    // blank row
    if (/^\d?(ST|ND|RD|TH)?\s*SHOWCASE/i.test(name)) continue;       // section title
    if (isHeaderFormatB(r)) continue;                                // repeated header for next section
    if (sku.toUpperCase() === "SKU") continue;                        // header artifact
    if (/^SOLD\b/i.test(name)) continue;                              // explicit "SOLD" marker row
    if (!sku) {
      const flat = r.join("").trim().toUpperCase();
      if (/SHOWCASE|HEADER/i.test(flat)) continue;
    }

    const soldBy = (r[idx.soldBy] ?? "").trim();
    const location = (r[idx.location] ?? "").trim() || null;
    const gold = parseGold(r[idx.gold] ?? "");
    const diamond = parseDiamond(r[idx.diamond] ?? "");
    const ctw = parseCtw(r[idx.ctw] ?? "");
    const price = parsePrice(r[idx.price] ?? "");
    const type = extractTypeFromName(name) ?? "";
    const issues: string[] = [];
    let status: ParsedRow["status"] = "ok";
    let status_override: "sold" | null = null;

    if (soldBy) { status_override = "sold"; issues.push(`imported as sold (by ${soldBy})`); }
    if (!sku) { status = "error"; issues.push("missing SKU"); }
    if (!name) { status = "error"; issues.push("missing name"); }
    if (!type) { status = "error"; issues.push("could not infer type from name"); }
    if (price == null || price <= 0) { status = "error"; issues.push("invalid price"); }

    out.push({
      sku,
      description: name,
      type,
      ctw,
      price,
      metal: gold.metal,
      karat: gold.karat,
      main_stone: diamond.color_grade || diamond.clarity || ctw ? "Diamond" : null,
      color_grade: diamond.color_grade,
      clarity: diamond.clarity,
      location,
      image_url: (r[idx.image] ?? "").trim() || null,
      quantity: 1,
      certification: false,
      stock: 1,
      total: 1,
      raw: Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])),
      issues,
      status,
      status_override,
    });
  }
  return out;
}

// ---------- Format C — Universal template (named columns, any order) ----------
// Headers: SKU, NAME, TYPE, METAL, KARAT, CTW, PRICE, QUANTITY, LOCATION, STATUS
function parseFormatC(rows: string[][], headerIdx: number): ParsedRow[] {
  const header = rows[headerIdx].map((c) => c.trim().toUpperCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    sku:      col("SKU"),
    name:     col("NAME"),
    type:     col("TYPE"),
    metal:    col("METAL"),
    karat:    col("KARAT"),
    ctw:      col("CTW"),
    price:    col("PRICE"),
    quantity: col("QUANTITY"),
    location: col("LOCATION"),
    status:   col("STATUS"),
  };

  const out: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (n: keyof typeof idx) => (idx[n] >= 0 ? (r[idx[n]] ?? "").trim() : "");

    const sku      = get("sku");
    const name     = get("name");
    const typeRaw  = get("type");
    const price    = parsePrice(get("price"));
    const ctw      = parseCtw(get("ctw"));
    const location = get("location") || null;
    const type     = normalizeType(typeRaw) ?? extractTypeFromName(name) ?? "";
    const metal    = get("metal") || null;
    const karat    = get("karat") || null;
    const qtyRaw   = get("quantity");
    const quantity = qtyRaw ? Math.max(1, parseInt(qtyRaw, 10) || 1) : 1;
    const statusRaw = get("status").toLowerCase();
    const status_override: "sold" | null = statusRaw === "sold" ? "sold" : null;

    const issues: string[] = [];
    let status: ParsedRow["status"] = "ok";
    if (!sku)                          { status = "error"; issues.push("missing SKU"); }
    if (!name)                         { status = "error"; issues.push("missing name"); }
    if (!type)                         { status = "error"; issues.push("missing or unrecognised type"); }
    if (price == null || price <= 0)   { status = "error"; issues.push("invalid price"); }
    if (status_override === "sold") issues.push("imported as sold");

    out.push({
      sku,
      description: name,
      type,
      ctw,
      price,
      metal,
      karat,
      main_stone: null,
      location,
      quantity,
      certification: false,
      stock: quantity,
      total: quantity,
      raw: Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])),
      issues,
      status,
      status_override,
    });
  }
  return out;
}

/** Resolve a Google Sheets URL to its CSV-export URL. */
export function googleSheetsCsvUrl(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.includes("export?format=csv") || trimmed.endsWith(".csv")) return trimmed;
  const m = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  // Honor gid if present so the right tab gets exported
  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch ? `&gid=${gidMatch[1]}` : "";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid}`;
}
