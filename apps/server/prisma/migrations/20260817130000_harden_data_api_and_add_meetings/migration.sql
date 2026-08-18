-- Prisma is the authoritative application-schema migration system.
-- Mentora's browser never queries application tables through PostgREST; all
-- application data access goes through the authenticated Express API. Revoke
-- Data API roles and enable RLS as defense in depth, with no browser policies.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LearningGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedTutor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorView" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPreferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorVerificationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dispute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DisputeEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorAvailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorStudentProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginEvent" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  "User", "Student", "LearningGoal", "Booking", "Notification",
  "SavedTutor", "TutorView", "Review", "UserPreferences", "Conversation",
  "Message", "Wallet", "PaymentMethod", "Transaction", "TutorProfile",
  "TutorVerificationEvent", "Dispute", "DisputeEvent", "SupportTicket",
  "SupportMessage", "AdminAuditLog", "AdminSetting", "TutorAvailability",
  "TutorStudentProgress", "LoginEvent"
FROM anon, authenticated;

-- Prevent later Prisma-created tables from inheriting legacy Supabase Data API
-- grants on projects created before explicit exposure became the default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER TABLE "Booking"
  ADD COLUMN "meetingProvider" TEXT,
  ADD COLUMN "meetingUrl" TEXT,
  ADD COLUMN "meetingUpdatedAt" TIMESTAMP(3);

COMMENT ON COLUMN "Booking"."meetingUrl" IS
  'Private external meeting URL. Return only from booking-authorized API routes.';
