-- CreateTable
CREATE TABLE "SavedTutor" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorView" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedTutor_parentId_idx" ON "SavedTutor"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTutor_parentId_tutorId_key" ON "SavedTutor"("parentId", "tutorId");

-- CreateIndex
CREATE INDEX "TutorView_parentId_idx" ON "TutorView"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorView_parentId_tutorId_key" ON "TutorView"("parentId", "tutorId");

-- AddForeignKey
ALTER TABLE "SavedTutor" ADD CONSTRAINT "SavedTutor_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorView" ADD CONSTRAINT "TutorView_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
