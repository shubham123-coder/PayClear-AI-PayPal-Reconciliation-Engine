ALTER TABLE "Invoice" ADD COLUMN "isSimulation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Transaction" ADD COLUMN "isSimulation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReconciliationMatch" ADD COLUMN "isSimulation" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Invoice" SET "isSimulation" = true WHERE "paypalInvoiceId" LIKE 'INV2-SIM-%';
UPDATE "Transaction" SET "isSimulation" = true WHERE "paypalTransactionId" LIKE 'TXN-SIM-%';
UPDATE "ReconciliationMatch"
SET "isSimulation" = true
WHERE "invoiceId" IN (SELECT "id" FROM "Invoice" WHERE "isSimulation" = true)
  AND "transactionId" IN (SELECT "id" FROM "Transaction" WHERE "isSimulation" = true);
