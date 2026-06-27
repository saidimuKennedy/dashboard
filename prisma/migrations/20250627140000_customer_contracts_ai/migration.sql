-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'CHURNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'TERMINATED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "customers" ADD COLUMN "ai_analysis" JSONB;

-- CreateTable
CREATE TABLE "customer_aliases" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contracts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "terms" TEXT,
    "content" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "is_retainer" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "customer_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_aliases_customer_id_key" ON "customer_aliases"("customer_id");

-- CreateIndex
CREATE INDEX "customer_contracts_customer_id_idx" ON "customer_contracts"("customer_id");

-- CreateIndex
CREATE INDEX "customer_contracts_end_date_idx" ON "customer_contracts"("end_date");

-- AddForeignKey
ALTER TABLE "customer_aliases" ADD CONSTRAINT "customer_aliases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "customer_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
