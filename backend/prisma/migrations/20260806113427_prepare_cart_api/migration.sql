/*
  Warnings:

  - A unique constraint covering the columns `[warenkorb_id,produkt_id]` on the table `warenkorbpositionen` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "warenkoerbe" ALTER COLUMN "erstellt_am" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "warenkorbpositionen_warenkorb_id_produkt_id_key" ON "warenkorbpositionen"("warenkorb_id", "produkt_id");
