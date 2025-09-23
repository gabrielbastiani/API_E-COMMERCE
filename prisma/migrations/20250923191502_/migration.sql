/*
  Warnings:

  - The values [DELETED] on the enum `QuestionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QuestionStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "questionsproducts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "questionsproducts" ALTER COLUMN "status" TYPE "QuestionStatus_new" USING ("status"::text::"QuestionStatus_new");
ALTER TYPE "QuestionStatus" RENAME TO "QuestionStatus_old";
ALTER TYPE "QuestionStatus_new" RENAME TO "QuestionStatus";
DROP TYPE "QuestionStatus_old";
ALTER TABLE "questionsproducts" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "ecommerceDatas" ADD COLUMN     "resume_about_store" TEXT;
