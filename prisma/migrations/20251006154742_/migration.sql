-- CreateTable
CREATE TABLE "filterOptions" (
    "id" TEXT NOT NULL,
    "filterId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "count" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filterOptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "filterOptions" ADD CONSTRAINT "filterOptions_filterId_fkey" FOREIGN KEY ("filterId") REFERENCES "filters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
