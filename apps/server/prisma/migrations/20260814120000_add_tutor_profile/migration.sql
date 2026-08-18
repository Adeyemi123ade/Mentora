-- CreateEnum
CREATE TYPE "TutorVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "professionalTitle" TEXT,
    "bio" TEXT,
    "country" TEXT,
    "city" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gradeLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" TEXT,
    "qualification" TEXT,
    "teachingFormats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionDurationMinutes" INTEGER,
    "sessionPrice" INTEGER,
    "profileCompletedAt" TIMESTAMP(3),
    "idType" TEXT,
    "idFrontUrl" TEXT,
    "idBackUrl" TEXT,
    "institutionName" TEXT,
    "certificateUrl" TEXT,
    "supportingDocUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceDescription" TEXT,
    "declarationAccurate" BOOLEAN NOT NULL DEFAULT false,
    "declarationMisinfo" BOOLEAN NOT NULL DEFAULT false,
    "declarationConsent" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "TutorVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
