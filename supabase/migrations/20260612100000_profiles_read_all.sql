-- Allow all authenticated users to read all profiles.
-- Needed so the sell form can show all staff in the salesperson dropdown.
drop policy if exists profiles_self_read on public.profiles;

create policy profiles_read on public.profiles
  for select to authenticated
  using (true);
