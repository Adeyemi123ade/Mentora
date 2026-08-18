-- AlterTable
ALTER TABLE "UserPreferences" DROP COLUMN "promotions",
DROP COLUMN "smsNotifications",
ADD COLUMN     "announcements" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quietHoursEnd" TEXT NOT NULL DEFAULT '07:00',
ADD COLUMN     "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
ADD COLUMN     "reviewNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sessionReminders" BOOLEAN NOT NULL DEFAULT true;
