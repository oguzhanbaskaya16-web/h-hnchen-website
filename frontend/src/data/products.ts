export type Produktkategorie = {
  kategorie_id: number;
  name: string;
  beschreibung: string;
};

export type Produkt = {
  produkt_id: number;
  kategorie_id: number;
  name: string;
  kurzbeschreibung: string;
  beschreibung: string;
  preis: number;
  bild: string;
  zubereitungszeit_minuten: number;
  allergenhinweis: string | null;
  ist_highlight: boolean;
  ist_verfuegbar: boolean;
};

export type Produktoption = {
  produktoption_id: number;
  hauptprodukt_id: number;
  optionsprodukt_id: number;
  optionstyp: "beilage" | "sauce" | "extra" | "getraenk";
  aufpreis: number;
  mehrfachauswahl: boolean;
};

export type Produktempfehlung = {
  produktempfehlung_id: number;
  produkt_id: number;
  empfohlenes_produkt_id: number;
  sortierreihenfolge: number;
};

export const kategorien: Produktkategorie[] = [
  {
    kategorie_id: 1,
    name: "Grillhähnchen",
    beschreibung: "Knusprig gegrillte Hähnchengerichte.",
  },
  {
    kategorie_id: 2,
    name: "Burger",
    beschreibung: "Saftige Chicken Burger.",
  },
  {
    kategorie_id: 3,
    name: "Menüs",
    beschreibung: "Komplette Menüs mit Beilage und Getränk.",
  },
  {
    kategorie_id: 4,
    name: "Beilagen",
    beschreibung: "Pommes, Reis und frische Salate.",
  },
  {
    kategorie_id: 5,
    name: "Saucen & Extras",
    beschreibung: "Hausgemachte Saucen und zusätzliche Extras.",
  },
  {
    kategorie_id: 6,
    name: "Getränke",
    beschreibung: "Kalte Erfrischungsgetränke.",
  },
];

export const produkte: Produkt[] = [
  {
    produkt_id: 1,
    kategorie_id: 1,
    name: "Halbes Grillhähnchen",
    kurzbeschreibung: "Knusprig, saftig und frisch vom Grill.",
    beschreibung:
      "Halbes Grillhähnchen mit unserer hausgemachten Gewürzmischung.",
    preis: 8.9,
    bild: "/images/halbes-grillhaehnchen.png",
    zubereitungszeit_minuten: 20,
    allergenhinweis: null,
    ist_highlight: true,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 2,
    kategorie_id: 1,
    name: "Ganzes Grillhähnchen",
    kurzbeschreibung: "Ein ganzes knuspriges Grillhähnchen.",
    beschreibung:
      "Frisch gegrilltes Hähnchen mit würziger Palmen-Grill-Marinade.",
    preis: 15.9,
    bild: "/images/ganzes-grillhaehnchen.png",
    zubereitungszeit_minuten: 25,
    allergenhinweis: null,
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 3,
    kategorie_id: 2,
    name: "Chicken Burger",
    kurzbeschreibung: "Hähnchen, Salat und hausgemachte Sauce.",
    beschreibung:
      "Saftiges Hähnchenfleisch im Burgerbrötchen mit Salat und Sauce.",
    preis: 9.5,
    bild: "/images/chicken-burger.png",
    zubereitungszeit_minuten: 15,
    allergenhinweis: "Enthält Gluten und Ei.",
    ist_highlight: true,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 4,
    kategorie_id: 2,
    name: "Double Chicken Burger",
    kurzbeschreibung: "Doppeltes Hähnchen und doppelt Käse.",
    beschreibung:
      "Großer Chicken Burger mit zwei Hähnchen-Pattys, Käse und Sauce.",
    preis: 12.9,
    bild: "/images/double-chicken-burger.png",
    zubereitungszeit_minuten: 18,
    allergenhinweis: "Enthält Gluten, Ei und Milch.",
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 5,
    kategorie_id: 3,
    name: "Palmen Menü",
    kurzbeschreibung: "Halbes Hähnchen, Beilage und Getränk.",
    beschreibung:
      "Unser beliebtes Komplettmenü mit frei wählbarer Beilage und Getränk.",
    preis: 14.9,
    bild: "/images/palmen-menue.png",
    zubereitungszeit_minuten: 25,
    allergenhinweis: null,
    ist_highlight: true,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 6,
    kategorie_id: 3,
    name: "Family Menü",
    kurzbeschreibung: "Grillhähnchen und Beilagen für die Familie.",
    beschreibung:
      "Zwei ganze Grillhähnchen mit zwei großen Beilagen und Saucen.",
    preis: 34.9,
    bild: "/images/family-menue.png",
    zubereitungszeit_minuten: 35,
    allergenhinweis: null,
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 10,
    kategorie_id: 4,
    name: "Pommes frites",
    kurzbeschreibung: "Goldgelb und knusprig.",
    beschreibung: "Frisch frittierte Pommes mit Salz.",
    preis: 3.5,
    bild: "/images/pommes-frites.png",
    zubereitungszeit_minuten: 8,
    allergenhinweis: null,
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 11,
    kategorie_id: 4,
    name: "Reis",
    kurzbeschreibung: "Locker gegarter Gewürzreis.",
    beschreibung: "Aromatischer Reis nach Art des Hauses.",
    preis: 3.5,
    bild: "/images/reis.png",
    zubereitungszeit_minuten: 5,
    allergenhinweis: null,
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 12,
    kategorie_id: 4,
    name: "Beilagensalat",
    kurzbeschreibung: "Frisch und knackig.",
    beschreibung: "Gemischter Salat mit Dressing.",
    preis: 3.9,
    bild: "/images/beilagensalat.png",
    zubereitungszeit_minuten: 5,
    allergenhinweis: "Dressing kann Senf enthalten.",
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 20,
    kategorie_id: 5,
    name: "Knoblauchsauce",
    kurzbeschreibung: "Cremige Sauce mit Knoblauch.",
    beschreibung: "Hausgemachte Knoblauchsauce.",
    preis: 0.9,
    bild: "/images/knoblauchsauce.png",
    zubereitungszeit_minuten: 0,
    allergenhinweis: "Enthält Milch.",
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 21,
    kategorie_id: 5,
    name: "Chilisauce",
    kurzbeschreibung: "Fruchtig und angenehm scharf.",
    beschreibung: "Würzige Chilisauce.",
    preis: 0.9,
    bild: "/images/chilisauce.png",
    zubereitungszeit_minuten: 0,
    allergenhinweis: null,
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 22,
    kategorie_id: 5,
    name: "Extra Käse",
    kurzbeschreibung: "Eine zusätzliche Scheibe Käse.",
    beschreibung: "Extra Käse für Burger und Menüs.",
    preis: 1.5,
    bild: "/images/extra-kaese.png",
    zubereitungszeit_minuten: 0,
    allergenhinweis: "Enthält Milch.",
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 30,
    kategorie_id: 6,
    name: "Ayran",
    kurzbeschreibung: "Erfrischendes Joghurtgetränk.",
    beschreibung: "Gekühlter Ayran, 0,25 l.",
    preis: 2,
    bild: "/images/ayran.png",
    zubereitungszeit_minuten: 0,
    allergenhinweis: "Enthält Milch.",
    ist_highlight: false,
    ist_verfuegbar: true,
  },
  {
    produkt_id: 31,
    kategorie_id: 6,
    name: "Cola",
    kurzbeschreibung: "Gekühlt, 0,33 l.",
    beschreibung: "Erfrischungsgetränk mit Koffein.",
    preis: 2.5,
    bild: "/images/cola.png",    zubereitungszeit_minuten: 0,
    allergenhinweis: null,
    ist_highlight: false,
    ist_verfuegbar: true,
  },
];

