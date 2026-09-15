-- Migration: add_refund_credit_to_supplier_returns
-- Applied manually on VPS on 2026-09-15 via ALTER TABLE directly.

ALTER TABLE "supplier_returns" ADD COLUMN IF NOT EXISTS "refundOrCreditAmount" DECIMAL(12,2);
