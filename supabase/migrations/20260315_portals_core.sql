create table if not exists public.portals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  primary_domain text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.portal_memberships (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (portal_id, user_id)
);

alter table public.courses
  add column if not exists portal_id uuid references public.portals (id) on delete cascade;

create index if not exists courses_portal_id_idx on public.courses (portal_id);
create index if not exists portal_memberships_portal_id_idx on public.portal_memberships (portal_id);
create index if not exists portal_memberships_user_id_idx on public.portal_memberships (user_id);

insert into public.portals (slug, name)
values ('superabound', 'Superabound')
on conflict (slug) do update
set name = excluded.name;

update public.courses
set portal_id = portals.id
from public.portals
where portals.slug = 'superabound'
  and public.courses.portal_id is null;

alter table public.courses
  alter column portal_id set not null;

insert into public.portal_memberships (portal_id, user_id, role)
select
  portals.id,
  profiles.id,
  case
    when profiles.role = 'admin' then 'admin'
    else 'member'
  end
from public.portals
cross join public.profiles
where portals.slug = 'superabound'
on conflict (portal_id, user_id) do update
set role = excluded.role,
    updated_at = timezone('utc', now());

create or replace function public.has_portal_role(target_portal_id uuid, allowed_roles text[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.portal_memberships
    where portal_id = target_portal_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
end;
$$;

grant execute on function public.has_portal_role(uuid, text[]) to authenticated;
grant execute on function public.has_portal_role(uuid, text[]) to anon;

create or replace function public.can_manage_profile(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.portal_memberships actor
    join public.portal_memberships target
      on target.portal_id = actor.portal_id
    where actor.user_id = auth.uid()
      and actor.role in ('owner', 'admin')
      and target.user_id = target_user_id
  );
end;
$$;

grant execute on function public.can_manage_profile(uuid) to authenticated;
grant execute on function public.can_manage_profile(uuid) to anon;

alter table public.portals enable row level security;
alter table public.portal_memberships enable row level security;

drop policy if exists "members see own portals" on public.portals;
create policy "members see own portals"
  on public.portals
  for select
  using (
    exists (
      select 1
      from public.portal_memberships
      where portal_id = portals.id
        and user_id = auth.uid()
    )
  );

drop policy if exists "portal admins manage portals" on public.portals;
create policy "portal admins manage portals"
  on public.portals
  for update
  using (public.has_portal_role(portals.id, array['owner', 'admin']))
  with check (public.has_portal_role(portals.id, array['owner', 'admin']));

drop policy if exists "members see own portal memberships" on public.portal_memberships;
create policy "members see own portal memberships"
  on public.portal_memberships
  for select
  using (
    user_id = auth.uid()
    or public.has_portal_role(portal_memberships.portal_id, array['owner', 'admin'])
  );

drop policy if exists "portal admins manage memberships" on public.portal_memberships;
create policy "portal admins manage memberships"
  on public.portal_memberships
  for all
  using (public.has_portal_role(portal_memberships.portal_id, array['owner', 'admin']))
  with check (public.has_portal_role(portal_memberships.portal_id, array['owner', 'admin']));

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
  on public.profiles
  for select
  using (auth.uid() = id or public.can_manage_profile(id));

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles
  for update
  using (auth.uid() = id or public.can_manage_profile(id))
  with check (auth.uid() = id or public.can_manage_profile(id));

drop policy if exists "admins manage profiles" on public.profiles;

create or replace function public.can_manage_course(target_course_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_portal_id uuid;
begin
  select portal_id into target_portal_id
  from public.courses
  where id = target_course_id;

  if target_portal_id is null then
    return false;
  end if;

  return public.has_portal_role(target_portal_id, array['owner', 'admin']);
end;
$$;

grant execute on function public.can_manage_course(uuid) to authenticated;
grant execute on function public.can_manage_course(uuid) to anon;

create or replace function public.can_access_course(target_course_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_portal_id uuid;
  target_status text;
begin
  select portal_id, status into target_portal_id, target_status
  from public.courses
  where id = target_course_id;

  if target_portal_id is null then
    return false;
  end if;

  if public.has_portal_role(target_portal_id, array['owner', 'admin']) then
    return true;
  end if;

  if target_status <> 'published' then
    return false;
  end if;

  return exists (
    select 1
    from public.course_enrollments
    where course_id = target_course_id
      and user_id = auth.uid()
      and status = 'active'
  );
end;
$$;

grant execute on function public.can_access_course(uuid) to authenticated;
grant execute on function public.can_access_course(uuid) to anon;

create or replace function public.can_access_module(target_module_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_course_id uuid;
begin
  select course_id into target_course_id
  from public.modules
  where id = target_module_id;

  if target_course_id is null then
    return false;
  end if;

  return public.can_access_course(target_course_id);
end;
$$;

grant execute on function public.can_access_module(uuid) to authenticated;
grant execute on function public.can_access_module(uuid) to anon;

create or replace function public.can_manage_module(target_module_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_course_id uuid;
begin
  select course_id into target_course_id
  from public.modules
  where id = target_module_id;

  if target_course_id is null then
    return false;
  end if;

  return public.can_manage_course(target_course_id);
end;
$$;

grant execute on function public.can_manage_module(uuid) to authenticated;
grant execute on function public.can_manage_module(uuid) to anon;

create or replace function public.can_access_lesson(target_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_module_id uuid;
begin
  select module_id into target_module_id
  from public.lessons
  where id = target_lesson_id;

  if target_module_id is null then
    return false;
  end if;

  return public.can_access_module(target_module_id);
end;
$$;

grant execute on function public.can_access_lesson(uuid) to authenticated;
grant execute on function public.can_access_lesson(uuid) to anon;

create or replace function public.can_manage_lesson(target_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_module_id uuid;
begin
  select module_id into target_module_id
  from public.lessons
  where id = target_lesson_id;

  if target_module_id is null then
    return false;
  end if;

  return public.can_manage_module(target_module_id);
end;
$$;

grant execute on function public.can_manage_lesson(uuid) to authenticated;
grant execute on function public.can_manage_lesson(uuid) to anon;

drop policy if exists "members see enrolled courses" on public.courses;
create policy "members see enrolled courses"
  on public.courses
  for select
  using (public.can_access_course(courses.id));

drop policy if exists "admins manage courses" on public.courses;
create policy "admins manage courses"
  on public.courses
  for all
  using (public.can_manage_course(courses.id))
  with check (public.can_manage_course(courses.id));

drop policy if exists "members see own enrollments" on public.course_enrollments;
create policy "members see own enrollments"
  on public.course_enrollments
  for select
  using (user_id = auth.uid() or public.can_manage_course(course_enrollments.course_id));

drop policy if exists "admins manage enrollments" on public.course_enrollments;
create policy "admins manage enrollments"
  on public.course_enrollments
  for all
  using (public.can_manage_course(course_enrollments.course_id))
  with check (public.can_manage_course(course_enrollments.course_id));

drop policy if exists "members see accessible modules" on public.modules;
create policy "members see accessible modules"
  on public.modules
  for select
  using (public.can_access_module(modules.id));

drop policy if exists "admins manage modules" on public.modules;
create policy "admins manage modules"
  on public.modules
  for all
  using (public.can_manage_module(modules.id))
  with check (public.can_manage_module(modules.id));

drop policy if exists "members see accessible lessons" on public.lessons;
create policy "members see accessible lessons"
  on public.lessons
  for select
  using (public.can_access_lesson(lessons.id));

drop policy if exists "admins manage lessons" on public.lessons;
create policy "admins manage lessons"
  on public.lessons
  for all
  using (public.can_manage_lesson(lessons.id))
  with check (public.can_manage_lesson(lessons.id));

drop policy if exists "members see accessible lesson blocks" on public.lesson_blocks;
create policy "members see accessible lesson blocks"
  on public.lesson_blocks
  for select
  using (public.can_access_lesson(lesson_blocks.lesson_id));

drop policy if exists "admins manage lesson blocks" on public.lesson_blocks;
create policy "admins manage lesson blocks"
  on public.lesson_blocks
  for all
  using (public.can_manage_lesson(lesson_blocks.lesson_id))
  with check (public.can_manage_lesson(lesson_blocks.lesson_id));

drop policy if exists "members see accessible downloads" on public.lesson_downloads;
create policy "members see accessible downloads"
  on public.lesson_downloads
  for select
  using (public.can_access_lesson(lesson_downloads.lesson_id));

drop policy if exists "admins manage lesson downloads" on public.lesson_downloads;
create policy "admins manage lesson downloads"
  on public.lesson_downloads
  for all
  using (public.can_manage_lesson(lesson_downloads.lesson_id))
  with check (public.can_manage_lesson(lesson_downloads.lesson_id));
