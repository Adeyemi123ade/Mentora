# Database access and migration ownership

## Runtime architecture

Mentora uses Prisma from the Express server for all application-table reads and writes. The React browser client does not call Supabase PostgREST, RPC, or Realtime for application data. Supabase provides authentication and storage. The browser receives only the public Supabase URL and anonymous key for Auth; the service-role key is read only by the server.

## Migration authority

`apps/server/prisma/migrations` is the authoritative, ordered migration history for the application schema and Supabase-specific database controls. This includes application tables, indexes, RLS/grants, and Storage bucket policy SQL. Deploy with `prisma migrate deploy` after reviewing pending migrations.

The file under `supabase/migrations` duplicates the student-auth identity migration already present in Prisma history. It is retained for historical safety during this release but must not be run independently. No new application-schema migration should be added there. A later cleanup may archive it only after production migration history is reconciled; do not delete or rename it during release preparation.

## Data API boundary

Application tables are server-only. The authoritative hardening migration enables RLS and revokes all table privileges from `anon` and `authenticated`, including legacy default privileges for future tables. No direct browser policies are created because no browser application-data access is required. Public tutor discovery remains available through the deliberately public Express `/api/tutors` endpoints, which return a restricted DTO rather than the private `TutorProfile` row.

| Tables | Access boundary |
| --- | --- |
| User, Student, UserPreferences, LoginEvent | Authenticated Express API; ownership/role checked server-side |
| Booking, LearningGoal, Notification, SavedTutor, TutorView, Review | Authenticated Express API; parent/student/tutor relationships checked server-side |
| Conversation, Message | Authenticated Express API; conversation participants and booking relationship checked server-side |
| Wallet, PaymentMethod, Transaction | Authenticated parent API; user ownership checked server-side |
| TutorProfile, TutorAvailability, TutorStudentProgress | Tutor-owned writes; restricted public DTOs and booking-linked student access |
| TutorVerificationEvent, Dispute, DisputeEvent, SupportTicket, SupportMessage | Role- and relationship-checked Express API |
| AdminAuditLog, AdminSetting | Admin-only Express API |

## Storage boundary

`profile-photos` is intentionally public for display avatars, but uploads and deletes are performed only by the server. `tutor-documents` is private and has no `anon` or `authenticated` object policies; uploads, deletion, and short-lived signed URLs are server-only. Signed document URLs are issued only through authenticated tutor/admin flows.

## Deployment status

Migration status on 2026-08-17 reported four pending Prisma migrations: admin operations, admin indexes, the private tutor-document bucket, and the RLS/meeting migration. This check was read-only. Apply them through the controlled release migration step; do not run the duplicate Supabase migration.
