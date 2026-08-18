# MENTORA

A full-stack learning platform that connects learners (and their parents) with verified tutors.

## Stack

- **Frontend**: React 18 + Vite + TypeScript (`apps/web`)
- **Backend**: Node.js + Express + TypeScript (`apps/server`)
- **Auth & storage**: Supabase Auth (email + Google OAuth) and Supabase Storage
- **Database**: PostgreSQL via Prisma ORM
- **Payments**: Paystack (initialization + signed webhooks)
- **Shared**: reusable contracts and business constants (`packages/shared`)
- **Tests / CI**: Vitest + GitHub Actions

## Project structure

- `apps/web` — user-facing experience
- `apps/server` — API, services, and database integration
- `packages/shared` — shared types and utilities
- `supabase/` — local Supabase config (auth, storage buckets, OAuth providers)
- `docs/architecture` — technical and product architecture notes

## Quick start

1. Install dependencies: `npm install`
2. Start the local database: `docker compose up -d`
3. Copy the environment templates:
   - `apps/server/.env.example` → `apps/server/.env`
   - `apps/web/.env.example` → `apps/web/.env`
4. Fill in the real values (Supabase URL/anon key, service-role key, Paystack keys).
5. Apply the Prisma schema and seed data:
   - `npm run db:generate`
   - `npm run db:migrate`
   - `npm run db:seed` (creates `admin@mentora.dev` admin + 12 tutor accounts)
6. Start the project: `npm run dev`
7. Open the web app at `http://localhost:5173` (API on `http://localhost:4000`).

### Seeded accounts

| Role  | Email                            | Password        |
| ----- | -------------------------------- | --------------- |
| Admin | `admin@mentora.dev`              | `AdminPass123!` |
| Tutor | `t1@mentora-tutors.dev` … `t12@` | `TutorPass123!` |

Existing Supabase accounts are left untouched by the seed scripts; a tutor's password is only
set when their account is first created.

## Authentication

Authentication is handled client-side through the Supabase JS SDK:

- Email/password sign-up, sign-in, email confirmation and password reset
- Google sign-in via `signInWithOAuth`
- The server verifies every request's `Authorization: Bearer <supabase-token>` header and
  materializes the matching `User` row on first access (`/api/auth/me`)

Google OAuth must be enabled in Supabase (Dashboard → Authentication → Providers) using the
Google Cloud Console credentials. The local config in `supabase/config.toml` reads the client ID
and secret from `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`.

## Payments

- The client initializes Paystack transactions and verifies them server-side
- `POST /webhooks/paystack` verifies the HMAC SHA-512 signature before reconciling transactions
- Payments are disabled until a `PAYSTACK_SECRET_KEY` is set in `apps/server/.env`

## Tests & CI

- Unit tests run with Vitest per workspace (`npm test`); the shared library has the core business rules
- CI (`.github/workflows/ci.yml`) runs typecheck, tests and production builds on every push/PR

## Default ports

- Web app: `http://localhost:5173`
- API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`
