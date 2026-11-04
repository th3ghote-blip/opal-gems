import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Remote MCP server, for Meta Muse (or any MCP client) to read live stock.
//
// Transport: JSON-RPC 2.0 over HTTP POST (MCP streamable HTTP). No SSE stream —
// this server never initiates messages, so GET is refused.
//
// WHAT NEVER LEAVES HERE: cost, original_price, sale_price, internal_notes, and
// anything in the "Friends & Family" virtual shop. Pricing is withheld on
// purpose — the same call the receptionist endpoint made. Widening that is a
// decision for the shop owner, not a code change to make quietly.

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "opal-gems-stock";
const SERVER_VERSION = "1.0.0";
const HIDDEN_SHOP = "friends & family";
const MAX_LIMIT = 50;

// Type must match exactly. A substring match is actively wrong here:
// "%Ring%" also matches "Earrings", which returned 60 rows for a ring search.
const PIECE_TYPES = ["Bracelet", "Earrings", "Loose", "Necklace", "Pendant", "Ring"] as const;

// Accepts the canonical value, any casing, and the obvious singular/plural slip
// ("rings" -> Ring, "earring" -> Earrings). Returns null if it is not a real type.
function normaliseType(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  for (const t of PIECE_TYPES) {
    const tl = t.toLowerCase();
    if (tl === s || tl === s.replace(/s$/, "") || tl.replace(/s$/, "") === s || `${tl}s` === s) {
      return t;
    }
  }
  return null;
}

// Columns safe to expose. Pricing and cost columns are deliberately absent.
const PIECE_COLUMNS =
  "sku, type, metal, karat, main_stone, stone_cut, clarity, color_grade, " +
  "ctw, gram_weight, length_in, width_mm, ring_size, description, quantity, " +
  "shops!current_shop_id(name), piece_photos(storage_path, sort_order)";

type RawPiece = {
  sku: string;
  type: string;
  metal: string | null;
  karat: string | null;
  main_stone: string | null;
  stone_cut: string | null;
  clarity: string | null;
  color_grade: string | null;
  ctw: number | null;
  gram_weight: number | null;
  length_in: number | null;
  width_mm: number | null;
  ring_size: number | null;
  description: string | null;
  quantity: number;
  shops: { name: string } | null;
  piece_photos: { storage_path: string; sort_order: number }[] | null;
};

function photoUrls(p: RawPiece): string[] {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return [];
  return (p.piece_photos ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ph) => `${base}/storage/v1/object/public/piece-photos/${ph.storage_path}`);
}

function shape(p: RawPiece) {
  const out: Record<string, unknown> = {
    sku: p.sku,
    type: p.type,
    shop: p.shops?.name ?? null,
    quantity: p.quantity,
    photos: photoUrls(p),
  };
  // Only include measured/graded fields that are actually set, so the agent
  // is not handed a wall of nulls to reason about.
  const optional: [string, unknown][] = [
    ["metal", p.metal],
    ["karat", p.karat],
    ["main_stone", p.main_stone],
    ["stone_cut", p.stone_cut],
    ["clarity", p.clarity],
    ["color_grade", p.color_grade],
    ["ctw", p.ctw],
    ["gram_weight", p.gram_weight],
    ["length_in", p.length_in],
    ["width_mm", p.width_mm],
    ["ring_size", p.ring_size],
    ["description", p.description],
  ];
  for (const [k, v] of optional) if (v !== null && v !== undefined) out[k] = v;
  return out;
}

