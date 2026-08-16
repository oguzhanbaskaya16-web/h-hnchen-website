"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  createOrder,
  formatPrice,
  getCart,
  getPaymentMethods,
  type Cart,
  type OrderCustomer,
  type PaymentMethod,
} from "@/lib/api";
import styles from "./checkout.module.css";

const CART_ID_SPEICHER = "palmen-grill-cart-id";

type FormularFehler = Partial<Record<keyof OrderCustomer, string>>;

type ZeitGrenzen = {
  min: string;
  max: string;
};

function alsLokaleDatumZeit(date: Date): string {
  const lokaleZeit = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return lokaleZeit.toISOString().slice(0, 16);
}

function zahlungsIcon(paymentMethod: PaymentMethod): string {
  const name = paymentMethod.name.toLowerCase();

  if (name.includes("bar")) {
    return "€";
  }

  if (name.includes("paypal")) {
    return "P";
  }

  return "▰";
}

function bestellfehlerText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "Der Warenkorb ist nicht mehr verfügbar. Bitte stelle deine Bestellung in der Speisekarte erneut zusammen.";
    }

    if (error.status === 409) {
      return "Mindestens eine Position ist aktuell nicht mehr verfügbar. Bitte gehe zurück zur Speisekarte und prüfe deinen Warenkorb.";
    }

    if (error.status === 429 || error.status === 503) {
      return "Wir können gerade keine weitere Bestellung annehmen. Bitte versuche es in wenigen Minuten erneut.";
    }

    return error.message;
  }

  if (error instanceof TypeError) {
    return "Die Verbindung zum Bestellsystem wurde unterbrochen. Deine Eingaben bleiben erhalten – bitte prüfe deine Internetverbindung und versuche es erneut.";
  }

  return error instanceof Error
    ? error.message
    : "Die Bestellung konnte nicht erstellt werden. Bitte versuche es erneut.";
}

