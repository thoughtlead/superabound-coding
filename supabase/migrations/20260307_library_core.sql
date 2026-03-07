create extension if not exists "pgcrypto";

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'member'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  thumbnail_url text,
  course_type text not null default 'evergreen',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (course_id, user_id)
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  thumbnail_url text,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (module_id, slug)
);

create table if not exists public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  block_type text not null check (block_type in ('video', 'audio', 'rich_text', 'download')),
  title text,
  body text,
  media_provider text,
  media_url text,
  embed_url text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lesson_downloads (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  file_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;
alter table public.lesson_downloads enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
  on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles
  for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
  on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members see enrolled courses" on public.courses;
create policy "members see enrolled courses"
  on public.courses
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.course_enrollments
      where course_id = courses.id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

drop policy if exists "admins manage courses" on public.courses;
create policy "admins manage courses"
  on public.courses
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members see own enrollments" on public.course_enrollments;
create policy "members see own enrollments"
  on public.course_enrollments
  for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage enrollments" on public.course_enrollments;
create policy "admins manage enrollments"
  on public.course_enrollments
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members see accessible modules" on public.modules;
create policy "members see accessible modules"
  on public.modules
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.course_enrollments
      where course_id = modules.course_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

drop policy if exists "admins manage modules" on public.modules;
create policy "admins manage modules"
  on public.modules
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members see accessible lessons" on public.lessons;
create policy "members see accessible lessons"
  on public.lessons
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.modules
      join public.course_enrollments on course_enrollments.course_id = modules.course_id
      where modules.id = lessons.module_id
        and course_enrollments.user_id = auth.uid()
        and course_enrollments.status = 'active'
    )
  );

drop policy if exists "admins manage lessons" on public.lessons;
create policy "admins manage lessons"
  on public.lessons
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members see accessible lesson blocks" on public.lesson_blocks;
create policy "members see accessible lesson blocks"
  on public.lesson_blocks
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.course_enrollments on course_enrollments.course_id = modules.course_id
      where lessons.id = lesson_blocks.lesson_id
        and course_enrollments.user_id = auth.uid()
        and course_enrollments.status = 'active'
    )
  );

drop policy if exists "admins manage lesson blocks" on public.lesson_blocks;
create policy "admins manage lesson blocks"
  on public.lesson_blocks
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members see accessible downloads" on public.lesson_downloads;
create policy "members see accessible downloads"
  on public.lesson_downloads
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.lessons
      join public.modules on modules.id = lessons.module_id
      join public.course_enrollments on course_enrollments.course_id = modules.course_id
      where lessons.id = lesson_downloads.lesson_id
        and course_enrollments.user_id = auth.uid()
        and course_enrollments.status = 'active'
    )
  );

drop policy if exists "admins manage lesson downloads" on public.lesson_downloads;
create policy "admins manage lesson downloads"
  on public.lesson_downloads
  for all
  using (public.is_admin())
  with check (public.is_admin());
