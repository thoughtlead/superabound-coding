drop policy if exists "admins manage courses" on public.courses;
drop policy if exists "admins insert courses" on public.courses;
drop policy if exists "admins update courses" on public.courses;
drop policy if exists "admins delete courses" on public.courses;

create policy "admins insert courses"
  on public.courses
  for insert
  with check (
    public.has_portal_role(courses.portal_id, array['owner', 'admin'])
  );

create policy "admins update courses"
  on public.courses
  for update
  using (public.can_manage_course(courses.id))
  with check (
    public.has_portal_role(courses.portal_id, array['owner', 'admin'])
  );

create policy "admins delete courses"
  on public.courses
  for delete
  using (public.can_manage_course(courses.id));

drop policy if exists "admins manage modules" on public.modules;
drop policy if exists "admins insert modules" on public.modules;
drop policy if exists "admins update modules" on public.modules;
drop policy if exists "admins delete modules" on public.modules;

create policy "admins insert modules"
  on public.modules
  for insert
  with check (
    public.can_manage_course(modules.course_id)
  );

create policy "admins update modules"
  on public.modules
  for update
  using (public.can_manage_module(modules.id))
  with check (
    public.can_manage_course(modules.course_id)
  );

create policy "admins delete modules"
  on public.modules
  for delete
  using (public.can_manage_module(modules.id));

drop policy if exists "admins manage lessons" on public.lessons;
drop policy if exists "admins insert lessons" on public.lessons;
drop policy if exists "admins update lessons" on public.lessons;
drop policy if exists "admins delete lessons" on public.lessons;

create policy "admins insert lessons"
  on public.lessons
  for insert
  with check (
    public.can_manage_module(lessons.module_id)
  );

create policy "admins update lessons"
  on public.lessons
  for update
  using (public.can_manage_lesson(lessons.id))
  with check (
    public.can_manage_module(lessons.module_id)
  );

create policy "admins delete lessons"
  on public.lessons
  for delete
  using (public.can_manage_lesson(lessons.id));