export default function CheckoutPage() {
  const router = useRouter();
  const bestellungSperre = useRef(false);

  const [warenkorb, setWarenkorb] = useState<Cart | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLaedt, setPaymentMethodsLaedt] = useState(true);
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [paymentLadeFehler, setPaymentLadeFehler] = useState<string | null>(null);
  const [paymentAuswahlFehler, setPaymentAuswahlFehler] = useState<string | null>(
    null,
  );

  const [requestedTime, setRequestedTime] = useState("");
  const [requestedTimeFehler, setRequestedTimeFehler] = useState<string | null>(
    null,
  );
  const [zeitGrenzen, setZeitGrenzen] = useState<ZeitGrenzen>({
    min: "",
    max: "",
  });

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
    const timer = window.setTimeout(() => {
      const jetzt = new Date();

      setZeitGrenzen({
        min: alsLokaleDatumZeit(new Date(jetzt.getTime() + 30 * 60 * 1000)),
        max: alsLokaleDatumZeit(
          new Date(jetzt.getTime() + 14 * 24 * 60 * 60 * 1000),
        ),
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

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

        if (aktiv) {
          setWarenkorb(cart);
        }
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
        setPaymentMethodsLaedt(true);
        setPaymentLadeFehler(null);

        const response = await getPaymentMethods();

        if (aktiv) {
          setPaymentMethods(response.paymentMethods);
        }
      } catch (error) {
        if (!aktiv) {
          return;
        }

        setPaymentLadeFehler(
          error instanceof Error
            ? error.message
            : "Die Zahlungsarten konnten nicht geladen werden.",
        );
      } finally {
        if (aktiv) {
          setPaymentMethodsLaedt(false);
        }
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
    setBestellFehler(null);
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
    if (bestellungSperre.current || bestellungLaeuft) {
      return;
    }

    const kundendatenGueltig = kundendatenValidieren();
    const abholzeitGueltig = abholzeitValidieren();

    if (!paymentMethodId) {
      setPaymentAuswahlFehler("Bitte wähle eine Zahlungsart aus.");
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
      bestellungSperre.current = true;
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
      setBestellFehler(bestellfehlerText(error));
    } finally {
      bestellungSperre.current = false;
      setBestellungLaeuft(false);
    }
  }

  if (laedt) {
    return (
      <main className={styles.statePage} aria-busy="true">
        <section className={styles.stateCard}>
          <span className={styles.loader} aria-hidden="true" />
          <p className={styles.stateKicker}>Einen Moment bitte</p>
          <h1>Dein Checkout wird vorbereitet</h1>
          <p>Wir laden deinen Warenkorb und die verfügbaren Zahlungsarten.</p>
          <div className={styles.skeletonLines} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }

  if (fehler) {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard} role="alert">
          <span className={styles.stateIcon} aria-hidden="true">
            !
          </span>
          <p className={styles.stateKicker}>Warenkorb nicht verfügbar</p>
          <h1>Wir konnten deinen Checkout nicht öffnen</h1>
          <p>{fehler}</p>
          <div className={styles.stateActions}>
            <button type="button" onClick={() => window.location.reload()}>
              Erneut versuchen
            </button>
            <Link href="/speisekarte">Zur Speisekarte</Link>
          </div>
        </section>
      </main>
    );
  }

  if (!warenkorb || warenkorb.items.length === 0) {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <span className={styles.stateIcon} aria-hidden="true">
            🛍
          </span>
          <p className={styles.stateKicker}>Noch nichts ausgewählt</p>
          <h1>Dein Warenkorb ist leer</h1>
          <p>
            Entdecke unsere frisch zubereiteten Gerichte und stelle deine
            Bestellung zusammen.
          </p>
          <div className={styles.stateActions}>
            <Link href="/speisekarte">Speisekarte ansehen</Link>
          </div>
        </section>
      </main>
    );
  }

  const anzahlArtikel = warenkorb.items.reduce(
    (summe, position) => summe + position.quantity,
    0,
  );
  const bestellButtonDeaktiviert =
    bestellungLaeuft || paymentMethodsLaedt || paymentMethods.length === 0;

  return (
    <main className={styles.page}>
      <div className={styles.backgroundMark} aria-hidden="true" />

      <header className={styles.intro}>
        <Link className={styles.backLink} href="/speisekarte">
          <span aria-hidden="true">←</span> Zurück zur Speisekarte
        </Link>
        <p className={styles.eyebrow}>Fast geschafft</p>
        <h1>Bestellung abschließen</h1>
        <p className={styles.introText}>
          Prüfe deine Auswahl, hinterlege deine Kontaktdaten und wähle deine
          gewünschte Abholzeit.
        </p>

        <ol className={styles.steps} aria-label="Bestellfortschritt">
          <li className={styles.completedStep}>
            <span>✓</span>
            <strong>Warenkorb</strong>
          </li>
          <li className={styles.activeStep} aria-current="step">
            <span>2</span>
            <strong>Daten &amp; Zahlung</strong>
          </li>
          <li>
            <span>3</span>
            <strong>Bestätigung</strong>
          </li>
        </ol>
      </header>

      <div className={styles.checkoutLayout}>
        <form
          className={styles.checkoutForm}
          id="checkout-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void weiter();
          }}
        >
          <section className={styles.formCard} aria-labelledby="customer-title">
            <div className={styles.cardHeading}>
              <span className={styles.cardNumber}>1</span>
              <div>
                <p>Persönliche Angaben</p>
                <h2 id="customer-title">Deine Kontaktdaten</h2>
              </div>
            </div>

            <p className={styles.cardDescription}>
              Wir verwenden diese Angaben ausschließlich für Rückfragen zu
              deiner Bestellung.
            </p>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="firstName">
                  Vorname <span>*</span>
                </label>
                <input
                  aria-describedby={
                    formularFehler.firstName ? "firstName-error" : undefined
                  }
                  aria-invalid={Boolean(formularFehler.firstName)}
                  className={
                    formularFehler.firstName ? styles.inputError : undefined
                  }
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Dein Vorname"
                  value={customer.firstName}
                  onChange={(event) =>
                    feldAendern("firstName", event.target.value)
                  }
                  maxLength={100}
                  required
                />
                {formularFehler.firstName && (
                  <p className={styles.fieldError} id="firstName-error">
                    <span aria-hidden="true">!</span>
                    {formularFehler.firstName}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="lastName">
                  Nachname <span>*</span>
                </label>
                <input
                  aria-describedby={
                    formularFehler.lastName ? "lastName-error" : undefined
                  }
                  aria-invalid={Boolean(formularFehler.lastName)}
                  className={
                    formularFehler.lastName ? styles.inputError : undefined
                  }
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Dein Nachname"
                  value={customer.lastName}
                  onChange={(event) =>
                    feldAendern("lastName", event.target.value)
                  }
                  maxLength={100}
                  required
                />
                {formularFehler.lastName && (
                  <p className={styles.fieldError} id="lastName-error">
                    <span aria-hidden="true">!</span>
                    {formularFehler.lastName}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="email">
                  E-Mail-Adresse <span>*</span>
                </label>
                <input
                  aria-describedby={
                    formularFehler.email ? "email-error" : undefined
                  }
                  aria-invalid={Boolean(formularFehler.email)}
                  className={formularFehler.email ? styles.inputError : undefined}
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@beispiel.de"
                  value={customer.email}
                  onChange={(event) => feldAendern("email", event.target.value)}
                  maxLength={150}
                  required
                />
                {formularFehler.email && (
                  <p className={styles.fieldError} id="email-error">
                    <span aria-hidden="true">!</span>
                    {formularFehler.email}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="phone">
                  Telefonnummer <span>*</span>
                </label>
                <input
                  aria-describedby={
                    formularFehler.phone ? "phone-error" : undefined
                  }
                  aria-invalid={Boolean(formularFehler.phone)}
                  className={formularFehler.phone ? styles.inputError : undefined}
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="z. B. 0151 23456789"
                  value={customer.phone}
                  onChange={(event) => feldAendern("phone", event.target.value)}
                  minLength={6}
                  maxLength={30}
                  required
                />
                {formularFehler.phone && (
                  <p className={styles.fieldError} id="phone-error">
                    <span aria-hidden="true">!</span>
                    {formularFehler.phone}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className={styles.formCard} aria-labelledby="pickup-title">
            <div className={styles.cardHeading}>
              <span className={styles.cardNumber}>2</span>
              <div>
                <p>Frisch für dich zubereitet</p>
                <h2 id="pickup-title">Abholzeit wählen</h2>
              </div>
            </div>

            <div className={styles.pickupBox}>
              <span className={styles.pickupIcon} aria-hidden="true">
                ◷
              </span>
              <div>
                <strong>Abholung im Palmen Grill</strong>
                <p>Bitte plane mindestens 30 Minuten Vorbereitungszeit ein.</p>
              </div>
            </div>

            <div className={`${styles.field} ${styles.timeField}`}>
              <label htmlFor="requestedTime">
                Gewünschter Abholzeitpunkt <span>*</span>
              </label>
              <input
                aria-describedby={
                  requestedTimeFehler
                    ? "requestedTime-error requestedTime-hint"
                    : "requestedTime-hint"
                }
                aria-invalid={Boolean(requestedTimeFehler)}
                className={requestedTimeFehler ? styles.inputError : undefined}
                id="requestedTime"
                name="requestedTime"
                type="datetime-local"
                min={zeitGrenzen.min || undefined}
                max={zeitGrenzen.max || undefined}
                value={requestedTime}
                onChange={(event) => {
                  setRequestedTime(event.target.value);
                  setRequestedTimeFehler(null);
                  setBestellFehler(null);
                }}
                required
              />
              <p className={styles.fieldHint} id="requestedTime-hint">
                Möglich ab 30 Minuten und bis zu 14 Tage im Voraus.
              </p>
              {requestedTimeFehler && (
                <p className={styles.fieldError} id="requestedTime-error">
                  <span aria-hidden="true">!</span>
                  {requestedTimeFehler}
                </p>
              )}
            </div>
          </section>

          <section className={styles.formCard} aria-labelledby="payment-title">
            <div className={styles.cardHeading}>
              <span className={styles.cardNumber}>3</span>
              <div>
                <p>Sicher &amp; transparent</p>
                <h2 id="payment-title">Zahlungsart</h2>
              </div>
            </div>

            {paymentMethodsLaedt && (
              <div
                className={styles.paymentLoading}
                aria-live="polite"
                aria-busy="true"
              >
                <span className={styles.smallLoader} aria-hidden="true" />
                Zahlungsarten werden geladen …
              </div>
            )}

            {paymentLadeFehler && (
              <div className={styles.inlineError} role="alert">
                <span aria-hidden="true">!</span>
                <div>
                  <strong>Zahlungsarten nicht verfügbar</strong>
                  <p>{paymentLadeFehler}</p>
                  <button type="button" onClick={() => window.location.reload()}>
                    Seite neu laden
                  </button>
                </div>
              </div>
            )}

            {!paymentMethodsLaedt && paymentMethods.length > 0 && (
              <div
                className={styles.paymentGrid}
                role="radiogroup"
                aria-describedby={
                  paymentAuswahlFehler ? "payment-error" : undefined
                }
              >
                {paymentMethods.map((paymentMethod) => (
                  <label
                    className={`${styles.paymentOption} ${
                      paymentMethodId === paymentMethod.id
                        ? styles.selectedPayment
                        : ""
                    }`}
                    key={paymentMethod.id}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={paymentMethod.id}
                      checked={paymentMethodId === paymentMethod.id}
                      onChange={() => {
                        setPaymentMethodId(paymentMethod.id);
                        setPaymentAuswahlFehler(null);
                        setBestellFehler(null);
                      }}
                    />
                    <span className={styles.paymentIcon} aria-hidden="true">
                      {zahlungsIcon(paymentMethod)}
                    </span>
                    <span className={styles.paymentText}>
                      <strong>{paymentMethod.name}</strong>
                      <small>
                        {paymentMethod.isOnlinePayment
                          ? "Sicher online bezahlen"
                          : "Bezahlung bei der Abholung"}
                      </small>
                    </span>
                    <span className={styles.radioMark} aria-hidden="true" />
                  </label>
                ))}
              </div>
            )}

            {paymentAuswahlFehler && (
              <p className={styles.fieldError} id="payment-error" role="alert">
                <span aria-hidden="true">!</span>
                {paymentAuswahlFehler}
              </p>
            )}
          </section>

          {bestellFehler && (
            <div className={styles.submitError} role="alert" aria-live="assertive">
              <span aria-hidden="true">!</span>
              <div>
                <strong>Bestellung nicht übermittelt</strong>
                <p>{bestellFehler}</p>
              </div>
            </div>
          )}

          <div className={styles.mobileSubmit}>
            <button
              className={styles.submitButton}
              type="submit"
              disabled={bestellButtonDeaktiviert}
            >
              <span>
                {bestellungLaeuft
                  ? "Bestellung wird übermittelt …"
                  : "Bestellung aufgeben"}
              </span>
              {!bestellungLaeuft && <strong>{formatPrice(warenkorb.total)}</strong>}
              {bestellungLaeuft && (
                <span className={styles.buttonLoader} aria-hidden="true" />
              )}
            </button>
            <p>
              Mit dem Absenden bestätigst du die Richtigkeit deiner Angaben.
            </p>
          </div>
        </form>

        <aside className={styles.summary} aria-labelledby="summary-title">
          <div className={styles.summaryHeading}>
            <div>
              <p>Deine Auswahl</p>
              <h2 id="summary-title">Bestellübersicht</h2>
            </div>
            <span>{anzahlArtikel} Artikel</span>
          </div>

          <div className={styles.summaryItems}>
            {warenkorb.items.map((position) => (
              <article className={styles.summaryItem} key={position.itemId}>
                <span className={styles.quantity}>{position.quantity}×</span>
                <div className={styles.itemContent}>
                  <div className={styles.itemHeading}>
                    <h3>{position.product.name}</h3>
                    <strong>{formatPrice(position.lineTotal)}</strong>
                  </div>
                  <p>
                    Grundpreis {formatPrice(position.baseUnitPrice)} pro Stück
                  </p>

                  {position.options.length > 0 && (
                    <ul>
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
                </div>
              </article>
            ))}
          </div>

          <div className={styles.summaryTotals}>
            <div>
              <span>Zwischensumme</span>
              <strong>{formatPrice(warenkorb.total)}</strong>
            </div>
            <div>
              <span>Abholung</span>
              <strong className={styles.free}>Kostenlos</strong>
            </div>
            <div className={styles.totalRow}>
              <span>Gesamt</span>
              <strong>{formatPrice(warenkorb.total)}</strong>
            </div>
          </div>

          <button
            className={`${styles.submitButton} ${styles.desktopSubmit}`}
            type="submit"
            form="checkout-form"
            disabled={bestellButtonDeaktiviert}
          >
            <span>
              {bestellungLaeuft
                ? "Bestellung wird übermittelt …"
                : "Bestellung aufgeben"}
            </span>
            {!bestellungLaeuft && <strong>→</strong>}
            {bestellungLaeuft && (
              <span className={styles.buttonLoader} aria-hidden="true" />
            )}
          </button>

          <div className={styles.trustNote}>
            <span aria-hidden="true">✓</span>
            <p>
              <strong>Sichere Übermittlung</strong>
              Deine Bestellung wird erst nach einem Klick auf den Button
              verbindlich übermittelt.
            </p>
          </div>

          <Link className={styles.editCartLink} href="/speisekarte">
            Warenkorb bearbeiten
          </Link>
        </aside>
      </div>
    </main>
  );
}