-- Storage bucket for piece photos.
-- Public-read so <img> can show photos without signed URLs;
-- write restricted to authenticated users; delete restricted to manager+.

insert into storage.buckets (id, name, public)
values ('piece-photos', 'piece-photos', true)
on conflict (id) do update set public = true;

-- Read: public (the bucket is public)
-- Insert: any authenticated user
create policy "piece-photos auth insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'piece-photos');

-- Update: any authenticated user (for replacing files)
create policy "piece-photos auth update"
  on storage.objects for update to authenticated
  using (bucket_id = 'piece-photos');

-- Delete: only manager+
create policy "piece-photos manager delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'piece-photos' and public.is_manager_or_owner());
