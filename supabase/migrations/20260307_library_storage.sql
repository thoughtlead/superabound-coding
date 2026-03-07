insert into storage.buckets (id, name, public)
values ('library-assets', 'library-assets', true)
on conflict (id) do nothing;

drop policy if exists "admins upload library assets" on storage.objects;
create policy "admins upload library assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'library-assets'
    and public.is_admin()
  );

drop policy if exists "admins update library assets" on storage.objects;
create policy "admins update library assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'library-assets'
    and public.is_admin()
  )
  with check (
    bucket_id = 'library-assets'
    and public.is_admin()
  );

drop policy if exists "admins delete library assets" on storage.objects;
create policy "admins delete library assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'library-assets'
    and public.is_admin()
  );
