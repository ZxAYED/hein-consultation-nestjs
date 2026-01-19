/*
  Warnings:

  - You are about to drop the column `isRead` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "isRead",
ADD COLUMN     "isAdminRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCustomerRead" BOOLEAN NOT NULL DEFAULT false;
