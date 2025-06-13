/*
  Warnings:

  - The values [PRICE_TABLE_ADJUST,FIXED_DISCOUNT_BY_QTY,FIXED_DISCOUNT_VARIANT,FIXED_DISCOUNT_PRODUCT,PERCENT_DISCOUNT_RECURR,PERCENT_DISCOUNT_CATEGORY,PERCENT_DISCOUNT_VARIANT,PERCENT_DISCOUNT_PRODUCT,PERCENT_DISCOUNT_BRAND,PERCENT_DISCOUNT_QTY_PRODUCT,PERCENT_DISCOUNT_EXTREME,PERCENT_DISCOUNT_SHIPPING,PERCENT_DISCOUNT_SUBTOTAL,PERCENT_DISCOUNT_TOTAL_BEFORE,PERCENT_DISCOUNT_PER_PRODUCT,FIXED_DISCOUNT_BRAND,FIXED_DISCOUNT_SHIPPING,FIXED_DISCOUNT_SUBTOTAL,FIXED_DISCOUNT_TOTAL_BEFORE,FIXED_DISCOUNT_PER_PRODUCT] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [CATEGORY_VARIANT_COUNT] on the enum `ConditionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `coupons` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActionType_new" AS ENUM ('FIXED_VARIANT_DISCOUNT', 'FIXED_PRODUCT_DISCOUNT', 'FREE_VARIANT_ITEM', 'FREE_PRODUCT_ITEM', 'PERCENT_CATEGORY', 'PERCENT_VARIANT', 'PERCENT_PRODUCT', 'PERCENT_BRAND_ITEMS', 'PERCENT_ITEM_COUNT', 'PERCENT_EXTREME_ITEM', 'PERCENT_SHIPPING', 'PERCENT_SUBTOTAL', 'PERCENT_TOTAL_NO_SHIPPING', 'PERCENT_TOTAL_PER_PRODUCT', 'FIXED_BRAND_ITEMS', 'FIXED_SHIPPING', 'FIXED_SUBTOTAL', 'FIXED_TOTAL_NO_SHIPPING', 'FIXED_TOTAL_PER_PRODUCT', 'MAX_SHIPPING_DISCOUNT');
ALTER TABLE "promotion_actions" ALTER COLUMN "type" TYPE "ActionType_new" USING ("type"::text::"ActionType_new");
ALTER TYPE "ActionType" RENAME TO "ActionType_old";
ALTER TYPE "ActionType_new" RENAME TO "ActionType";
DROP TYPE "ActionType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ConditionType_new" AS ENUM ('FIRST_ORDER', 'CART_ITEM_COUNT', 'UNIQUE_VARIANT_COUNT', 'ZIP_CODE', 'PRODUCT_CODE', 'VARIANT_CODE', 'STATE', 'CATEGORY', 'CATEGORY_ITEM_COUNT', 'CATEGORY_VALUE', 'BRAND_VALUE', 'VARIANT_ITEM_COUNT', 'PRODUCT_ITEM_COUNT', 'PERSON_TYPE', 'USER', 'SUBTOTAL_VALUE', 'TOTAL_VALUE');
ALTER TABLE "promotion_conditions" ALTER COLUMN "type" TYPE "ConditionType_new" USING ("type"::text::"ConditionType_new");
ALTER TYPE "ConditionType" RENAME TO "ConditionType_old";
ALTER TYPE "ConditionType_new" RENAME TO "ConditionType";
DROP TYPE "ConditionType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Operator" ADD VALUE 'NOT_EQUAL';
ALTER TYPE "Operator" ADD VALUE 'CONTAINS';
ALTER TYPE "Operator" ADD VALUE 'NOT_CONTAINS';
ALTER TYPE "Operator" ADD VALUE 'EVERY';

-- DropForeignKey
ALTER TABLE "coupons" DROP CONSTRAINT "coupons_promotion_id_fkey";

-- DropTable
DROP TABLE "coupons";

-- CreateTable
CREATE TABLE "promotion_coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotion_coupons_code_key" ON "promotion_coupons"("code");

-- AddForeignKey
ALTER TABLE "promotion_coupons" ADD CONSTRAINT "promotion_coupons_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
