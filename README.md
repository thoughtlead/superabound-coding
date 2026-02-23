# Next.js + Supabase Auth Starter

This project implements:

- Email magic-link login via Supabase
- Auth-protected `/library` route
- `/account` page with logout
- Redirects unauthenticated users from `/library` to `/login`

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

4. In Supabase Auth settings, set your site URL (for local dev):

- `http://localhost:3000`

5. Run the app:

```bash
npm run dev
```

## Routes

- `/login`: email magic-link sign in
- `/library`: protected page for authenticated users
- `/account`: account details + logout
