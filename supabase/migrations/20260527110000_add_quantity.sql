-- Add stock quantity to pieces. Default 1 (every existing piece already has 1 unit).
-- Status flips to 'sold' when quantity reaches 0 via a sale.
ALTER TABLE public.pieces ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
