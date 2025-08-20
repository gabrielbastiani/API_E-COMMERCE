-- AlterTable
ALTER TABLE "filters" ADD COLUMN     "attributeKeyId" TEXT;

-- CreateTable
CREATE TABLE "attributeKeys" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attributeKeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attributeKeys_slug_key" ON "attributeKeys"("slug");

-- AddForeignKey
ALTER TABLE "filters" ADD CONSTRAINT "filters_attributeKeyId_fkey" FOREIGN KEY ("attributeKeyId") REFERENCES "attributeKeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
