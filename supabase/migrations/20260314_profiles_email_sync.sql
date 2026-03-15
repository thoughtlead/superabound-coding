update public.profiles
set email = auth_users.email
from auth.users as auth_users
where public.profiles.id = auth_users.id
  and public.profiles.email <> auth_users.email;

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    email = new.email,
    full_name = coalesce(new.raw_user_meta_data ->> 'full_name', public.profiles.full_name, new.email)
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_auth_user_updated();
