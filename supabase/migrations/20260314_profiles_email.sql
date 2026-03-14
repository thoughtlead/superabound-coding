alter table public.profiles
  add column if not exists email text;

update public.profiles
set email = auth_users.email
from auth.users as auth_users
where public.profiles.id = auth_users.id
  and (public.profiles.email is null or public.profiles.email <> auth_users.email);

alter table public.profiles
  alter column email set not null;

create unique index if not exists profiles_email_key on public.profiles (email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'member'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  return new;
end;
$$;
