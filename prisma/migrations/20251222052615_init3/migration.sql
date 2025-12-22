/*
  Warnings:

  - The `categories` column on the `Blog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tags` column on the `Blog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BlogCategory" AS ENUM ('Web_Development', 'Tutorial', 'Design', 'Programming', 'News');

-- CreateEnum
CREATE TYPE "BlogTags" AS ENUM ('REACT', 'JAVASCRIPT', 'TYPESCRIPT', 'CSS', 'HTML', 'NODE_JS', 'DESIGN', 'UI_UX');

-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "categories",
ADD COLUMN     "categories" "BlogCategory"[],
DROP COLUMN "tags",
ADD COLUMN     "tags" "BlogTags"[];
