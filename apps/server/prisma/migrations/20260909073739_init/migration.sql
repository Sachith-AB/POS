/*
  Warnings:

  - A unique constraint covering the columns `[nic]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[agreementBarcode]` on the table `installment_plans` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InstallmentPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('RETAIL', 'WHOLESALE', 'BUSINESS');

-- CreateEnum
CREATE TYPE "InterestMethod" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "LateFeeMethod" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CommissionMethod" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "SupplierTransactionType" AS ENUM ('PURCHASE', 'PAYMENT', 'RETURN_CREDIT');

-- CreateEnum
CREATE TYPE "SupplierReturnReason" AS ENUM ('DEFECTIVE', 'DAMAGED', 'WRONG_ITEM');

-- CreateEnum
CREATE TYPE "TradeInStatus" AS ENUM ('PENDING', 'ADJUSTED', 'IN_STOCK', 'SOLD');

-- CreateEnum
CREATE TYPE "DefaultActionType" AS ENUM ('WARNING', 'BLOCK', 'SUSPEND', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OutsourcedRepairStatus" AS ENUM ('SENT', 'IN_PROGRESS', 'RETURNED', 'CANCELLED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nic" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "installment_plans" ADD COLUMN     "agreementBarcode" TEXT,
ADD COLUMN     "downPaymentPercent" DECIMAL(5,2),
ADD COLUMN     "guarantorConsentGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guarantorPhotoUrl" TEXT,
ADD COLUMN     "interestAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "interestMethod" "InterestMethod" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "interestValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateFeeMethod" "LateFeeMethod",
ADD COLUMN     "lateFeeValue" DECIMAL(12,2),
ADD COLUMN     "totalPayable" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "businessPrice" DECIMAL(12,2),
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "warrantyDurationDays" INTEGER,
ADD COLUMN     "warrantyPeriodId" TEXT,
ADD COLUMN     "wholesalePrice" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "repair_tickets" ADD COLUMN     "advancePayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionAmount" DECIMAL(12,2),
ADD COLUMN     "commissionMethod" "CommissionMethod",
ADD COLUMN     "commissionValue" DECIMAL(12,2),
ADD COLUMN     "isThreeDayWarranty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "technicianId" TEXT,
ADD COLUMN     "warrantyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "warrantyPeriodId" TEXT,
ADD COLUMN     "warrantySaleId" TEXT;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "priceType" "PriceType" NOT NULL DEFAULT 'RETAIL',
ADD COLUMN     "warrantyDurationDays" INTEGER,
ADD COLUMN     "warrantyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "warrantyPeriodId" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "discountPercent" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "warrantyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "warrantyPeriodId" TEXT;

-- AlterTable
ALTER TABLE "shop_settings" ADD COLUMN     "defaultCommissionMethod" "CommissionMethod" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "defaultCommissionValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "defaultDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
ADD COLUMN     "defaultDownPaymentPercent" DECIMAL(5,2) NOT NULL DEFAULT 35,
ADD COLUMN     "defaultInterestMethod" "InterestMethod" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "defaultInterestValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "defaultLateFeeMethod" "LateFeeMethod" NOT NULL DEFAULT 'FIXED_AMOUNT',
ADD COLUMN     "defaultLateFeeValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "defaultTechnicianId" TEXT,
ADD COLUMN     "firstDaysWarrantyDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "textlkApiToken" TEXT,
ADD COLUMN     "textlkSenderId" TEXT,
ADD COLUMN     "uncollectedRepairDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "customer_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "color" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_category_assignments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_category_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "totalPayable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_transactions" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" "SupplierTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_returns" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serializedItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "reason" "SupplierReturnReason" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_periods" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "appliesToSales" BOOLEAN NOT NULL DEFAULT true,
    "appliesToRepairs" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warranty_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_ins" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerPhone" TEXT,
    "customerName" TEXT,
    "deviceInfo" TEXT NOT NULL,
    "imei" TEXT,
    "condition" TEXT NOT NULL,
    "tradeInValue" DECIMAL(12,2) NOT NULL,
    "status" "TradeInStatus" NOT NULL DEFAULT 'PENDING',
    "saleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_actions" (
    "id" TEXT NOT NULL,
    "triggerDaysOverdue" INTEGER NOT NULL,
    "actionType" "DefaultActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "default_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outsourced_repairs" (
    "id" TEXT NOT NULL,
    "repairTicketId" TEXT NOT NULL,
    "outsourcedTo" TEXT NOT NULL,
    "sentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "status" "OutsourcedRepairStatus" NOT NULL DEFAULT 'SENT',
    "reminder" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outsourced_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_categories_name_key" ON "customer_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "customer_category_assignments_customerId_categoryId_key" ON "customer_category_assignments"("customerId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "supplier_transactions_supplierId_idx" ON "supplier_transactions"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_returns_supplierId_idx" ON "supplier_returns"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_returns_productId_idx" ON "supplier_returns"("productId");

-- CreateIndex
CREATE INDEX "trade_ins_imei_idx" ON "trade_ins"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "outsourced_repairs_repairTicketId_key" ON "outsourced_repairs"("repairTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_nic_key" ON "customers"("nic");

-- CreateIndex
CREATE INDEX "customers_nic_idx" ON "customers"("nic");

-- CreateIndex
CREATE UNIQUE INDEX "installment_plans_agreementBarcode_key" ON "installment_plans"("agreementBarcode");

-- CreateIndex
CREATE INDEX "installment_plans_agreementBarcode_idx" ON "installment_plans"("agreementBarcode");

-- CreateIndex
CREATE INDEX "repair_tickets_technicianId_idx" ON "repair_tickets"("technicianId");

-- CreateIndex
CREATE INDEX "repair_tickets_isThreeDayWarranty_idx" ON "repair_tickets"("isThreeDayWarranty");

-- CreateIndex
CREATE INDEX "stock_movements_supplierId_idx" ON "stock_movements"("supplierId");

-- AddForeignKey
ALTER TABLE "customer_category_assignments" ADD CONSTRAINT "customer_category_assignments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_category_assignments" ADD CONSTRAINT "customer_category_assignments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "customer_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_warrantyPeriodId_fkey" FOREIGN KEY ("warrantyPeriodId") REFERENCES "warranty_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_transactions" ADD CONSTRAINT "supplier_transactions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_serializedItemId_fkey" FOREIGN KEY ("serializedItemId") REFERENCES "serialized_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_ins" ADD CONSTRAINT "trade_ins_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_ins" ADD CONSTRAINT "trade_ins_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_warrantyPeriodId_fkey" FOREIGN KEY ("warrantyPeriodId") REFERENCES "warranty_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_warrantyPeriodId_fkey" FOREIGN KEY ("warrantyPeriodId") REFERENCES "warranty_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_warrantyPeriodId_fkey" FOREIGN KEY ("warrantyPeriodId") REFERENCES "warranty_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outsourced_repairs" ADD CONSTRAINT "outsourced_repairs_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "repair_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
