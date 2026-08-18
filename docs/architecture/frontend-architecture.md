# Frontend architecture

## Goals

- Deliver a responsive product experience
- Keep components modular and reusable
- Support intuitive navigation and predictable interactions
- Drive authentication from a single shared context

## Frontend structure

- `apps/web/src/main.tsx` — app bootstrap (`BrowserRouter` + root render)
- `apps/web/src/App.tsx` — route table, `AuthProvider`, route guards (`RequireAuth` with role
  checks), landing/auth/verify/forgot-password/reset-password flows
- `apps/web/src/context/AuthContext.tsx` — single source of truth for the session:
  - listens to `supabase.auth.onAuthStateChange`
  - syncs the local profile via `GET /api/auth/me`
  - exposes `signIn`, `signUp`, `signInWithGoogle`, `sendPasswordResetEmail`, `refreshUser`
- `apps/web/src/lib/supabase.ts` — Supabase JS client (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`)
- `apps/web/src/lib/api.ts` — typed fetch wrapper that attaches the Supabase bearer token and
  signs out locally on 401
- `apps/web/src/pages/` — route pages (dashboard, tutor, admin, settings, …)
- `apps/web/src/components/` — shared UI components (Icons, Avatar, Modal, PhotoUploader, …)
- `apps/web/src/lib/scheduling.ts`, `lib/tutorAdapter.ts` — domain helpers covered by unit tests
- `apps/web/src/styles.css` — design-system styling tokens

## Auth flows

- **Sign up**: `supabase.auth.signUp({ email, password, options: { data: { name, role } } })` →
  user is taken to `/verify` ("check your inbox") since email confirmation is required.
- **Sign in**: `supabase.auth.signInWithPassword` → `refreshUser()` → redirect by role
  (`roleHome()`).
- **Google**: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin } })`.
- **Forgot password**: `resetPasswordForEmail` with `redirectTo: /reset-password`; the recovery
  link lands on `/reset-password`, which sets the new password via `supabase.auth.updateUser`.
- **Route guards**: `RequireAuth` blocks unauthenticated users (→ `/login`) and enforces roles
  (e.g. `/tutor` requires `TUTOR`, `/admin` requires `ADMIN`).
- **Logout**: `supabase.auth.signOut()` + `POST /api/auth/logout`, then redirect to `/login`.

## UX guidance

- Mobile-first layout patterns
- Clear visual hierarchy
- Accessible color contrast and spacing scale
- Card-based content blocks for higher comprehension
