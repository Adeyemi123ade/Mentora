ALTER TABLE "Student" ADD COLUMN "loginId" TEXT;
ALTER TABLE "Student" ADD COLUMN "accountUserId" TEXT;

UPDATE "Student"
SET "loginId" = 'MEN-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8));

ALTER TABLE "Student" ALTER COLUMN "loginId" SET NOT NULL;
CREATE UNIQUE INDEX "Student_loginId_key" ON "Student"("loginId");
CREATE UNIQUE INDEX "Student_accountUserId_key" ON "Student"("accountUserId");
ALTER TABLE "Student" ADD CONSTRAINT "Student_accountUserId_fkey"
  FOREIGN KEY ("accountUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
