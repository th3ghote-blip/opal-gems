-- RESET: wipe any partial prior state, re-establish grants Supabase expects.

drop schema if exists public cascade;
create schema public;

grant usage  on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;

-- Ensure tables, functions, sequences created below inherit standard Supabase grants.
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

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
-- Helper functions and RLS policies for Opal Gems.

-- ---------- HELPER FUNCTIONS ----------

create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'owner', false);
$$;

create or replace function public.is_manager_or_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('owner','manager'), false);
$$;

-- Shops the current user can access: owner -> all, manager -> shops where they're listed
-- as manager, staff -> their default shop.
create or replace function public.current_user_shop_ids()
returns setof uuid
language plpgsql stable security definer set search_path = public
as $$
declare v_role user_role;
declare v_uid uuid := auth.uid();
begin
  select role into v_role from public.profiles where id = v_uid;
  if v_role = 'owner' then
    return query select id from public.shops where active;
  elsif v_role = 'manager' then
    return query select id from public.shops where active and manager_id = v_uid;
  else
    return query select default_shop_id from public.profiles where id = v_uid and default_shop_id is not null;
  end if;
end $$;


-- ---------- ENABLE RLS EVERYWHERE ----------

alter table public.profiles               enable row level security;
alter table public.shops                  enable row level security;
alter table public.pieces                 enable row level security;
alter table public.piece_tags             enable row level security;
alter table public.piece_photos           enable row level security;
alter table public.customers              enable row level security;
alter table public.sales                  enable row level security;
alter table public.movements              enable row level security;
alter table public.discount_requests      enable row level security;
alter table public.wishlist               enable row level security;
alter table public.reservations           enable row level security;
alter table public.stock_counts           enable row level security;
alter table public.stock_count_entries    enable row level security;
alter table public.audit_log              enable row level security;
alter table public.settings               enable row level security;
alter table public.enum_values            enable row level security;
alter table public.notifications_outbox   enable row level security;


-- ---------- PROFILES ----------

-- A user can read their own profile. Owner can read all. Manager can read profiles of
-- staff in shops they manage.
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_owner());

-- Only owner can insert / update / delete profiles.
create policy profiles_owner_write on public.profiles
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());


-- ---------- SHOPS ----------

-- Anyone signed in can read active shops (so staff can see the shop picker).
create policy shops_read on public.shops
  for select to authenticated using (active or public.is_owner());

create policy shops_owner_write on public.shops
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());


-- ---------- PIECES ----------

-- Read: any signed-in user can read pieces in their accessible shops.
create policy pieces_read on public.pieces
  for select to authenticated
  using (current_shop_id in (select public.current_user_shop_ids()));

-- Insert: manager+ in the destination shop.
create policy pieces_write on public.pieces
  for insert to authenticated
  with check (
    public.is_manager_or_owner()
    and current_shop_id in (select public.current_user_shop_ids())
  );

-- Update: manager+ for non-cost fields; cost column itself is column-level revoked below.
create policy pieces_update on public.pieces
  for update to authenticated
  using (current_shop_id in (select public.current_user_shop_ids()) and public.is_manager_or_owner())
  with check (public.is_manager_or_owner());

-- Delete: owner only.
create policy pieces_delete on public.pieces
  for delete to authenticated using (public.is_owner());

-- COLUMN-LEVEL: cost + internal_notes are owner-only.
-- Standard authenticated users cannot read or write these columns.
revoke select (cost, internal_notes) on public.pieces from authenticated, anon;
revoke insert (cost, internal_notes) on public.pieces from authenticated, anon;
revoke update (cost, internal_notes) on public.pieces from authenticated, anon;
-- service_role still has full access (used by Next.js server routes after role check).


-- ---------- PIECE_TAGS / PIECE_PHOTOS ----------

create policy piece_tags_read on public.piece_tags for select to authenticated
  using (exists (select 1 from public.pieces p
                 where p.id = piece_id
                   and p.current_shop_id in (select public.current_user_shop_ids())));

