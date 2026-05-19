-- Opal Gems inventory system — initial schema
-- Conventions: uuid PKs, timestamptz for time, numeric(12,2) for money,
-- RLS enabled on every table, audit triggers on state-changing tables.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------- ENUMS (text + check, easier to extend than native enums) ----------

-- Roles
do $$ begin
  create type user_role as enum ('owner', 'manager', 'staff');
exception when duplicate_object then null; end $$;

-- Piece status lifecycle
do $$ begin
  create type piece_status as enum (
    'in_stock', 'reserved', 'sold', 'in_transit', 'written_off'
  );
exception when duplicate_object then null; end $$;

-- Movement types (transfer between shops, pull for display, write-off, etc.)
do $$ begin
  create type movement_type as enum (
    'transfer', 'pull', 'restock', 'write_off'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'denied', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_status as enum ('active', 'completed', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wishlist_status as enum ('open', 'fulfilled', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_count_status as enum ('in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;


-- ---------- PROFILES (extends auth.users) ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'staff',
  full_name text not null,
  phone text,                      -- E.164 format (+1XXXXXXXXXX)
  default_shop_id uuid,            -- FK added after shops table created
  commission_pct numeric(5,2) not null default 2.00,
  active boolean not null default true,
  created_at timestamptz not null default now()
);


-- ---------- SHOPS ----------

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- "Selina Clearwater"
  hotel_name text,                          -- "Selina Hotel Clearwater"
  address text,
  manager_id uuid references public.profiles(id) on delete set null,
  hotel_commission_pct numeric(5,2),        -- nullable; hidden in v1 UI, addable later
  sales_tax_pct numeric(5,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_default_shop_fk
  foreign key (default_shop_id) references public.shops(id) on delete set null;


-- ---------- PIECES (one row per unique piece) ----------

create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,                 -- "#342666"
  -- Categorisation (values live in enum_values for owner-editable dropdowns)
  type text not null,                       -- Necklace / Earrings / Choker / ...
  metal text,                               -- Yellow Gold / White Gold / ...
  karat text,                               -- 14k / 18k / ...
  main_stone text,                          -- Diamond / Sapphire / ...
  stone_cut text,
  clarity text,
  color_grade text,
  -- Numerics
  ctw numeric(6,2),                         -- carat total weight
  gram_weight numeric(7,2),
  length_in numeric(5,2),
  width_mm numeric(6,2),
  ring_size numeric(4,1),
  -- Free-text
  description text,
  internal_notes text,                      -- owner-only via column grant
  -- Pricing
  cost numeric(12,2),                       -- owner-only via column grant
  original_price numeric(12,2) not null,
  sale_price numeric(12,2) not null,        -- standard tag price (after std markdown)
  -- State
  current_shop_id uuid references public.shops(id) on delete restrict,
  status piece_status not null default 'in_stock',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index pieces_shop_status_idx on public.pieces (current_shop_id, status);
create index pieces_sku_trgm_idx on public.pieces using gin (sku gin_trgm_ops);


create table public.piece_tags (
  piece_id uuid not null references public.pieces(id) on delete cascade,
  tag text not null,
  primary key (piece_id, tag)
);

create table public.piece_photos (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  storage_path text not null,               -- Supabase Storage path
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index piece_photos_piece_idx on public.piece_photos (piece_id, sort_order);


-- ---------- CUSTOMERS ----------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  address text,
  notes text,
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);
create index customers_name_trgm on public.customers using gin (full_name gin_trgm_ops);
create index customers_phone_idx on public.customers (phone);


-- ---------- SALES ----------

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid not null references public.profiles(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  sale_date timestamptz not null default now(),
  gross_price numeric(12,2) not null,       -- pre-discount
  discount_pct numeric(5,2) not null default 0,
  net_price numeric(12,2) not null,         -- what the customer paid
  staff_commission_pct numeric(5,2) not null,
  staff_commission_amount numeric(12,2) not null,
  hotel_commission_pct numeric(5,2),        -- snapshot at sale time (v2)
  hotel_commission_amount numeric(12,2),
  payment_method text,                      -- "check" / "card" / "cash"
  notes text,
  created_at timestamptz not null default now()
);
create index sales_shop_date_idx on public.sales (shop_id, sale_date desc);
create index sales_staff_date_idx on public.sales (staff_id, sale_date desc);
create index sales_customer_idx on public.sales (customer_id);


-- ---------- MOVEMENTS (transfers, pulls, write-offs — need owner approval) ----------

create table public.movements (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete restrict,
  movement_type movement_type not null,
  from_shop_id uuid references public.shops(id) on delete restrict,
  to_shop_id uuid references public.shops(id) on delete restrict,    -- null for write_off / pull
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  approval_status approval_status not null default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  reason text,
  notes text,
  approval_token text unique                -- signed token for WhatsApp link click-to-approve
);
create index movements_status_idx on public.movements (approval_status, requested_at desc);


-- ---------- DISCOUNT REQUESTS (staff asks owner for > threshold) ----------

create table public.discount_requests (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid not null references public.profiles(id),
  shop_id uuid not null references public.shops(id),
  requested_pct numeric(5,2) not null,
  reason text,
  status approval_status not null default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  approved_pct numeric(5,2),                -- owner may approve at lower %
  resulting_sale_id uuid references public.sales(id),
  approval_token text unique,
  created_at timestamptz not null default now()
);


-- ---------- WISHLIST (out-of-stock requests tied to customer) ----------

create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  description text not null,                -- "platinum band, size 6, 1ct diamond"
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  status wishlist_status not null default 'open',
  fulfilled_at timestamptz,
  fulfilled_with_piece_id uuid references public.pieces(id),
  notes text
);
create index wishlist_status_idx on public.wishlist (status, requested_at desc);


-- ---------- RESERVATIONS (piece held for a customer) ----------

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  reserved_by uuid not null references public.profiles(id),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz,
  status reservation_status not null default 'active',
  notes text
);
create unique index reservations_one_active_per_piece
  on public.reservations (piece_id) where status = 'active';


-- ---------- STOCK COUNTS (monthly physical recon) ----------

create table public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id),
  started_by uuid not null references public.profiles(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status stock_count_status not null default 'in_progress',
  notes text
);

create table public.stock_count_entries (
  count_id uuid not null references public.stock_counts(id) on delete cascade,
  piece_id uuid not null references public.pieces(id),
  was_expected boolean not null,             -- system thought this piece was in the shop
  was_found boolean not null,                -- staff actually saw it
  notes text,
  primary key (count_id, piece_id)
);


-- ---------- AUDIT LOG (immutable, owner-readable) ----------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,                      -- 'INSERT' / 'UPDATE' / 'DELETE'
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, at desc);


-- ---------- SETTINGS (key-value config, owner-editable) ----------

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);


-- ---------- ENUM_VALUES (owner-editable dropdown lists) ----------

create table public.enum_values (
  id uuid primary key default gen_random_uuid(),
  enum_name text not null,                   -- 'type' / 'metal' / 'karat' / 'main_stone' / ...
  value text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  unique (enum_name, value)
);
create index enum_values_name_idx on public.enum_values (enum_name, sort_order);


-- ---------- NOTIFICATIONS OUTBOX (Twilio fan-out queue) ----------

create table public.notifications_outbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null,                     -- 'whatsapp' / 'sms' / 'email'
  recipient text not null,                   -- phone or email
  template_key text not null,                -- 'sale_alert' / 'movement_request' / ...
  payload jsonb not null,
  status text not null default 'pending',    -- pending / sent / failed
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_status_idx on public.notifications_outbox (status, created_at);
