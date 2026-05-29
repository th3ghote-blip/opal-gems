create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  shop_id     uuid references public.shops(id) on delete set null,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index activity_log_created_idx  on public.activity_log (created_at desc);
create index activity_log_profile_idx  on public.activity_log (profile_id);
create index activity_log_shop_idx     on public.activity_log (shop_id);

alter table public.activity_log enable row level security;

-- Owner reads all; service-role (admin client) inserts bypass RLS.
create policy "owner_read" on public.activity_log
  for select to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  ));
