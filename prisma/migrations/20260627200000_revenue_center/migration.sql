-- Revenue center: enriched ledger, contracts, cash, pipeline

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "acquisition_source" TEXT;

ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "product_id" TEXT;
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "mrr" DECIMAL(12,2);
ALTER TABLE "customer_contracts" ADD COLUMN IF NOT EXISTS "auto_renew" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "revenue_entries" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE "revenue_entries" ADD COLUMN IF NOT EXISTS "is_recurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "revenue_entries" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;
ALTER TABLE "revenue_entries" ADD COLUMN IF NOT EXISTS "invoice_ref" TEXT;
ALTER TABLE "revenue_entries" ADD COLUMN IF NOT EXISTS "contract_id" TEXT;

CREATE INDEX IF NOT EXISTS "revenue_entries_contract_id_idx" ON "revenue_entries"("contract_id");
CREATE INDEX IF NOT EXISTS "revenue_entries_status_idx" ON "revenue_entries"("status");
CREATE INDEX IF NOT EXISTS "customer_contracts_product_id_idx" ON "customer_contracts"("product_id");

ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_entries" ADD CONSTRAINT "revenue_entries_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "customer_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "cash_snapshots" (
  "id" TEXT NOT NULL,
  "as_of_date" TIMESTAMP(3) NOT NULL,
  "balance" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  CONSTRAINT "cash_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cash_snapshots_as_of_date_idx" ON "cash_snapshots"("as_of_date");

CREATE TABLE IF NOT EXISTS "sales_deals" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "product_id" TEXT,
  "stage" TEXT NOT NULL,
  "expected_value" DECIMAL(12,2) NOT NULL,
  "probability_percent" INTEGER NOT NULL DEFAULT 40,
  "expected_close_date" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_by" TEXT,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "sales_deals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sales_deals_customer_id_idx" ON "sales_deals"("customer_id");
CREATE INDEX IF NOT EXISTS "sales_deals_stage_idx" ON "sales_deals"("stage");

ALTER TABLE "sales_deals" ADD CONSTRAINT "sales_deals_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sales_deals" ADD CONSTRAINT "sales_deals_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
