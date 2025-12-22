-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetPasswordOtp" TEXT,
ADD COLUMN     "resetPasswordOtpExpireIn" TIMESTAMP(3);