create policy piece_tags_write on public.piece_tags for all to authenticated
  using (public.is_manager_or_owner())
  with check (public.is_manager_or_owner());

create policy piece_photos_read on public.piece_photos for select to authenticated
  using (exists (select 1 from public.pieces p
                 where p.id = piece_id
                   and p.current_shop_id in (select public.current_user_shop_ids())));

create policy piece_photos_write on public.piece_photos for all to authenticated
  using (public.is_manager_or_owner())
  with check (public.is_manager_or_owner());


-- ---------- CUSTOMERS ----------

-- Staff in any shop can read customers (customers travel between shops). Owner sees all.
create policy customers_read on public.customers for select to authenticated using (true);

create policy customers_insert on public.customers for insert to authenticated with check (true);

create policy customers_update on public.customers for update to authenticated
  using (public.is_manager_or_owner() or created_by = auth.uid())
  with check (true);

create policy customers_delete on public.customers for delete to authenticated using (public.is_owner());


-- ---------- SALES ----------

create policy sales_read on public.sales for select to authenticated
  using (
    public.is_owner()
    or shop_id in (select public.current_user_shop_ids())
  );

create policy sales_insert on public.sales for insert to authenticated
  with check (shop_id in (select public.current_user_shop_ids()));

-- Sales are immutable from staff hands; owner can correct via server route.
create policy sales_update on public.sales for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy sales_delete on public.sales for delete to authenticated using (public.is_owner());


-- ---------- MOVEMENTS ----------

create policy movements_read on public.movements for select to authenticated
  using (
    public.is_owner()
    or from_shop_id in (select public.current_user_shop_ids())
    or to_shop_id in (select public.current_user_shop_ids())
  );

create policy movements_insert on public.movements for insert to authenticated
  with check (
    requested_by = auth.uid()
    and (from_shop_id in (select public.current_user_shop_ids())
         or to_shop_id in (select public.current_user_shop_ids()))
  );

-- Only owner can approve/deny (update). Approval flow goes through server routes
-- so the WhatsApp-link approval works without re-auth.
create policy movements_update on public.movements for update to authenticated
  using (public.is_owner()) with check (public.is_owner());


-- ---------- DISCOUNT REQUESTS ----------

create policy discount_requests_read on public.discount_requests for select to authenticated
  using (public.is_owner() or shop_id in (select public.current_user_shop_ids()));

create policy discount_requests_insert on public.discount_requests for insert to authenticated
  with check (staff_id = auth.uid() and shop_id in (select public.current_user_shop_ids()));

create policy discount_requests_update on public.discount_requests for update to authenticated
  using (public.is_owner()) with check (public.is_owner());


-- ---------- WISHLIST / RESERVATIONS ----------

create policy wishlist_read on public.wishlist for select to authenticated using (true);
create policy wishlist_insert on public.wishlist for insert to authenticated
  with check (requested_by = auth.uid());
create policy wishlist_update on public.wishlist for update to authenticated
  using (public.is_manager_or_owner() or requested_by = auth.uid())
  with check (true);
create policy wishlist_delete on public.wishlist for delete to authenticated using (public.is_owner());

create policy reservations_read on public.reservations for select to authenticated
  using (
    public.is_owner()
    or exists (select 1 from public.pieces p where p.id = piece_id
                                              and p.current_shop_id in (select public.current_user_shop_ids()))
  );
create policy reservations_write on public.reservations for all to authenticated
  using (public.is_manager_or_owner()
         or exists (select 1 from public.pieces p where p.id = piece_id
                                                    and p.current_shop_id in (select public.current_user_shop_ids())))
  with check (true);


-- ---------- STOCK COUNTS ----------

create policy stock_counts_read on public.stock_counts for select to authenticated
  using (public.is_owner() or shop_id in (select public.current_user_shop_ids()));

create policy stock_counts_write on public.stock_counts for all to authenticated
  using (shop_id in (select public.current_user_shop_ids()))
  with check (shop_id in (select public.current_user_shop_ids()));

