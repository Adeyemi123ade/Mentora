# Backend architecture

## Goals

- Provide a stable API surface
- Validate inputs centrally (Zod)
- Keep domain logic clear and testable
- Delegate authentication to Supabase Auth instead of owning credentials

## Backend structure

- `apps/server/src/index.ts` — Express bootstrap: security headers (Helmet), gzip (Compression),
  CORS, raw-body webhook parsing, body limits, route mounting, error handler
- `apps/server/src/env.ts` — typed environment validation (fails fast when required vars are missing)
- `apps/server/src/db.ts` — Prisma client instance
- `apps/server/src/lib/` — AppError, rate limiting, Paystack helpers, Supabase clients
  (`supabase` anon + `supabaseAdmin` service role)
- `apps/server/src/middleware/` — `requireAuth` (Supabase bearer-token verification + local user sync),
  `errorHandler`, `rateLimit`
- `apps/server/src/services/` — business logic per domain (auth, booking, payment, tutor, …)
- `apps/server/src/routes/` — route handlers wired to services
- `apps/server/src/validation/` — Zod schemas
- `apps/server/src/scripts/` — seed scripts (admin + tutors)
- `apps/server/prisma/` — schema and migrations

## Auth model

1. The web app signs users up/in via the Supabase JS SDK (email/password or Google OAuth).
2. Every subsequent request sends `Authorization: Bearer <supabase access token>`.
3. `requireAuth` verifies the token with `supabase.auth.getUser(token)`, looks up the local
   `User` row by `supabaseUserId`, and materializes it on first access
   (`syncUserFromSupabase` in `auth.service.ts`).
4. Auth endpoints: `GET /api/auth/me` (profile sync), `POST /api/auth/logout` (logs a LOGOUT
   event), `POST /api/auth/reset-password` (asks Supabase to email a recovery link).
5. Password/email changes are handled client-side via `supabase.auth.updateUser`.

The local `User` table stores no password. Passwords and email confirmation live entirely in
Supabase Auth.

## Payments

- `POST /webhooks/paystack` receives the raw JSON body before the `express.json` parser, verifies
  the `x-paystack-signature` HMAC SHA-512 against the configured secret, and reconciles
  `charge.success` / `charge.failed` events (idempotent via `updateMany`).
- `lib/paystack.ts` exposes `paystackSecretKey()`, which throws a 503
  (`PAYMENTS_NOT_CONFIGURED`) when the server has no secret configured.

## Standard service flow

1. Receive request
2. Validate payload with Zod
3. Authenticate via Supabase bearer token
4. Route to service layer
5. Query or mutate data layer (Prisma)
6. Return typed JSON response

## Conventions

- ESM + TypeScript with `.js` import extensions (`"type": "module"`)
- Errors propagate through `AppError` → `errorHandler` → `{ success, message, error }` envelope
- Photos are uploaded to Supabase Storage bucket `profile-photos` (public) via `storage.service.ts`
