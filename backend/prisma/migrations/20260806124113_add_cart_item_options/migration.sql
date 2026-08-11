/*
  Bestehende Warenkorbpositionen erhalten zunächst einen
  Konfigurationsschlüssel ohne Optionen.

  Format:
  product:<produkt_id>|options:
*/

-- DropForeignKey
ALTER TABLE "warenkorbpositionen"
DROP CONSTRAINT "warenkorbpositionen_produkt_id_fkey";

-- DropIndex
DROP INDEX "warenkorbpositionen_warenkorb_id_produkt_id_key";

-- Add the new column as nullable first
ALTER TABLE "warenkorbpositionen"
ADD COLUMN "konfigurationsschluessel" VARCHAR(500);

-- Backfill existing cart items
UPDATE "warenkorbpositionen"
SET "konfigurationsschluessel" =
  'product:' || "produkt_id"::text || '|options:'
WHERE "konfigurationsschluessel" IS NULL;

-- Make the column required after the backfill
ALTER TABLE "warenkorbpositionen"
ALTER COLUMN "konfigurationsschluessel" SET NOT NULL;

-- CreateTable
CREATE TABLE "warenkorbpositionsoptionen" (
    "warenkorbpositionsoption_id" SERIAL NOT NULL,
    "warenkorbposition_id" INTEGER NOT NULL,
    "produktoption_id" INTEGER NOT NULL,
    "optionsname" VARCHAR(150) NOT NULL,
    "aufpreis" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "warenkorbpositionsoptionen_pkey"
      PRIMARY KEY ("warenkorbpositionsoption_id")
);

-- CreateIndex
CREATE UNIQUE INDEX
"warenkorbpositionsoptionen_warenkorbposition_id_produktopti_key"
ON "warenkorbpositionsoptionen"
("warenkorbposition_id", "produktoption_id");

-- CreateIndex
CREATE UNIQUE INDEX
"warenkorbpositionen_warenkorb_id_konfigurationsschluessel_key"
ON "warenkorbpositionen"
("warenkorb_id", "konfigurationsschluessel");

-- AddForeignKey
ALTER TABLE "warenkorbpositionen"
ADD CONSTRAINT "warenkorbpositionen_produkt_id_fkey"
FOREIGN KEY ("produkt_id")
REFERENCES "produkte"("produkt_id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warenkorbpositionsoptionen"
ADD CONSTRAINT "warenkorbpositionsoptionen_warenkorbposition_id_fkey"
FOREIGN KEY ("warenkorbposition_id")
REFERENCES "warenkorbpositionen"("warenkorbposition_id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warenkorbpositionsoptionen"
ADD CONSTRAINT "warenkorbpositionsoptionen_produktoption_id_fkey"
FOREIGN KEY ("produktoption_id")
REFERENCES "produktoptionen"("produktoption_id")
ON DELETE RESTRICT
ON UPDATE CASCADE;