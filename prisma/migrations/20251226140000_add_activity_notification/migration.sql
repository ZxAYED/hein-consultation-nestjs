-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM (
  'DOCUMENT_UPLOADED',
  'DOCUMENT_APPROVED',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_STATUS_CHANGED',
  'INVOICE_CREATED',
  'INVOICE_PAID',
  'BLOG_CREATED',
  'ADMIN_MANUAL'
);

-- CreateTable
CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "event" "NotificationEvent" NOT NULL,
  "entityId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "userId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "event" "NotificationEvent" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
