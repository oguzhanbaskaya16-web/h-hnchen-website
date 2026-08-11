-- CreateTable
CREATE TABLE "restaurants" (
    "restaurant_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "strasse" VARCHAR(100),
    "hausnummer" VARCHAR(10),
    "plz" VARCHAR(10),
    "ort" VARCHAR(100),
    "telefon" VARCHAR(30),
    "email" VARCHAR(100),
    "beschreibung" TEXT,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("restaurant_id")
);

-- CreateTable
CREATE TABLE "oeffnungszeiten" (
    "oeffnungszeit_id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "wochentag" VARCHAR(15) NOT NULL,
    "oeffnet_um" TIME(0) NOT NULL,
    "schliesst_um" TIME(0) NOT NULL,

    CONSTRAINT "oeffnungszeiten_pkey" PRIMARY KEY ("oeffnungszeit_id")
);

-- CreateTable
CREATE TABLE "social_media_links" (
    "social_media_id" SERIAL NOT NULL,
    "restaurant_id" INTEGER NOT NULL,
    "plattform" VARCHAR(50) NOT NULL,
    "url" VARCHAR(255) NOT NULL,

    CONSTRAINT "social_media_links_pkey" PRIMARY KEY ("social_media_id")
);

-- CreateTable
CREATE TABLE "produktkategorien" (
    "kategorie_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "beschreibung" TEXT,

    CONSTRAINT "produktkategorien_pkey" PRIMARY KEY ("kategorie_id")
);

-- CreateTable
CREATE TABLE "produkte" (
    "produkt_id" SERIAL NOT NULL,
    "kategorie_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "kurzbeschreibung" VARCHAR(255),
    "beschreibung" TEXT,
    "preis" DECIMAL(10,2) NOT NULL,
    "bild" VARCHAR(255),
    "zubereitungszeit_minuten" INTEGER,
    "allergenhinweis" TEXT,
    "ist_highlight" BOOLEAN NOT NULL DEFAULT false,
    "ist_verfuegbar" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "produkte_pkey" PRIMARY KEY ("produkt_id")
);

-- CreateTable
CREATE TABLE "produktoptionen" (
    "produktoption_id" SERIAL NOT NULL,
    "hauptprodukt_id" INTEGER NOT NULL,
    "optionsprodukt_id" INTEGER NOT NULL,
    "optionstyp" VARCHAR(30) NOT NULL,
    "aufpreis" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "mehrfachauswahl" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "produktoptionen_pkey" PRIMARY KEY ("produktoption_id")
);

-- CreateTable
CREATE TABLE "produktempfehlungen" (
    "produktempfehlung_id" SERIAL NOT NULL,
    "produkt_id" INTEGER NOT NULL,
    "empfohlenes_produkt_id" INTEGER NOT NULL,
    "sortierreihenfolge" INTEGER,

    CONSTRAINT "produktempfehlungen_pkey" PRIMARY KEY ("produktempfehlung_id")
);

-- CreateTable
CREATE TABLE "warenkoerbe" (
    "warenkorb_id" SERIAL NOT NULL,
    "sitzungskennung" VARCHAR(255) NOT NULL,
    "erstellt_am" TIMESTAMP(3) NOT NULL,
    "aktualisiert_am" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'offen',

    CONSTRAINT "warenkoerbe_pkey" PRIMARY KEY ("warenkorb_id")
);

-- CreateTable
CREATE TABLE "warenkorbpositionen" (
    "warenkorbposition_id" SERIAL NOT NULL,
    "warenkorb_id" INTEGER NOT NULL,
    "produkt_id" INTEGER NOT NULL,
    "menge" INTEGER NOT NULL DEFAULT 1,
    "einzelpreis" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "warenkorbpositionen_pkey" PRIMARY KEY ("warenkorbposition_id")
);

-- CreateTable
CREATE TABLE "bestellstatus" (
    "bestellstatus_id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "beschreibung" VARCHAR(255),
    "sortierreihenfolge" INTEGER NOT NULL,

    CONSTRAINT "bestellstatus_pkey" PRIMARY KEY ("bestellstatus_id")
);

-- CreateTable
CREATE TABLE "bestellungen" (
    "bestellung_id" SERIAL NOT NULL,
    "warenkorb_id" INTEGER,
    "bestellstatus_id" INTEGER NOT NULL,
    "bestellnummer" VARCHAR(30) NOT NULL,
    "bestellart" VARCHAR(20) NOT NULL,
    "bestellt_am" TIMESTAMP(3) NOT NULL,
    "gewuenschter_zeitpunkt" TIMESTAMP(3) NOT NULL,
    "warenwert" DECIMAL(10,2) NOT NULL,
    "liefergebuehr" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "rabattbetrag" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "gesamtbetrag" DECIMAL(10,2) NOT NULL,
    "anmerkung" TEXT,

    CONSTRAINT "bestellungen_pkey" PRIMARY KEY ("bestellung_id")
);