const TOOLS = [
  {
    name: "search_stock",
    description:
      "Search Opal Gems pieces that are currently in stock. Filters are optional and combine with AND. " +
      "Returns SKU, type, metal, stone details, carat weight, quantity, which boutique holds it, and public photo URLs. " +
      "Prices are not available through this tool.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [...PIECE_TYPES],
          description: "Piece type. Must be one of the listed values; matched exactly, not as a substring.",
        },
        metal: { type: "string", description: "e.g. Yellow Gold, White Gold. Partial match." },
        main_stone: { type: "string", description: "e.g. Diamond, Sapphire. Partial match." },
        shop: { type: "string", description: "Boutique name. Partial match." },
        min_ctw: { type: "number", description: "Minimum carat total weight." },
        max_ctw: { type: "number", description: "Maximum carat total weight." },
        limit: { type: "number", description: `Max results, 1-${MAX_LIMIT}. Default 20.` },
      },
    },
  },
  {
    name: "get_piece",
    description:
      "Fetch one in-stock Opal Gems piece by its exact SKU. Returns the same fields as search_stock. " +
      "Prices are not available through this tool.",
    inputSchema: {
      type: "object",
      properties: { sku: { type: "string", description: 'Exact SKU, e.g. "342666".' } },
      required: ["sku"],
    },
  },
  {
    name: "list_shops",
    description: "List the active Opal Gems boutiques that hold stock, with how many in-stock pieces each currently has.",
    inputSchema: { type: "object", properties: {} },
  },
];

async function searchStock(args: Record<string, unknown>) {
  const admin = createAdminClient();
  let q = admin
    .from("pieces")
    .select(PIECE_COLUMNS)
    .eq("status", "in_stock")
    .gt("quantity", 0);

  if (typeof args.type === "string" && args.type.trim()) {
    const t = normaliseType(args.type);
    if (!t) throw new Error(`Unknown type "${args.type}". Valid types: ${PIECE_TYPES.join(", ")}.`);
    q = q.ilike("type", t); // no wildcards: exact, case-insensitive
  }
  if (typeof args.metal === "string" && args.metal.trim()) q = q.ilike("metal", `%${args.metal.trim()}%`);
  if (typeof args.main_stone === "string" && args.main_stone.trim())
    q = q.ilike("main_stone", `%${args.main_stone.trim()}%`);
  if (typeof args.min_ctw === "number") q = q.gte("ctw", args.min_ctw);
  if (typeof args.max_ctw === "number") q = q.lte("ctw", args.max_ctw);

  const limit = Math.min(
    Math.max(typeof args.limit === "number" ? Math.floor(args.limit) : 20, 1),
    MAX_LIMIT
  );
  // Over-fetch, because the shop filter and the Friends & Family exclusion are
  // applied in JS (the shop name lives on the joined row).
  const { data, error } = await q.limit(MAX_LIMIT * 4);
  if (error) throw new Error(error.message);

  const shopFilter = typeof args.shop === "string" ? args.shop.trim().toLowerCase() : "";
  const rows = (data as unknown as RawPiece[]) ?? [];
  const kept = rows.filter((p) => {
    const name = p.shops?.name;
    if (!name) return false;
    if (name.toLowerCase() === HIDDEN_SHOP) return false;
    if (shopFilter && !name.toLowerCase().includes(shopFilter)) return false;
    return true;
  });

  return { count: kept.length, truncated: kept.length > limit, pieces: kept.slice(0, limit).map(shape) };
}

async function getPiece(args: Record<string, unknown>) {
  const sku = typeof args.sku === "string" ? args.sku.trim() : "";
  if (!sku) throw new Error("sku is required");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pieces")
    .select(PIECE_COLUMNS)
    .eq("sku", sku)
    .eq("status", "in_stock")
    .gt("quantity", 0)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const p = data as unknown as RawPiece | null;
  if (!p || !p.shops?.name || p.shops.name.toLowerCase() === HIDDEN_SHOP) {
    return { found: false, sku };
  }
  return { found: true, piece: shape(p) };
}

async function listShops() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pieces")
    .select("shops!current_shop_id(name)")
    .eq("status", "in_stock")
    .gt("quantity", 0);
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of (data as unknown as { shops: { name: string } | null }[]) ?? []) {
    const name = row.shops?.name;
    if (!name || name.toLowerCase() === HIDDEN_SHOP) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const shops = Array.from(counts.entries())
    .map(([name, in_stock_pieces]) => ({ name, in_stock_pieces }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { shops };
}

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "search_stock":
      return searchStock(args);
    case "get_piece":
      return getPiece(args);
    case "list_shops":
      return listShops();
    default:
      return null;
  }
}