create policy stock_count_entries_read on public.stock_count_entries for select to authenticated
  using (exists (select 1 from public.stock_counts sc where sc.id = count_id
                 and (public.is_owner() or sc.shop_id in (select public.current_user_shop_ids()))));
create policy stock_count_entries_write on public.stock_count_entries for all to authenticated
  using (exists (select 1 from public.stock_counts sc where sc.id = count_id
                 and sc.shop_id in (select public.current_user_shop_ids())))
  with check (true);


-- ---------- AUDIT LOG ----------

-- Owner-only read. No app-side writes — triggers do the writing.
create policy audit_log_owner_read on public.audit_log for select to authenticated
  using (public.is_owner());

-- ---------- SETTINGS ----------

-- Everyone signed in reads (UI uses these), only owner writes.
create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_write on public.settings for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------- ENUM VALUES ----------

create policy enum_values_read on public.enum_values for select to authenticated using (active or public.is_owner());
create policy enum_values_write on public.enum_values for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------- NOTIFICATIONS OUTBOX ----------

-- Only service_role uses this (server routes). No authenticated access at all.
revoke all on public.notifications_outbox from authenticated, anon;
-- Audit-log triggers — write an immutable record for every mutation on
-- key tables. Triggers run as table owner, bypassing RLS write policies,
-- so audit can never be suppressed by an app-level bug.

create or replace function public.write_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
begin
  if (tg_op = 'DELETE') then
    v_before := to_jsonb(old);
    v_after := null;
  elsif (tg_op = 'UPDATE') then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  else  -- INSERT
    v_before := null;
    v_after := to_jsonb(new);
  end if;

  -- Pull id from the jsonb representation, tolerating tables whose PK is not "id"
  -- (e.g. settings uses key) by falling back to null.
  begin
    v_id := coalesce(
      nullif(v_after->>'id', '')::uuid,
      nullif(v_before->>'id', '')::uuid
    );
  exception when others then
    v_id := null;
  end;

  insert into public.audit_log (actor_id, entity_type, entity_id, action, before, after)
  values (auth.uid(), tg_table_name, v_id, tg_op, v_before, v_after);

  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- Apply to state-changing tables
create trigger audit_pieces             after insert or update or delete on public.pieces             for each row execute function public.write_audit();
create trigger audit_sales              after insert or update or delete on public.sales              for each row execute function public.write_audit();
create trigger audit_movements          after insert or update or delete on public.movements          for each row execute function public.write_audit();
create trigger audit_discount_requests  after insert or update or delete on public.discount_requests  for each row execute function public.write_audit();
create trigger audit_reservations       after insert or update or delete on public.reservations       for each row execute function public.write_audit();
create trigger audit_wishlist           after insert or update or delete on public.wishlist           for each row execute function public.write_audit();
create trigger audit_profiles           after insert or update or delete on public.profiles           for each row execute function public.write_audit();
create trigger audit_shops              after insert or update or delete on public.shops              for each row execute function public.write_audit();
create trigger audit_settings           after insert or update or delete on public.settings           for each row execute function public.write_audit();
create trigger audit_customers          after insert or update or delete on public.customers          for each row execute function public.write_audit();

-- Updated_at touch
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger touch_settings before update on public.settings for each row execute function public.touch_updated_at();


-- Profile auto-create on new auth user.
-- The profile starts inactive + staff role. Owner must promote/activate via settings page.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, active)
  values (new.id, 'staff', coalesce(new.raw_user_meta_data->>'full_name', new.email), false)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- Seed data: shops, settings, enum_values.
-- Profiles (Jean, Donna, Elaine, Robin, Grace, owner) are created automatically
-- via the auth trigger the first time each user signs in via magic link.
-- The owner then promotes them via the settings page.

-- 3 shops
insert into public.shops (name, hotel_name, address) values
  ('Selina Clearwater', 'Selina Hotel Clearwater', 'Clearwater Beach, FL'),
  ('Opal Grande',       'Opal Grand Resort',       'Delray Beach, FL'),
  ('Jupiter',           'Jupiter Beach Resort',    'Jupiter, FL')
