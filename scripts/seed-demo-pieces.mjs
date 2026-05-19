// One-off seed: insert ~8 demo pieces across 3 shops so the UI is testable.
// Run: node --env-file=.env.local scripts/seed-demo-pieces.mjs

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: shops } = await sb.from("shops").select("id, name").order("name");
if (!shops?.length) {
  console.error("No shops seeded.");
  process.exit(1);
}
const byName = Object.fromEntries(shops.map((s) => [s.name, s.id]));

const pieces = [
  { sku: "DM-342666", type: "Necklace",  metal: "Yellow Gold", karat: "18k", main_stone: "Diamond",  stone_cut: "Round",  clarity: "VS1", color_grade: "F", ctw: 1.0, original_price: 2000, sale_price: 1800, cost: 720, shop: "Opal Grande",        description: "Solitaire pendant on box chain" },
  { sku: "DM-143558", type: "Necklace",  metal: "White Gold",  karat: "14k", main_stone: "Diamond",  stone_cut: "Princess",clarity: "VS2", color_grade: "G", ctw: 1.5, original_price: 1900, sale_price: 1710, cost: 640, shop: "Opal Grande",        description: "Cross pendant, milgrain edge" },
  { sku: "EM-360559", type: "Earrings",  metal: "Yellow Gold", karat: "14k", main_stone: "Diamond",  stone_cut: "Round",  clarity: "SI1", color_grade: "H", ctw: 2.0, original_price: 2000, sale_price: 1800, cost: 780, shop: "Selina Clearwater",  description: "Studs, 4-prong basket" },
  { sku: "CH-200013", type: "Choker",    metal: "Yellow Gold", karat: "18k", main_stone: "Sapphire", stone_cut: "Oval",   clarity: null, color_grade: null, ctw: 1.1, original_price: 1750, sale_price: 1575, cost: 600, shop: "Jupiter",           description: "Tennis-style with center sapphire" },
  { sku: "DM-114306", type: "Necklace",  metal: "Yellow Gold", karat: "14k", main_stone: "Diamond",  stone_cut: "Round",  clarity: "SI1", color_grade: "I", ctw: 3.0, original_price: 2220, sale_price: 1998, cost: 880, shop: "Opal Grande",        description: "Graduated diamond rivière" },
  { sku: "RG-501221", type: "Ring",      metal: "Platinum",    karat: null,  main_stone: "Diamond",  stone_cut: "Cushion",clarity: "VVS2",color_grade: "E", ctw: 1.8, ring_size: 6.5,  original_price: 5400, sale_price: 4860, cost: 2200, shop: "Selina Clearwater", description: "Halo engagement ring" },
  { sku: "BR-602105", type: "Bracelet",  metal: "Yellow Gold", karat: "18k", main_stone: "Diamond",  stone_cut: "Round",  clarity: "VS2", color_grade: "G", ctw: 2.5, original_price: 3800, sale_price: 3420, cost: 1500, shop: "Jupiter",           description: "Tennis bracelet, 7.25 in" },
  { sku: "PD-700418", type: "Pendant",   metal: "Rose Gold",   karat: "14k", main_stone: "Morganite",stone_cut: "Pear",   clarity: null, color_grade: null, ctw: 2.2, original_price: 1300, sale_price: 1170, cost: 420, shop: "Selina Clearwater", description: "Morganite drop with diamond halo" },
];

let inserted = 0;
for (const p of pieces) {
  const { shop, ...row } = p;
  const { error } = await sb.from("pieces").insert({
    ...row,
    current_shop_id: byName[shop],
    status: "in_stock",
  });
  if (error) console.error("  ✗", p.sku, error.message);
  else { inserted++; console.log("  ✓", p.sku); }
}
console.log(`Inserted ${inserted}/${pieces.length} demo pieces.`);