-- CreateTable
CREATE TABLE "bestellpositionen" (
    "bestellposition_id" SERIAL NOT NULL,
    "bestellung_id" INTEGER NOT NULL,
    "produkt_id" INTEGER,
    "produktname" VARCHAR(150) NOT NULL,
    "menge" INTEGER NOT NULL,
    "einzelpreis" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "bestellpositionen_pkey" PRIMARY KEY ("bestellposition_id")
);

-- CreateTable
CREATE TABLE "bestellpositionsoptionen" (
    "bestellpositionsoption_id" SERIAL NOT NULL,
    "bestellposition_id" INTEGER NOT NULL,
    "produktoption_id" INTEGER NOT NULL,
    "optionsname" VARCHAR(150) NOT NULL,
    "aufpreis" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "bestellpositionsoptionen_pkey" PRIMARY KEY ("bestellpositionsoption_id")
);

-- CreateTable
CREATE TABLE "bestellstatusverlauf" (
    "statusverlauf_id" SERIAL NOT NULL,
    "bestellung_id" INTEGER NOT NULL,
    "bestellstatus_id" INTEGER NOT NULL,
    "geaendert_am" TIMESTAMP(3) NOT NULL,
    "bemerkung" VARCHAR(255),

    CONSTRAINT "bestellstatusverlauf_pkey" PRIMARY KEY ("statusverlauf_id")
);

-- CreateTable
CREATE TABLE "zahlungsart" (
    "zahlungsart_id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "ist_onlinezahlung" BOOLEAN NOT NULL DEFAULT false,
    "ist_aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "zahlungsart_pkey" PRIMARY KEY ("zahlungsart_id")
);

-- CreateTable
CREATE TABLE "zahlungen" (
    "zahlung_id" SERIAL NOT NULL,
    "bestellung_id" INTEGER NOT NULL,
    "zahlungsart_id" INTEGER NOT NULL,
    "betrag" DECIMAL(10,2) NOT NULL,
    "zahlungsstatus" VARCHAR(30) NOT NULL,
    "erstellt_am" TIMESTAMP(3) NOT NULL,
    "bezahlt_am" TIMESTAMP(3),
    "transaktionsreferenz" VARCHAR(255),

    CONSTRAINT "zahlungen_pkey" PRIMARY KEY ("zahlung_id")
);

-- CreateTable
CREATE TABLE "bestellkunde" (
    "bestellkunde_id" SERIAL NOT NULL,
    "bestellung_id" INTEGER NOT NULL,
    "vorname" VARCHAR(100) NOT NULL,
    "nachname" VARCHAR(100) NOT NULL,
    "telefon" VARCHAR(30) NOT NULL,

    CONSTRAINT "bestellkunde_pkey" PRIMARY KEY ("bestellkunde_id")
);

-- CreateTable
CREATE TABLE "bestelladresse" (
    "bestelladresse_id" SERIAL NOT NULL,
    "bestellung_id" INTEGER NOT NULL,
    "strasse" VARCHAR(100) NOT NULL,
    "hausnummer" VARCHAR(20) NOT NULL,
    "plz" VARCHAR(10) NOT NULL,
    "ort" VARCHAR(100) NOT NULL,

    CONSTRAINT "bestelladresse_pkey" PRIMARY KEY ("bestelladresse_id")
);

-- CreateTable
CREATE TABLE "benachrichtigungen" (
    "benachrichtigung_id" SERIAL NOT NULL,
    "bestellung_id" INTEGER NOT NULL,
    "kanal" VARCHAR(30) NOT NULL,
    "nachrichtentyp" VARCHAR(50) NOT NULL,
    "gesendet_am" TIMESTAMP(3),
    "status" VARCHAR(30) NOT NULL,

    CONSTRAINT "benachrichtigungen_pkey" PRIMARY KEY ("benachrichtigung_id")
);