on conflict do nothing;

-- Settings
insert into public.settings (key, value) values
  ('company_name',                    '"Opal Gems"'::jsonb),
  ('staff_commission_pct',            '2'::jsonb),
  ('max_no_approval_discount_pct',    '10'::jsonb),
  ('reservation_default_hours',       '72'::jsonb),
  ('notification_channel',            '"whatsapp"'::jsonb),
  ('owner_phone',                     '""'::jsonb)
on conflict (key) do nothing;


-- Dropdown seed values
insert into public.enum_values (enum_name, value, sort_order) values
  -- Types
  ('type', 'Necklace',  10),
  ('type', 'Earrings',  20),
  ('type', 'Ring',      30),
  ('type', 'Bracelet',  40),
  ('type', 'Pendant',   50),
  ('type', 'Choker',    60),
  ('type', 'Cross',     70),
  ('type', 'Brooch',    80),
  ('type', 'Anklet',    90),
  ('type', 'Chain',    100),
  ('type', 'Watch',    110),

  -- Metals
  ('metal', 'Yellow Gold',     10),
  ('metal', 'White Gold',      20),
  ('metal', 'Rose Gold',       30),
  ('metal', 'Platinum',        40),
  ('metal', 'Sterling Silver', 50),
  ('metal', 'Mixed Metal',     60),

  -- Karats
  ('karat', '10k',   10),
  ('karat', '14k',   20),
  ('karat', '18k',   30),
  ('karat', '22k',   40),
  ('karat', '24k',   50),
  ('karat', '925',   60),
  ('karat', 'N/A',   70),

  -- Main stones
  ('main_stone', 'Diamond',     10),
  ('main_stone', 'Sapphire',    20),
  ('main_stone', 'Ruby',        30),
  ('main_stone', 'Emerald',     40),
  ('main_stone', 'Opal',        50),
  ('main_stone', 'Pearl',       60),
  ('main_stone', 'Tanzanite',   70),
  ('main_stone', 'Topaz',       80),
  ('main_stone', 'Amethyst',    90),
  ('main_stone', 'Aquamarine', 100),
  ('main_stone', 'Tourmaline', 110),
  ('main_stone', 'Citrine',    120),
  ('main_stone', 'Garnet',     130),
  ('main_stone', 'Morganite',  140),
  ('main_stone', 'Onyx',       150),
  ('main_stone', 'None',       999),

  -- Cuts
  ('stone_cut', 'Round',         10),
  ('stone_cut', 'Princess',      20),
  ('stone_cut', 'Cushion',       30),
  ('stone_cut', 'Oval',          40),
  ('stone_cut', 'Pear',          50),
  ('stone_cut', 'Marquise',      60),
  ('stone_cut', 'Emerald Cut',   70),
  ('stone_cut', 'Heart',         80),
  ('stone_cut', 'Asscher',       90),
  ('stone_cut', 'Radiant',      100),
  ('stone_cut', 'Baguette',     110),

  -- Clarity (diamonds)
  ('clarity', 'FL',    10),
  ('clarity', 'IF',    20),
  ('clarity', 'VVS1',  30),
  ('clarity', 'VVS2',  40),
  ('clarity', 'VS1',   50),
  ('clarity', 'VS2',   60),
  ('clarity', 'SI1',   70),
  ('clarity', 'SI2',   80),
  ('clarity', 'I1',    90),
  ('clarity', 'I2',   100),

  -- Color grade (diamonds)
  ('color_grade', 'D',  10),
  ('color_grade', 'E',  20),
  ('color_grade', 'F',  30),
  ('color_grade', 'G',  40),
  ('color_grade', 'H',  50),
  ('color_grade', 'I',  60),
  ('color_grade', 'J',  70),
  ('color_grade', 'K',  80),

  -- Payment methods
  ('payment_method', 'Check',       10),
  ('payment_method', 'Credit Card', 20),
  ('payment_method', 'Cash',        30),
  ('payment_method', 'Wire',        40)
on conflict (enum_name, value) do nothing;
