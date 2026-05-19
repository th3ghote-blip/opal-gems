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
