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
