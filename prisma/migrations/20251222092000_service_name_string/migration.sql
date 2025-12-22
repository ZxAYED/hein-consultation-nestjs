-- AlterTable
ALTER TABLE "ScheduleSlot"
ALTER COLUMN "serviceName" TYPE TEXT
USING ("serviceName"::text);

-- AlterTable
ALTER TABLE "Appointment"
ALTER COLUMN "serviceName" TYPE TEXT
USING ("serviceName"::text);

-- DropEnum
DROP TYPE IF EXISTS "ServiceName";