export const produktoptionen: Produktoption[] = [
  {
    produktoption_id: 1,
    hauptprodukt_id: 1,
    optionsprodukt_id: 10,
    optionstyp: "beilage",
    aufpreis: 2.5,
    mehrfachauswahl: false,
  },
  {
    produktoption_id: 2,
    hauptprodukt_id: 1,
    optionsprodukt_id: 11,
    optionstyp: "beilage",
    aufpreis: 2.5,
    mehrfachauswahl: false,
  },
  {
    produktoption_id: 3,
    hauptprodukt_id: 1,
    optionsprodukt_id: 12,
    optionstyp: "beilage",
    aufpreis: 2.9,
    mehrfachauswahl: false,
  },
  {
    produktoption_id: 4,
    hauptprodukt_id: 1,
    optionsprodukt_id: 20,
    optionstyp: "sauce",
    aufpreis: 0.5,
    mehrfachauswahl: true,
  },
  {
    produktoption_id: 5,
    hauptprodukt_id: 1,
    optionsprodukt_id: 21,
    optionstyp: "sauce",
    aufpreis: 0.5,
    mehrfachauswahl: true,
  },
  {
    produktoption_id: 6,
    hauptprodukt_id: 3,
    optionsprodukt_id: 22,
    optionstyp: "extra",
    aufpreis: 1.5,
    mehrfachauswahl: true,
  },
  {
    produktoption_id: 7,
    hauptprodukt_id: 3,
    optionsprodukt_id: 20,
    optionstyp: "sauce",
    aufpreis: 0.5,
    mehrfachauswahl: true,
  },
  {
    produktoption_id: 8,
    hauptprodukt_id: 5,
    optionsprodukt_id: 10,
    optionstyp: "beilage",
    aufpreis: 0,
    mehrfachauswahl: false,
  },
  {
    produktoption_id: 9,
    hauptprodukt_id: 5,
    optionsprodukt_id: 11,
    optionstyp: "beilage",
    aufpreis: 0,
    mehrfachauswahl: false,
  },
  {
    produktoption_id: 10,
    hauptprodukt_id: 5,
    optionsprodukt_id: 30,
    optionstyp: "getraenk",
    aufpreis: 0,
    mehrfachauswahl: false,
  },
  {
    produktoption_id: 11,
    hauptprodukt_id: 5,
    optionsprodukt_id: 31,
    optionstyp: "getraenk",
    aufpreis: 0.5,
    mehrfachauswahl: false,
  },
];

export const produktempfehlungen: Produktempfehlung[] = [
  {
    produktempfehlung_id: 1,
    produkt_id: 1,
    empfohlenes_produkt_id: 10,
    sortierreihenfolge: 1,
  },
  {
    produktempfehlung_id: 2,
    produkt_id: 1,
    empfohlenes_produkt_id: 30,
    sortierreihenfolge: 2,
  },
  {
    produktempfehlung_id: 3,
    produkt_id: 3,
    empfohlenes_produkt_id: 10,
    sortierreihenfolge: 1,
  },
  {
    produktempfehlung_id: 4,
    produkt_id: 3,
    empfohlenes_produkt_id: 31,
    sortierreihenfolge: 2,
  },
];

export function findeProdukt(produktId: number) {
  return produkte.find(
    (produkt) => produkt.produkt_id === produktId,
  );
}

export function formatierePreis(preis: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(preis);
}