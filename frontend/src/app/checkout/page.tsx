"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ApiError,
  formatPrice,
  getCart,
  getPaymentMethods,
  createOrder,
  type Cart,
  type OrderCustomer,
  type PaymentMethod,
} from "@/lib/api";

import { useRouter } from "next/navigation";
import styles from "./checkout.module.css";

const CART_ID_SPEICHER = "palmen-grill-cart-id";

type FormularFehler = Partial<Record<keyof OrderCustomer, string>>;

export default function CheckoutPage() {
  const router = useRouter();
  const [warenkorb, setWarenkorb] = useState<Cart | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [paymentFehler, setPaymentFehler] = useState<string | null>(null);

  const [requestedTime, setRequestedTime] = useState("");
  const [requestedTimeFehler, setRequestedTimeFehler] = useState<string | null>(
    null,
  );

  const [bestellungLaeuft, setBestellungLaeuft] = useState(false);
  const [bestellFehler, setBestellFehler] = useState<string | null>(null);

  const [customer, setCustomer] = useState<OrderCustomer>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [formularFehler, setFormularFehler] = useState<FormularFehler>({});

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      try {
        setLaedt(true);
        setFehler(null);

        const cartId = window.localStorage.getItem(CART_ID_SPEICHER);

        if (!cartId) {
          throw new Error("Es wurde kein Warenkorb gefunden.");
        }

        const cart = await getCart(cartId);

        if (!aktiv) {
          return;
        }

        setWarenkorb(cart);
      } catch (error) {
        if (!aktiv) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          window.localStorage.removeItem(CART_ID_SPEICHER);
        }

        setFehler(
          error instanceof Error
            ? error.message
            : "Der Warenkorb konnte nicht geladen werden.",
        );
      } finally {
        if (aktiv) {
          setLaedt(false);
        }
      }
    }

    void laden();

    return () => {
      aktiv = false;
    };
  }, []);

  useEffect(() => {
    let aktiv = true;

    async function zahlungsartenLaden() {
      try {
        const response = await getPaymentMethods();

        if (!aktiv) {
          return;
        }

        setPaymentMethods(response.paymentMethods);
      } catch (error) {
        if (!aktiv) {
          return;
        }

        setPaymentFehler(
          error instanceof Error
            ? error.message
            : "Die Zahlungsarten konnten nicht geladen werden.",
        );
      }
    }

    void zahlungsartenLaden();

    return () => {
      aktiv = false;
    };
  }, []);

  function feldAendern(feld: keyof OrderCustomer, wert: string) {
    setCustomer((aktuell) => ({
      ...aktuell,
      [feld]: wert,
    }));

    setFormularFehler((aktuell) => ({
      ...aktuell,
      [feld]: undefined,
    }));
  }

  function kundendatenValidieren(): boolean {
    const neueFehler: FormularFehler = {};

    const firstName = customer.firstName.trim();
    const lastName = customer.lastName.trim();
    const phone = customer.phone.trim();
    const email = customer.email.trim();

    if (!firstName) {
      neueFehler.firstName = "Bitte gib deinen Vornamen ein.";
    } else if (firstName.length > 100) {
      neueFehler.firstName =
        "Der Vorname darf höchstens 100 Zeichen lang sein.";
    }

    if (!lastName) {
      neueFehler.lastName = "Bitte gib deinen Nachnamen ein.";
    } else if (lastName.length > 100) {
      neueFehler.lastName =
        "Der Nachname darf höchstens 100 Zeichen lang sein.";
    }

    if (!phone) {
      neueFehler.phone = "Bitte gib deine Telefonnummer ein.";
    } else if (phone.length < 6 || phone.length > 30) {
      neueFehler.phone =
        "Die Telefonnummer muss zwischen 6 und 30 Zeichen lang sein.";
    } else if (!/^\+?[0-9][0-9 ()/-]*$/.test(phone)) {
      neueFehler.phone = "Bitte gib eine gültige Telefonnummer ein.";
    }

    if (!email) {
      neueFehler.email = "Bitte gib deine E-Mail-Adresse ein.";
    } else if (email.length > 150) {
      neueFehler.email =
        "Die E-Mail-Adresse darf höchstens 150 Zeichen lang sein.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      neueFehler.email = "Bitte gib eine gültige E-Mail-Adresse ein.";
    }

    setFormularFehler(neueFehler);

    return Object.keys(neueFehler).length === 0;
  }

  function abholzeitValidieren(): boolean {
    if (!requestedTime) {
      setRequestedTimeFehler("Bitte wähle einen Abholzeitpunkt aus.");
      return false;
    }

    const ausgewaehlteZeit = new Date(requestedTime);

    if (Number.isNaN(ausgewaehlteZeit.getTime())) {
      setRequestedTimeFehler("Der Abholzeitpunkt ist ungültig.");
      return false;
    }

    const jetzt = new Date();
    const fruehesteZeit = new Date(jetzt.getTime() + 30 * 60 * 1000);
    const spaetesteZeit = new Date(jetzt.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (ausgewaehlteZeit < fruehesteZeit) {
      setRequestedTimeFehler(
        "Die Abholung muss mindestens 30 Minuten in der Zukunft liegen.",
      );
      return false;
    }

    if (ausgewaehlteZeit > spaetesteZeit) {
      setRequestedTimeFehler(
        "Die Abholung darf höchstens 14 Tage im Voraus liegen.",
      );
      return false;
    }

    setRequestedTimeFehler(null);
    return true;
  }

  async function weiter() {
    const kundendatenGueltig = kundendatenValidieren();
    const abholzeitGueltig = abholzeitValidieren();

    if (!paymentMethodId) {
      setPaymentFehler("Bitte wähle eine Zahlungsart aus.");
    }

    if (
      !kundendatenGueltig ||
      !abholzeitGueltig ||
      !paymentMethodId ||
      !warenkorb
    ) {
      return;
    }

    try {
      setBestellungLaeuft(true);
      setBestellFehler(null);

      const bestellung = await createOrder({
        cartId: warenkorb.cartId,
        paymentMethodId,
        customer: {
          firstName: customer.firstName.trim(),
          lastName: customer.lastName.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim(),
        },
        requestedTime: new Date(requestedTime).toISOString(),
      });

      window.localStorage.removeItem(CART_ID_SPEICHER);

      router.push(`/bestellung/${encodeURIComponent(bestellung.orderNumber)}`);
    } catch (error) {
      setBestellFehler(
        error instanceof Error
          ? error.message
          : "Die Bestellung konnte nicht erstellt werden.",
      );
    } finally {
      setBestellungLaeuft(false);
    }
  }
 if (laedt) {
  return (
    <main className={styles.page}>
      <section className={styles.state}>
        <h1>Checkout</h1>
        <p>Warenkorb wird geladen …</p>
      </section>
    </main>
  );
}

if (fehler) {
  return (
    <main className={styles.page}>
      <section className={styles.state}>
        <h1>Checkout</h1>
        <p>{fehler}</p>
        <Link href="/speisekarte">Zurück zur Speisekarte</Link>
      </section>
    </main>
  );
}

if (!warenkorb || warenkorb.items.length === 0) {
  return (
    <main className={styles.page}>
      <section className={styles.state}>
        <h1>Checkout</h1>
        <p>Dein Warenkorb ist leer.</p>
        <Link href="/speisekarte">Zur Speisekarte</Link>
      </section>
    </main>
  );
}

return (
  <main className={styles.page}>
    <div className={styles.container}>
      <Link href="/speisekarte" className={styles.backLink}>
        ← Zurück zur Speisekarte
      </Link>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Fast geschafft</p>
        <h1>Bestellung abschließen</h1>
        <p className={styles.subtitle}>
          Prüfe deine Bestellung, gib deine Kontaktdaten ein und wähle deine
          gewünschte Abholzeit.
        </p>
      </section>

      <div className={styles.steps} aria-label="Bestellfortschritt">
        <div className={`${styles.step} ${styles.stepDone}`}>
          <div className={styles.stepCircle}>✓</div>
          <span>Warenkorb</span>
        </div>

        <div className={`${styles.step} ${styles.stepActive}`}>
          <div className={styles.stepCircle}>2</div>
          <span>Daten &amp; Zahlung</span>
        </div>

        <div className={styles.step}>
          <div className={styles.stepCircle}>3</div>
          <span>Bestätigung</span>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          <section className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.numberBadge}>1</div>

                <div>
                  <p className={styles.cardEyebrow}>Persönliche Angaben</p>
                  <h2 className={styles.cardTitle}>Deine Kontaktdaten</h2>
                </div>
              </div>

              <p className={styles.description}>
                Damit wir deine Bestellung eindeutig zuordnen können.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label htmlFor="firstName">Vorname *</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={customer.firstName}
                    onChange={(event) =>
                      feldAendern("firstName", event.target.value)
                    }
                    placeholder="Vorname"
                    maxLength={100}
                    required
                  />

                  {formularFehler.firstName && (
                    <p className={styles.error}>
                      {formularFehler.firstName}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="lastName">Nachname *</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={customer.lastName}
                    onChange={(event) =>
                      feldAendern("lastName", event.target.value)
                    }
                    placeholder="Nachname"
                    maxLength={100}
                    required
                  />

                  {formularFehler.lastName && (
                    <p className={styles.error}>
                      {formularFehler.lastName}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="email">E-Mail *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={customer.email}
                    onChange={(event) =>
                      feldAendern("email", event.target.value)
                    }
                    placeholder="name@beispiel.de"
                    maxLength={150}
                    required
                  />

                  {formularFehler.email && (
                    <p className={styles.error}>{formularFehler.email}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="phone">Telefon *</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={customer.phone}
                    onChange={(event) =>
                      feldAendern("phone", event.target.value)
                    }
                    placeholder="+49 ..."
                    minLength={6}
                    maxLength={30}
                    required
                  />

                  {formularFehler.phone && (
                    <p className={styles.error}>{formularFehler.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.numberBadge}>2</div>

                <div>
                  <p className={styles.cardEyebrow}>Abholung</p>
                  <h2 className={styles.cardTitle}>Abholzeit wählen</h2>
                </div>
              </div>

              <p className={styles.description}>
                Teile uns mit, wann du deine Bestellung abholen möchtest.
              </p>

              <div className={styles.pickupInfo}>
                <div className={styles.pickupIcon}>⏱</div>

                <div>
                  <strong>Frisch zur Abholung</strong>
                  <p>
                    Wir bereiten deine Bestellung passend zu deiner Wunschzeit
                    zu.
                  </p>
                </div>
              </div>

              <div className={`${styles.field} ${styles.timeField}`}>
                <label htmlFor="requestedTime">
                  Gewünschter Abholzeitpunkt *
                </label>

                <input
                  id="requestedTime"
                  name="requestedTime"
                  type="datetime-local"
                  value={requestedTime}
                  onChange={(event) => {
                    setRequestedTime(event.target.value);
                    setRequestedTimeFehler(null);
                  }}
                  required
                />

                <p className={styles.helper}>
                  Bitte plane mindestens 30 Minuten Vorbereitungszeit ein.
                </p>

                {requestedTimeFehler && (
                  <p className={styles.error}>{requestedTimeFehler}</p>
                )}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.numberBadge}>3</div>

                <div>
                  <p className={styles.cardEyebrow}>Bezahlung</p>
                  <h2 className={styles.cardTitle}>Zahlungsart</h2>
                </div>
              </div>

              <p className={styles.description}>
                Wähle aus, wie du deine Bestellung bezahlen möchtest.
              </p>

              {paymentFehler && (
                <p className={styles.error}>{paymentFehler}</p>
              )}

              <div className={styles.paymentGrid}>
                {paymentMethods.map((paymentMethod) => {
                  const selected = paymentMethodId === paymentMethod.id;

                  return (
                    <label
                      key={paymentMethod.id}
                      className={`${styles.paymentOption} ${
                        selected ? styles.paymentOptionSelected : ""
                      }`}
                    >
                      <div className={styles.paymentIcon}>€</div>

                      <div>
                        <span className={styles.paymentName}>
                          {paymentMethod.name}
                        </span>
                        <span className={styles.paymentDescription}>
                          Bei Abholung bezahlen
                        </span>
                      </div>

                      <input
                        type="radio"
                        name="paymentMethod"
                        value={paymentMethod.id}
                        checked={selected}
                        onChange={() => {
                          setPaymentMethodId(paymentMethod.id);
                          setPaymentFehler(null);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <aside className={`${styles.card} ${styles.summary}`}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryHeaderTop}>
              <div>
                <p className={styles.summaryEyebrow}>Dein Warenkorb</p>
                <h2 className={styles.summaryTitle}>Bestellübersicht</h2>
              </div>

              <span className={styles.itemCount}>
                {warenkorb.items.reduce(
                  (summe, position) => summe + position.quantity,
                  0,
                )}{" "}
                Artikel
              </span>
            </div>
          </div>

          <div className={styles.items}>
            {warenkorb.items.map((position) => (
              <article key={position.itemId} className={styles.item}>
                <div className={styles.quantity}>
                  {position.quantity}×
                </div>

                <div>
                  <h3 className={styles.itemName}>
                    {position.product.name}
                  </h3>

                  <p className={styles.itemBasePrice}>
                    {formatPrice(position.baseUnitPrice)} pro Stück
                  </p>
                </div>

                <strong className={styles.itemPrice}>
                  {formatPrice(position.lineTotal)}
                </strong>

                {position.options.length > 0 && (
                  <ul className={styles.options}>
                    {position.options.map((option) => (
                      <li key={option.id} className={styles.option}>
                        {option.name}
                        {Number.parseFloat(option.surcharge) > 0
                          ? ` (+ ${formatPrice(option.surcharge)})`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Zwischensumme</span>
              <span>{formatPrice(warenkorb.total)}</span>
            </div>

            <div className={styles.totalRow}>
              <span>Abholung</span>
              <span className={styles.free}>Kostenlos</span>
            </div>

            <div className={styles.grandTotal}>
              <span>Gesamt</span>
              <strong>{formatPrice(warenkorb.total)}</strong>
            </div>

            {bestellFehler && (
              <p className={styles.error}>{bestellFehler}</p>
            )}

            <button
              className={styles.submitButton}
              type="button"
              onClick={() => void weiter()}
              disabled={bestellungLaeuft}
            >
              <span>
                {bestellungLaeuft
                  ? "Bestellung wird übermittelt …"
                  : "Bestellung aufgeben"}
              </span>
              <span aria-hidden="true">→</span>
            </button>

            <div className={styles.secureInfo}>
              <span className={styles.secureCheck}>✓</span>

              <span>
                Deine Bestellung wird erst nach Klick auf den Button
                verbindlich übermittelt.
              </span>
            </div>

            <Link href="/speisekarte" className={styles.editCart}>
              Warenkorb bearbeiten
            </Link>
          </div>
        </aside>
      </div>
    </div>
  </main>
);
}