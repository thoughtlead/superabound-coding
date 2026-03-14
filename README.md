# Superabound Library

This project implements:

- Email/password auth via Supabase
- Member library with course, module, lesson hierarchy
- Admin course editor and lesson editor
- Cloudflare Stream uploads for video blocks
- Course enrollment management for first-user rollout

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for import scripts
- `CLOUDFLARE_STREAM_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_API_TOKEN`
- `CLOUDFLARE_STREAM_CUSTOMER_CODE`

4. In Supabase Auth settings, set your site URL (for local dev):

- `http://localhost:3000`

5. Run the app:

```bash
npm run dev
```

## Routes

- `/login`: password sign in
- `/signup`: account creation
- `/library`: protected member library
- `/admin/courses`: course and lesson administration
- `/admin/enrollments`: access management

## Kajabi Import

The migration flow is file-based so one course can be mapped and validated before bulk import.

1. Copy the example payload:

```bash
cp scripts/kajabi-import.example.json scripts/my-course-import.json
```

2. Fill it with one mapped Kajabi course.
   For Dropbox-hosted videos, put the shared file URL in a video block's `sourceUrl`.
   The importer will normalize Dropbox links to `dl=1`, ask Cloudflare Stream to copy the file,
   and then store the resulting Cloudflare video ID/embed URL in `lesson_blocks`.

3. Dry run the import:

```bash
npm run import:kajabi -- scripts/my-course-import.json --dry-run
```

4. Run the import:

```bash
npm run import:kajabi -- scripts/my-course-import.json
```

The importer upserts courses by slug, recreates that course's module/lesson tree, and optionally restores enrollments for existing users matched by `profiles.email`.
