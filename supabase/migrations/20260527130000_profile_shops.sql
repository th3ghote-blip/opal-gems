-- Many-to-many: staff members can be assigned to multiple shops.
create table if not exists public.profile_shops (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  shop_id    uuid not null references public.shops(id)    on delete cascade,
  primary key (profile_id, shop_id)
);

alter table public.profile_shops enable row level security;

-- Owner can manage all assignments
create policy "owner_all" on public.profile_shops
  for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- Staff/managers can read their own assignments
create policy "self_read" on public.profile_shops
  for select to authenticated
  using (profile_id = auth.uid());
