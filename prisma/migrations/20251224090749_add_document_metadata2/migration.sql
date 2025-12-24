/*
  Warnings:

  - You are about to drop the `DocumentAudit` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "format" TEXT,
ADD COLUMN     "size" INTEGER;

-- DropTable
DROP TABLE "public"."DocumentAudit";

-- DropEnum
DROP TYPE "public"."DocumentAuditAction";

-- CreateIndex
CREATE INDEX "Appointment_appointmentNo_idx" ON "Appointment"("appointmentNo");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNo_idx" ON "Invoice"("invoiceNo");