-- CreateTable
CREATE TABLE "kontaktanfrage" (
    "kontaktanfrage_id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "nachricht" TEXT NOT NULL,
    "eingegangen_am" TIMESTAMP(3) NOT NULL,
    "bearbeitungsstatus" VARCHAR(30) NOT NULL DEFAULT 'offen',

    CONSTRAINT "kontaktanfrage_pkey" PRIMARY KEY ("kontaktanfrage_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "produktoptionen_hauptprodukt_id_optionsprodukt_id_key" ON "produktoptionen"("hauptprodukt_id", "optionsprodukt_id");

-- CreateIndex
CREATE UNIQUE INDEX "produktempfehlungen_produkt_id_empfohlenes_produkt_id_key" ON "produktempfehlungen"("produkt_id", "empfohlenes_produkt_id");

-- CreateIndex
CREATE UNIQUE INDEX "warenkoerbe_sitzungskennung_key" ON "warenkoerbe"("sitzungskennung");

-- CreateIndex
CREATE UNIQUE INDEX "bestellstatus_name_key" ON "bestellstatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bestellungen_bestellnummer_key" ON "bestellungen"("bestellnummer");

-- CreateIndex
CREATE UNIQUE INDEX "zahlungsart_name_key" ON "zahlungsart"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bestellkunde_bestellung_id_key" ON "bestellkunde"("bestellung_id");

-- CreateIndex
CREATE UNIQUE INDEX "bestelladresse_bestellung_id_key" ON "bestelladresse"("bestellung_id");

-- AddForeignKey
ALTER TABLE "oeffnungszeiten" ADD CONSTRAINT "oeffnungszeiten_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("restaurant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_media_links" ADD CONSTRAINT "social_media_links_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("restaurant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produkte" ADD CONSTRAINT "produkte_kategorie_id_fkey" FOREIGN KEY ("kategorie_id") REFERENCES "produktkategorien"("kategorie_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produktoptionen" ADD CONSTRAINT "produktoptionen_hauptprodukt_id_fkey" FOREIGN KEY ("hauptprodukt_id") REFERENCES "produkte"("produkt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produktoptionen" ADD CONSTRAINT "produktoptionen_optionsprodukt_id_fkey" FOREIGN KEY ("optionsprodukt_id") REFERENCES "produkte"("produkt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produktempfehlungen" ADD CONSTRAINT "produktempfehlungen_produkt_id_fkey" FOREIGN KEY ("produkt_id") REFERENCES "produkte"("produkt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produktempfehlungen" ADD CONSTRAINT "produktempfehlungen_empfohlenes_produkt_id_fkey" FOREIGN KEY ("empfohlenes_produkt_id") REFERENCES "produkte"("produkt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warenkorbpositionen" ADD CONSTRAINT "warenkorbpositionen_warenkorb_id_fkey" FOREIGN KEY ("warenkorb_id") REFERENCES "warenkoerbe"("warenkorb_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warenkorbpositionen" ADD CONSTRAINT "warenkorbpositionen_produkt_id_fkey" FOREIGN KEY ("produkt_id") REFERENCES "produkte"("produkt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellungen" ADD CONSTRAINT "bestellungen_warenkorb_id_fkey" FOREIGN KEY ("warenkorb_id") REFERENCES "warenkoerbe"("warenkorb_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellungen" ADD CONSTRAINT "bestellungen_bestellstatus_id_fkey" FOREIGN KEY ("bestellstatus_id") REFERENCES "bestellstatus"("bestellstatus_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellpositionen" ADD CONSTRAINT "bestellpositionen_bestellung_id_fkey" FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("bestellung_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellpositionen" ADD CONSTRAINT "bestellpositionen_produkt_id_fkey" FOREIGN KEY ("produkt_id") REFERENCES "produkte"("produkt_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellpositionsoptionen" ADD CONSTRAINT "bestellpositionsoptionen_bestellposition_id_fkey" FOREIGN KEY ("bestellposition_id") REFERENCES "bestellpositionen"("bestellposition_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellpositionsoptionen" ADD CONSTRAINT "bestellpositionsoptionen_produktoption_id_fkey" FOREIGN KEY ("produktoption_id") REFERENCES "produktoptionen"("produktoption_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellstatusverlauf" ADD CONSTRAINT "bestellstatusverlauf_bestellung_id_fkey" FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("bestellung_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellstatusverlauf" ADD CONSTRAINT "bestellstatusverlauf_bestellstatus_id_fkey" FOREIGN KEY ("bestellstatus_id") REFERENCES "bestellstatus"("bestellstatus_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zahlungen" ADD CONSTRAINT "zahlungen_bestellung_id_fkey" FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("bestellung_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zahlungen" ADD CONSTRAINT "zahlungen_zahlungsart_id_fkey" FOREIGN KEY ("zahlungsart_id") REFERENCES "zahlungsart"("zahlungsart_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestellkunde" ADD CONSTRAINT "bestellkunde_bestellung_id_fkey" FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("bestellung_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bestelladresse" ADD CONSTRAINT "bestelladresse_bestellung_id_fkey" FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("bestellung_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benachrichtigungen" ADD CONSTRAINT "benachrichtigungen_bestellung_id_fkey" FOREIGN KEY ("bestellung_id") REFERENCES "bestellungen"("bestellung_id") ON DELETE CASCADE ON UPDATE CASCADE;
