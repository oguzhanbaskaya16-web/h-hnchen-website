-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PRINTING', 'PRINTED', 'FAILED');

-- CreateTable
CREATE TABLE "druckauftraege" (
    "druckauftrag_id" UUID NOT NULL,
    "bestellung_id" INTEGER NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
    "druckversuche" INTEGER NOT NULL DEFAULT 0,
    "maximale_druckversuche" INTEGER NOT NULL DEFAULT 3,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,
    "reserviert_am" TIMESTAMP(3),
    "reservierung_laeuft_ab" TIMESTAMP(3),
    "gedruckt_am" TIMESTAMP(3),
    "fehlgeschlagen_am" TIMESTAMP(3),
    "naechster_versuch_am" TIMESTAMP(3),
    "reservierungstoken" UUID,
    "agent_id" VARCHAR(100),
    "druckername" VARCHAR(255),
    "letzter_fehler" TEXT,

    CONSTRAINT "druckauftraege_pkey" PRIMARY KEY ("druckauftrag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "druckauftraege_bestellung_id_key" ON "druckauftraege"("bestellung_id");

-- CreateIndex
CREATE UNIQUE INDEX "druckauftraege_reservierungstoken_key" ON "druckauftraege"("reservierungstoken");

-- CreateIndex
CREATE INDEX "druckauftraege_status_naechster_versuch_am_erstellt_am_idx" ON "druckauftraege"("status", "naechster_versuch_am", "erstellt_am");

-- CreateIndex
CREATE INDEX "druckauftraege_reservierung_laeuft_ab_idx" ON "druckauftraege"("reservierung_laeuft_ab");

-- AddForeignKey
ALTER TABLE "druckauftraege" ADD CONSTRAINT "druckauftraege_bestellung_id_fkey" FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("bestellung_id") ON DELETE CASCADE ON UPDATE CASCADE;
