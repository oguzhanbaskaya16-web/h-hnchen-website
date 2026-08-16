"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductDialog, {
  type WarenkorbAuswahl,
} from "@/components/ProductDialog";
import {
  ApiError,
  addCartItem,
  clearCart,
  createCart,
  formatPrice,
  getCart,
  getMenu,
  removeCartItem,
  updateCartItem,
  type Cart,
  type MenuCategory,
  type MenuProduct,
} from "@/lib/api";
import styles from "./speisekarte.module.css";
import { useRouter } from "next/navigation";

type KategorieFilter = "alle" | "highlights" | number;

const CART_ID_SPEICHER = "palmen-grill-cart-id";
const WARENKORB_EVENT = "palmen-warenkorb-aktualisiert";

export default function SpeisekartePage() {
  const router = useRouter();

  const [aktiveKategorie, setAktiveKategorie] =
    useState<KategorieFilter>("alle");
  const [suchbegriff, setSuchbegriff] = useState("");
  const [ausgewaehltesProdukt, setAusgewaehltesProdukt] =
    useState<MenuProduct | null>(null);
  const [kategorien, setKategorien] = useState<MenuCategory[]>([]);
  const [menuLaedt, setMenuLaedt] = useState(true);
  const [menuFehler, setMenuFehler] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [warenkorb, setWarenkorb] = useState<Cart | null>(null);
  const [warenkorbGeladen, setWarenkorbGeladen] = useState(false);
  const [warenkorbMutationLaeuft, setWarenkorbMutationLaeuft] = useState(false);
  const [warenkorbFehler, setWarenkorbFehler] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;

    async function menuLaden() {
      try {
        setMenuLaedt(true);
        setMenuFehler(null);

        const menu = await getMenu();

        if (aktiv) {
          setKategorien(menu.categories);
        }
      } catch (error) {
        if (aktiv) {
          setMenuFehler(
            error instanceof Error
              ? error.message
              : "Die Speisekarte konnte nicht geladen werden.",
          );
        }
      } finally {
        if (aktiv) {
          setMenuLaedt(false);
        }
      }
    }

    void menuLaden();

    return () => {
      aktiv = false;
    };
  }, []);

  useEffect(() => {
    let aktiv = true;

    async function backendCartInitialisieren() {
      try {
        setWarenkorbGeladen(false);
        setWarenkorbFehler(null);

        const gespeicherteCartId =
          window.localStorage.getItem(CART_ID_SPEICHER);

        if (gespeicherteCartId) {
          try {
            const vorhandenerCart = await getCart(gespeicherteCartId);

            if (!aktiv) {
              return;
            }

            setCartId(vorhandenerCart.cartId);
            setWarenkorb(vorhandenerCart);
            return;
          } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 404) {
              throw error;
            }

            window.localStorage.removeItem(CART_ID_SPEICHER);
          }
        }

        const neuerCart = await createCart();

        if (!aktiv) {
          return;
        }

        window.localStorage.setItem(CART_ID_SPEICHER, neuerCart.cartId);
        setCartId(neuerCart.cartId);
        setWarenkorb(neuerCart);
      } catch (error) {
        if (!aktiv) {
          return;
        }

        setWarenkorbFehler(
          error instanceof Error
            ? error.message
            : "Der Warenkorb konnte nicht initialisiert werden.",
        );
      } finally {
        if (aktiv) {
          setWarenkorbGeladen(true);
        }
      }
    }

    void backendCartInitialisieren();

    return () => {
      aktiv = false;
    };
  }, []);

  const produkte = useMemo(
    () =>
      kategorien.flatMap((kategorie) =>
        kategorie.products.map((produkt) => ({
          produkt,
          kategorieId: kategorie.id,
        })),
      ),
    [kategorien],
  );

  const sichtbareProdukte = useMemo(() => {
    const suche = suchbegriff.trim().toLowerCase();

    return produkte
      .filter(({ produkt, kategorieId }) => {
        const passtZurKategorie =
          aktiveKategorie === "alle" ||
          (aktiveKategorie === "highlights" && produkt.isHighlight) ||
          kategorieId === aktiveKategorie;

        const suchtext = [
          produkt.name,
          produkt.shortDescription,
          produkt.description,
        ]
          .filter((wert): wert is string => Boolean(wert))
          .join(" ")
          .toLowerCase();

        return (
          passtZurKategorie && (suche.length === 0 || suchtext.includes(suche))
        );
      })
      .map(({ produkt }) => produkt);
  }, [aktiveKategorie, produkte, suchbegriff]);

  const zwischensumme = warenkorb ? Number.parseFloat(warenkorb.total) : 0;

  const artikelanzahl =
    warenkorb?.items.reduce(
      (summe, position) => summe + position.quantity,
      0,
    ) ?? 0;

  useEffect(() => {
    if (!warenkorbGeladen) {
      return;
    }

    window.dispatchEvent(new Event(WARENKORB_EVENT));
  }, [artikelanzahl, warenkorbGeladen]);

  function produktAuswaehlen(produkt: MenuProduct) {
    setAusgewaehltesProdukt(produkt);
  }

  async function zumWarenkorbHinzufuegen(auswahl: WarenkorbAuswahl) {
    if (!cartId || warenkorbMutationLaeuft) {
      return;
    }

    try {
      setWarenkorbMutationLaeuft(true);
      setWarenkorbFehler(null);

      const aktualisierterCart = await addCartItem(cartId, {
        productId: auswahl.produkt.id,
        quantity: auswahl.menge,
        optionIds: auswahl.optionen.map((option) => option.produktoption_id),
      });

      setWarenkorb(aktualisierterCart);
    } catch (error) {
      setWarenkorbFehler(
        error instanceof Error
          ? error.message
          : "Das Produkt konnte nicht zum Warenkorb hinzugefügt werden.",
      );
    } finally {
      setWarenkorbMutationLaeuft(false);
    }
  }

  async function mengeAendern(
    itemId: number,
    aktuelleMenge: number,
    veraenderung: number,
  ) {
    if (!cartId || warenkorbMutationLaeuft) {
      return;
    }

    const neueMenge = aktuelleMenge + veraenderung;

    if (neueMenge < 1 || neueMenge > 99) {
      return;
    }

    try {
      setWarenkorbMutationLaeuft(true);
      setWarenkorbFehler(null);

      const aktualisierterCart = await updateCartItem(cartId, itemId, {
        quantity: neueMenge,
      });

      setWarenkorb(aktualisierterCart);
    } catch (error) {
      setWarenkorbFehler(
        error instanceof Error
          ? error.message
          : "Die Menge konnte nicht geändert werden.",
      );
    } finally {
      setWarenkorbMutationLaeuft(false);
    }
  }

  async function positionEntfernen(itemId: number) {
    if (!cartId || warenkorbMutationLaeuft) {
      return;
    }

    try {
      setWarenkorbMutationLaeuft(true);
      setWarenkorbFehler(null);

      const aktualisierterCart = await removeCartItem(cartId, itemId);

      setWarenkorb(aktualisierterCart);
    } catch (error) {
      setWarenkorbFehler(
        error instanceof Error
          ? error.message
          : "Das Produkt konnte nicht entfernt werden.",
      );
    } finally {
      setWarenkorbMutationLaeuft(false);
    }
  }

  async function warenkorbLeeren() {
    if (
      !cartId ||
      warenkorbMutationLaeuft ||
      (warenkorb?.items.length ?? 0) === 0
    ) {
      return;
    }

    try {
      setWarenkorbMutationLaeuft(true);
      setWarenkorbFehler(null);

      const geleerterCart = await clearCart(cartId);

      setWarenkorb(geleerterCart);
    } catch (error) {
      setWarenkorbFehler(
        error instanceof Error
          ? error.message
          : "Der Warenkorb konnte nicht geleert werden.",
      );
    } finally {
      setWarenkorbMutationLaeuft(false);
    }
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
              key={kategorie.id}
              className={
                aktiveKategorie === kategorie.id ? styles.activeCategory : ""
              }
              onClick={() => setAktiveKategorie(kategorie.id)}
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
                        (kategorie) => kategorie.id === aktiveKategorie,
                      )?.name}
              </h2>
            </div>

            <span>
              {sichtbareProdukte.length}{" "}
              {sichtbareProdukte.length === 1 ? "Gericht" : "Gerichte"}
            </span>
          </div>

          {menuLaedt ? (
            <div className={styles.emptyResults}>
              <h3>Speisekarte wird geladen …</h3>
              <p>Die aktuellen Gerichte werden vom Restaurant abgerufen.</p>
            </div>
          ) : menuFehler ? (
            <div className={styles.emptyResults}>
              <h3>Speisekarte konnte nicht geladen werden</h3>
              <p>{menuFehler}</p>
              <button type="button" onClick={() => window.location.reload()}>
                Erneut versuchen
              </button>
            </div>
          ) : sichtbareProdukte.length > 0 ? (
            <div className={styles.productGrid}>
              {sichtbareProdukte.map((produkt) => (
                <ProductCard
                  key={produkt.id}
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

        <aside
          id="warenkorb"
          className={styles.cart}
          aria-label="Warenkorb"
        >
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

          {warenkorbFehler && (
            <div className={styles.emptyCart}>
              <p>{warenkorbFehler}</p>
            </div>
          )}

          <div className={styles.cartBody} aria-live="polite">
            {!warenkorbGeladen ? (
              <div className={styles.emptyCart}>
                <p>Warenkorb wird geladen …</p>
              </div>
            ) : (warenkorb?.items.length ?? 0) > 0 ? (
              <div className={styles.cartItems}>
                {warenkorb?.items.map((position) => (
                  <article className={styles.cartItem} key={position.itemId}>
                    <div className={styles.cartItemHeader}>
                      <div>
                        <h3>{position.product.name}</h3>
                        <span>
                          {position.quantity} ×{" "}
                          {formatPrice(position.baseUnitPrice)}
                        </span>
                      </div>
                      <strong>{formatPrice(position.lineTotal)}</strong>
                    </div>

                    {position.options.length > 0 && (
                      <ul className={styles.cartOptions}>
                        {position.options.map((option) => (
                          <li key={option.id}>
                            <span>{option.name}</span>
                            {Number.parseFloat(option.surcharge) > 0 && (
                              <small>+ {formatPrice(option.surcharge)}</small>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className={styles.cartItemFooter}>
                      <div
                        className={styles.cartQuantity}
                        aria-label={`Menge für ${position.product.name}`}
                      >
                        <button
                          type="button"
                          disabled={
                            position.quantity <= 1 || warenkorbMutationLaeuft
                          }
                          onClick={() =>
                            mengeAendern(position.itemId, position.quantity, -1)
                          }
                          aria-label={`Menge von ${position.product.name} verringern`}
                        >
                          −
                        </button>
                        <span>{position.quantity}</span>
                        <button
                          type="button"
                          disabled={
                            position.quantity >= 99 || warenkorbMutationLaeuft
                          }
                          onClick={() =>
                            mengeAendern(position.itemId, position.quantity, 1)
                          }
                          aria-label={`Menge von ${position.product.name} erhöhen`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.removeItem}
                        disabled={warenkorbMutationLaeuft}
                        onClick={() => positionEntfernen(position.itemId)}
                        aria-label={`${position.product.name} aus dem Warenkorb entfernen`}
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
                {artikelanzahl > 0 && <small>{artikelanzahl} Artikel</small>}
              </span>
              <strong>{formatPrice(zwischensumme)}</strong>
            </div>

            {(warenkorb?.items.length ?? 0) > 0 && (
              <button
                type="button"
                className={styles.removeItem}
                disabled={warenkorbMutationLaeuft}
                onClick={warenkorbLeeren}
              >
                Warenkorb leeren
              </button>
            )}

            <button
              type="button"
              disabled={
                (warenkorb?.items.length ?? 0) === 0 || warenkorbMutationLaeuft
              }
              onClick={() => router.push("/checkout")}
            >
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