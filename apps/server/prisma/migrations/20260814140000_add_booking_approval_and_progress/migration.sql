-- CreateEnum
CREATE TYPE "BookingApprovalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "approvalStatus" "BookingApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- Backfill: bookings created before this feature existed were created under the
-- old instant-confirm model, so they should read as already accepted rather than
-- suddenly appearing as awaiting tutor approval.
UPDATE "Booking" SET "approvalStatus" = 'ACCEPTED', "respondedAt" = "createdAt" WHERE "status" != 'CANCELLED';

-- CreateTable
CREATE TABLE "TutorStudentProgress" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorStudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutorStudentProgress_tutorId_idx" ON "TutorStudentProgress"("tutorId");

-- CreateIndex
CREATE INDEX "TutorStudentProgress_studentId_idx" ON "TutorStudentProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorStudentProgress_tutorId_studentId_key" ON "TutorStudentProgress"("tutorId", "studentId");

-- CreateIndex
CREATE INDEX "Booking_tutorId_idx" ON "Booking"("tutorId");

-- AddForeignKey
ALTER TABLE "TutorStudentProgress" ADD CONSTRAINT "TutorStudentProgress_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorStudentProgress" ADD CONSTRAINT "TutorStudentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
