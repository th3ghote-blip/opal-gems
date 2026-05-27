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

-- Shops the current user can access: owner -> all, everyone else -> profile_shops junction.
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
  else
    return query select shop_id from public.profile_shops where profile_id = v_uid;
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
