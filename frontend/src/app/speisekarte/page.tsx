"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductDialog, {
  type WarenkorbAuswahl,
} from "@/components/ProductDialog";
import {
  formatierePreis,
  kategorien,
  produkte,
  type Produkt,
} from "@/data/products";
import styles from "./speisekarte.module.css";

type KategorieFilter = "alle" | "highlights" | number;

type WarenkorbOption = {
  produktoption_id: number;
  name: string;
  aufpreis: number;
};

type WarenkorbPosition = {
  clientId: string;
  produkt_id: number;
  name: string;
  menge: number;
  einzelpreis: number;
  optionen: WarenkorbOption[];
};

const WARENKORB_SPEICHER = "palmen-grill-warenkorb";
const WARENKORB_EVENT = "palmen-warenkorb-aktualisiert";

function berechnePositionssumme(position: WarenkorbPosition) {
  const optionspreis = position.optionen.reduce(
    (summe, option) => summe + option.aufpreis,
    0,
  );

  return (position.einzelpreis + optionspreis) * position.menge;
}

function istWarenkorbPosition(wert: unknown): wert is WarenkorbPosition {
  if (typeof wert !== "object" || wert === null) {
    return false;
  }

  const position = wert as Partial<WarenkorbPosition>;

  return (
    typeof position.clientId === "string" &&
    typeof position.produkt_id === "number" &&
    typeof position.name === "string" &&
    typeof position.menge === "number" &&
    typeof position.einzelpreis === "number" &&
    Array.isArray(position.optionen)
  );
}

