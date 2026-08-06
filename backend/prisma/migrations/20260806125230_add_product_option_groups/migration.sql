/*
  Warnings:

  - You are about to drop the column `mehrfachauswahl` on the `produktoptionen` table. All the data in the column will be lost.
  - You are about to drop the column `optionstyp` on the `produktoptionen` table. All the data in the column will be lost.
  - Added the required column `produktoptionsgruppe_id` to the `produktoptionen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "produktoptionen" DROP COLUMN "mehrfachauswahl",
DROP COLUMN "optionstyp",
ADD COLUMN     "produktoptionsgruppe_id" INTEGER NOT NULL,
ADD COLUMN     "sortierreihenfolge" INTEGER;

-- CreateTable
CREATE TABLE "produktoptionsgruppen" (
    "produktoptionsgruppe_id" SERIAL NOT NULL,
    "hauptprodukt_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "optionstyp" VARCHAR(30) NOT NULL,
    "minimale_auswahl" INTEGER NOT NULL DEFAULT 0,
    "maximale_auswahl" INTEGER NOT NULL DEFAULT 1,
    "sortierreihenfolge" INTEGER,

    CONSTRAINT "produktoptionsgruppen_pkey" PRIMARY KEY ("produktoptionsgruppe_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "produktoptionsgruppen_hauptprodukt_id_optionstyp_key" ON "produktoptionsgruppen"("hauptprodukt_id", "optionstyp");

-- CreateIndex
CREATE INDEX "produktoptionen_produktoptionsgruppe_id_idx" ON "produktoptionen"("produktoptionsgruppe_id");

-- AddForeignKey
ALTER TABLE "produktoptionsgruppen" ADD CONSTRAINT "produktoptionsgruppen_hauptprodukt_id_fkey" FOREIGN KEY ("hauptprodukt_id") REFERENCES "produkte"("produkt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produktoptionen" ADD CONSTRAINT "produktoptionen_produktoptionsgruppe_id_fkey" FOREIGN KEY ("produktoptionsgruppe_id") REFERENCES "produktoptionsgruppen"("produktoptionsgruppe_id") ON DELETE CASCADE ON UPDATE CASCADE;
