-- The same SKU can appear at multiple shops (e.g. two identical pieces
-- split across locations). Drop the global unique constraint so both
-- can be entered independently.
ALTER TABLE public.pieces DROP CONSTRAINT IF EXISTS pieces_sku_key;
