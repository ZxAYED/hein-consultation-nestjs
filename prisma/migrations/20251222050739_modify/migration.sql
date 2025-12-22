/*
  Warnings:

  - The values [Panding] on the enum `InvoiceStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `categories` column on the `Blog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tags` column on the `Blog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `customerId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `documentLink` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `clientName` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `companyName` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `createdDate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `issuedBy` on the `Invoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNo]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[appointmentId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileUrl` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceNo` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `issuedAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BlogCategory" AS ENUM ('Web_Development', 'Tutorial', 'Design', 'Programming', 'News');

-- CreateEnum
CREATE TYPE "BlogTags" AS ENUM ('REACT', 'JAVASCRIPT', 'TYPESCRIPT', 'CSS', 'HTML', 'NODE_JS', 'DESIGN', 'UI_UX');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('Upcoming', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('Virtual', 'InPerson', 'Phone');

-- CreateEnum
CREATE TYPE "DocumentAuditAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'DOWNLOADED', 'DELETED');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('Available', 'Booked', 'Disabled');

-- CreateEnum
CREATE TYPE "ServiceName" AS ENUM ('SAP_CONSULTING_SESSION', 'FINANCIAL_AUDIT', 'SAP_SYSTEM_OPTIMIZATION', 'PROCESS_AUTOMATION');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'Compliance';

-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceStatus_new" AS ENUM ('Paid', 'Pending', 'Overdue');
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus_new" USING ("status"::text::"InvoiceStatus_new");
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "public"."InvoiceStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_email_fkey";

-- DropIndex
DROP INDEX "public"."Invoice_invoiceId_key";

-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "categories",
ADD COLUMN     "categories" "BlogCategory"[],
DROP COLUMN "tags",
ADD COLUMN     "tags" "BlogTags"[];

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "customerId",
DROP COLUMN "documentLink",
ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "fileUrl" TEXT NOT NULL,
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "clientName",
DROP COLUMN "companyName",
DROP COLUMN "createdDate",
DROP COLUMN "email",
DROP COLUMN "invoiceId",
DROP COLUMN "issuedBy",
ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invoiceNo" TEXT NOT NULL,
ADD COLUMN     "issuedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL,
    "serviceName" "ServiceName" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "status" "SlotStatus" NOT NULL,
    "appointmentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "appointmentNo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceName" "ServiceName" NOT NULL,
    "slotId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "meetingType" "MeetingType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAudit" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" "DocumentAuditAction" NOT NULL,
    "performedById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSlot_appointmentId_key" ON "ScheduleSlot"("appointmentId");

-- CreateIndex
CREATE INDEX "ScheduleSlot_serviceName_date_idx" ON "ScheduleSlot"("serviceName", "date");

-- CreateIndex
CREATE INDEX "ScheduleSlot_date_startTime_idx" ON "ScheduleSlot"("date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_appointmentNo_key" ON "Appointment"("appointmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_slotId_key" ON "Appointment"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "Invoice_appointmentId_idx" ON "Invoice"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_appointmentId_key" ON "Invoice"("appointmentId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ScheduleSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAudit" ADD CONSTRAINT "DocumentAudit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
