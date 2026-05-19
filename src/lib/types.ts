// Shared TS types for the Opal Gems app. Long-term these can be generated from
// the Supabase schema via `supabase gen types typescript` — for v1, hand-maintained.

export type UserRole = "owner" | "manager" | "staff";

export type PieceStatus =
  | "in_stock"
  | "reserved"
  | "sold"
  | "in_transit"
  | "written_off";

export type MovementType = "transfer" | "pull" | "restock" | "write_off";

export type ApprovalStatus = "pending" | "approved" | "denied" | "cancelled";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  default_shop_id: string | null;
  commission_pct: number;
  active: boolean;
}

export interface Shop {
  id: string;
  name: string;
  hotel_name: string | null;
  address: string | null;
  manager_id: string | null;
  hotel_commission_pct: number | null;
  sales_tax_pct: number;
  active: boolean;
}

export interface Piece {
  id: string;
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
  // cost + internal_notes intentionally omitted — owner only via server route
  original_price: number;
  sale_price: number;
  current_shop_id: string | null;
  status: PieceStatus;
  created_at: string;
}
