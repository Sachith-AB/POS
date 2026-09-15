-- Add loyalty configuration and repair issue template storage.
ALTER TABLE "shop_settings"
  ADD COLUMN "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "loyaltyPointsPer100" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "repairIssueTemplates" JSONB;

-- Add optional product brand for search and catalog metadata.
ALTER TABLE "products"
  ADD COLUMN "brand" TEXT;

-- Add customer loyalty balances.
ALTER TABLE "customers"
  ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalPointsEarned" INTEGER NOT NULL DEFAULT 0;

-- Keep an immutable audit trail for earned and reversed points.
CREATE TABLE "loyalty_transactions" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "saleId" TEXT,
  "points" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_transactions_customerId_createdAt_idx"
  ON "loyalty_transactions"("customerId", "createdAt");
CREATE INDEX "loyalty_transactions_saleId_idx"
  ON "loyalty_transactions"("saleId");

ALTER TABLE "loyalty_transactions"
  ADD CONSTRAINT "loyalty_transactions_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_transactions"
  ADD CONSTRAINT "loyalty_transactions_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
