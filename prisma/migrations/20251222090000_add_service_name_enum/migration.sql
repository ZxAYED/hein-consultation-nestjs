-- CreateEnum
CREATE TYPE "ServiceName" AS ENUM (
  'SAP_CONSULTING_SESSION',
  'FINANCIAL_AUDIT',
  'SAP_SYSTEM_OPTIMIZATION',
  'PROCESS_AUTOMATION'
);

-- AlterTable
ALTER TABLE "ScheduleSlot"
ALTER COLUMN "serviceName" TYPE "ServiceName"
USING ("serviceName"::"ServiceName");

-- AlterTable
ALTER TABLE "Appointment"
ALTER COLUMN "serviceName" TYPE "ServiceName"
USING ("serviceName"::"ServiceName");