// Audit trail. Vercel does not retain runtime logs for this project, so without
// this there is no record of who read the client's stock. Never allowed to break
// a response: a logging failure is swallowed.
async function logAccess(
  req: NextRequest,
  tool: string,
  args: Record<string, unknown> | null,
  outcome: { ok: boolean; count?: number | null; error?: string }
) {
  try {
    const admin = createAdminClient();
    await admin.from("mcp_access_log").insert({
      tool,
      arguments: args,
      result_count: outcome.count ?? null,
      ok: outcome.ok,
      error: outcome.error ?? null,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
  } catch {
    // Table missing or DB down — serving the request still matters more.
  }
}

// How many rows a tool result represents, for the log only.
function countOf(tool: string, result: unknown): number | null {
  const r = result as Record<string, unknown>;
  if (tool === "search_stock") return typeof r.count === "number" ? r.count : null;
  if (tool === "get_piece") return r.found === true ? 1 : 0;
  if (tool === "list_shops") return Array.isArray(r.shops) ? r.shops.length : null;
  return null;
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status });
}

function authorized(req: NextRequest): boolean {
  const key = process.env.MUSE_API_KEY;
  // Fail closed. This serves a client's live commercial stock; an unset key
  // must never mean "open to everyone".
  if (!key) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  return bearer === key || req.headers.get("x-api-key") === key;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    // Logged on purpose: a run of these means the endpoint URL is being probed,
    // or the key has leaked and is being guessed at.
    await logAccess(req, "_unauthorized", null, { ok: false, error: "bad or missing key" });
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  // Batches are not supported; MCP clients do not need them here.
  if (Array.isArray(body)) return rpcError(null, -32600, "Batch requests are not supported");

  const msg = body as { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg?.id, -32600, "Invalid Request");
  }

  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  try {
    if (method === "initialize") {
      // The row that answers "has anyone actually connected this?"
      const client = (params?.clientInfo as Record<string, unknown>) ?? null;
      await logAccess(req, "_initialize", client, { ok: true });
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          instructions:
            "Live stock for Opal Gems, a jewellery retailer with boutiques inside resorts. " +
            "Use search_stock to find pieces by type, metal, stone or boutique, get_piece for one SKU, " +
            "and list_shops for the boutiques. Prices are not exposed: for a price, tell the customer " +
            "to contact the boutique.",
        },
      });
    }

    if (method === "notifications/initialized" || method.startsWith("notifications/")) {
      return new NextResponse(null, { status: 202 });
    }

    if (method === "ping") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: {} });
    }

    if (method === "tools/list") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    }

    if (method === "tools/call") {
      const toolName = typeof params?.name === "string" ? params.name : "";
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      const result = await callTool(toolName, args);
      if (result === null) {
        await logAccess(req, toolName || "_unknown", args, { ok: false, error: "unknown tool" });
        return rpcError(id, -32602, `Unknown tool: ${toolName}`);
      }
      await logAccess(req, toolName, args, { ok: true, count: countOf(toolName, result) });
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    }

    if (isNotification) return new NextResponse(null, { status: 202 });
    return rpcError(id, -32601, `Method not found: ${method}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    // Tool failures come back as an MCP tool error, not a transport error, so
    // the agent can read what went wrong instead of just seeing a dead call.
    if (method === "tools/call") {
      const failedTool = typeof params?.name === "string" ? params.name : "_unknown";
      await logAccess(req, failedTool, (params?.arguments as Record<string, unknown>) ?? null, {
        ok: false,
        error: message,
      });
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: `Error: ${message}` }], isError: true },
      });
    }
    return rpcError(id, -32603, message);
  }
}

// No SSE stream: this server never pushes messages to the client.
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed. POST JSON-RPC to this endpoint." }, { status: 405 });
}