export default function SpeisekartePage() {
  const [aktiveKategorie, setAktiveKategorie] =
    useState<KategorieFilter>("alle");
  const [suchbegriff, setSuchbegriff] = useState("");
  const [ausgewaehltesProdukt, setAusgewaehltesProdukt] =
    useState<Produkt | null>(null);
  const [warenkorb, setWarenkorb] = useState<WarenkorbPosition[]>([]);
  const [warenkorbGeladen, setWarenkorbGeladen] = useState(false);

  useEffect(() => {
    try {
      const gespeicherterWarenkorb =
        window.localStorage.getItem(WARENKORB_SPEICHER);

      if (!gespeicherterWarenkorb) {
        return;
      }

      const gespeicherteDaten: unknown = JSON.parse(gespeicherterWarenkorb);

      if (!Array.isArray(gespeicherteDaten)) {
        window.localStorage.removeItem(WARENKORB_SPEICHER);
        return;
      }

      setWarenkorb(gespeicherteDaten.filter(istWarenkorbPosition));
    } catch {
      window.localStorage.removeItem(WARENKORB_SPEICHER);
    } finally {
      setWarenkorbGeladen(true);
    }
  }, []);

  useEffect(() => {
    if (!warenkorbGeladen) {
      return;
    }

    window.localStorage.setItem(WARENKORB_SPEICHER, JSON.stringify(warenkorb));
    window.dispatchEvent(new Event(WARENKORB_EVENT));
  }, [warenkorb, warenkorbGeladen]);

  const sichtbareProdukte = useMemo(() => {
    const suche = suchbegriff.trim().toLowerCase();

    return produkte.filter((produkt) => {
      const passtZurKategorie =
        aktiveKategorie === "alle" ||
        (aktiveKategorie === "highlights" && produkt.ist_highlight) ||
        produkt.kategorie_id === aktiveKategorie;

      const passtZurSuche =
        suche.length === 0 ||
        produkt.name.toLowerCase().includes(suche) ||
        produkt.kurzbeschreibung.toLowerCase().includes(suche) ||
        produkt.beschreibung.toLowerCase().includes(suche);

      return passtZurKategorie && passtZurSuche;
    });
  }, [aktiveKategorie, suchbegriff]);

  const zwischensumme = useMemo(
    () =>
      warenkorb.reduce(
        (summe, position) => summe + berechnePositionssumme(position),
        0,
      ),
    [warenkorb],
  );

  const artikelanzahl = useMemo(
    () => warenkorb.reduce((summe, position) => summe + position.menge, 0),
    [warenkorb],
  );

  function produktAuswaehlen(produkt: Produkt) {
    setAusgewaehltesProdukt(produkt);
  }

  function zumWarenkorbHinzufuegen(auswahl: WarenkorbAuswahl) {
    const neuePosition: WarenkorbPosition = {
      clientId: crypto.randomUUID(),
      produkt_id: auswahl.produkt.produkt_id,
      name: auswahl.produkt.name,
      menge: auswahl.menge,
      einzelpreis: auswahl.produkt.preis,
      optionen: auswahl.optionen,
    };

    setWarenkorb((aktuellePositionen) => [...aktuellePositionen, neuePosition]);
  }

  function mengeAendern(clientId: string, veraenderung: number) {
    setWarenkorb((aktuellePositionen) =>
      aktuellePositionen.map((position) =>
        position.clientId === clientId
          ? {
              ...position,
              menge: Math.max(1, Math.min(20, position.menge + veraenderung)),
            }
          : position,
      ),
    );
  }

  function positionEntfernen(clientId: string) {
    setWarenkorb((aktuellePositionen) =>
      aktuellePositionen.filter((position) => position.clientId !== clientId),
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>FRISCH VOM GRILL</p>
        <h1>Unsere Speisekarte</h1>
        <p className={styles.introText}>
          Wähle deine Lieblingsgerichte und bestelle sie bequem zur Abholung.
        </p>

        <div className={styles.orderType}>
          <button type="button" className={styles.activeOrderType}>
            Abholung
          </button>
          <button type="button" disabled>
            Lieferung
            <span>Bald verfügbar</span>
          </button>
        </div>
      </section>

      <section className={styles.controls}>
        <label className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={suchbegriff}
            onChange={(event) => setSuchbegriff(event.target.value)}
            placeholder="Gericht suchen …"
            aria-label="Speisekarte durchsuchen"
          />
        </label>

        <div className={styles.categoryList} aria-label="Produktkategorien">
          <button
            type="button"
            className={aktiveKategorie === "alle" ? styles.activeCategory : ""}
            onClick={() => setAktiveKategorie("alle")}
          >
            Alle
          </button>
          <button
            type="button"
            className={
              aktiveKategorie === "highlights" ? styles.activeCategory : ""
            }
            onClick={() => setAktiveKategorie("highlights")}
          >
            Palmen-Tipps
          </button>

          {kategorien.map((kategorie) => (
            <button
              type="button"
              key={kategorie.kategorie_id}
              className={
                aktiveKategorie === kategorie.kategorie_id
                  ? styles.activeCategory
                  : ""
              }
              onClick={() => setAktiveKategorie(kategorie.kategorie_id)}
            >
              {kategorie.name}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.menuLayout}>
        <section className={styles.products}>
          <div className={styles.productHeading}>
            <div>
              <p>Speisekarte</p>
              <h2>
                {aktiveKategorie === "alle"
                  ? "Alle Gerichte"
                  : aktiveKategorie === "highlights"
                    ? "Unsere Palmen-Tipps"
                    : kategorien.find(
                        (kategorie) =>
                          kategorie.kategorie_id === aktiveKategorie,
                      )?.name}
              </h2>
            </div>
            <span>
              {sichtbareProdukte.length}{" "}
              {sichtbareProdukte.length === 1 ? "Gericht" : "Gerichte"}
            </span>
          </div>

          {sichtbareProdukte.length > 0 ? (
            <div className={styles.productGrid}>
              {sichtbareProdukte.map((produkt) => (
                <ProductCard
                  key={produkt.produkt_id}
                  produkt={produkt}
                  onSelect={produktAuswaehlen}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyResults}>
              <span aria-hidden="true">⌕</span>
              <h3>Kein Gericht gefunden</h3>
              <p>
                Probiere einen anderen Suchbegriff oder wähle eine andere
                Kategorie.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuchbegriff("");
                  setAktiveKategorie("alle");
                }}
              >
                Alle Gerichte anzeigen
              </button>
            </div>
          )}
        </section>

        <aside className={styles.cart} aria-label="Warenkorb">
          <div className={styles.cartTitle}>
            <div>
              <p>DEINE BESTELLUNG</p>
              <h2>Warenkorb</h2>
            </div>

            <div className={styles.cartIcon} aria-hidden="true">
              <span>🛒</span>
              {artikelanzahl > 0 && <strong>{artikelanzahl}</strong>}
            </div>
          </div>

          <div className={styles.cartBody} aria-live="polite">
            {!warenkorbGeladen ? (
              <div className={styles.emptyCart}>
                <p>Warenkorb wird geladen …</p>
              </div>
            ) : warenkorb.length > 0 ? (
              <div className={styles.cartItems}>
                {warenkorb.map((position) => (
                  <article className={styles.cartItem} key={position.clientId}>
                    <div className={styles.cartItemHeader}>
                      <div>
                        <h3>{position.name}</h3>
                        <span>
                          {position.menge} ×{" "}
                          {formatierePreis(position.einzelpreis)}
                        </span>
                      </div>
                      <strong>
                        {formatierePreis(berechnePositionssumme(position))}
                      </strong>
                    </div>

                    {position.optionen.length > 0 && (
                      <ul className={styles.cartOptions}>
                        {position.optionen.map((option) => (
                          <li key={option.produktoption_id}>
                            <span>{option.name}</span>
                            {option.aufpreis > 0 && (
                              <small>
                                + {formatierePreis(option.aufpreis)}
                              </small>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className={styles.cartItemFooter}>
                      <div
                        className={styles.cartQuantity}
                        aria-label={`Menge für ${position.name}`}
                      >
                        <button
                          type="button"
                          disabled={position.menge === 1}
                          onClick={() => mengeAendern(position.clientId, -1)}
                          aria-label={`Menge von ${position.name} verringern`}
                        >
                          −
                        </button>
                        <span>{position.menge}</span>
                        <button
                          type="button"
                          disabled={position.menge === 20}
                          onClick={() => mengeAendern(position.clientId, 1)}
                          aria-label={`Menge von ${position.name} erhöhen`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.removeItem}
                        onClick={() => positionEntfernen(position.clientId)}
                        aria-label={`${position.name} aus dem Warenkorb entfernen`}
                      >
                        Entfernen
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyCart}>
                <div aria-hidden="true">🍗</div>
                <h3>Noch nichts ausgewählt</h3>
                <p>Füge ein Gericht hinzu, um deine Bestellung zu beginnen.</p>
              </div>
            )}
          </div>

          <div className={styles.cartFooter}>
            <div className={styles.cartSummary}>
              <span>
                Zwischensumme
                {artikelanzahl > 0 && (
                  <small>
                    {artikelanzahl}{" "}
                    {artikelanzahl === 1 ? "Artikel" : "Artikel"}
                  </small>
                )}
              </span>
              <strong>{formatierePreis(zwischensumme)}</strong>
            </div>

            <button type="button" disabled={warenkorb.length === 0}>
              Zur Kasse
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </aside>
      </div>

      <ProductDialog
        produkt={ausgewaehltesProdukt}
        onClose={() => setAusgewaehltesProdukt(null)}
        onAdd={zumWarenkorbHinzufuegen}
      />
    </div>
  );
}