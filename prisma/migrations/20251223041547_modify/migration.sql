/*
  Warnings:

  - You are about to drop the column `fileFormat` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `fileMimeType` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `fileSizeBytes` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "fileFormat",
DROP COLUMN "fileMimeType",
DROP COLUMN "fileSizeBytes";
