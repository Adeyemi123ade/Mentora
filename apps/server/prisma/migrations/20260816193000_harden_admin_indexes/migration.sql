CREATE INDEX "Review_moderatedById_idx" ON "Review"("moderatedById");
CREATE INDEX "Dispute_openedById_idx" ON "Dispute"("openedById");

-- Login events are written and read only by the trusted application server.
ALTER TABLE "LoginEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LoginEvent" FROM anon, authenticated;
