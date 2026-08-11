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
      <main>
        <h1>Checkout</h1>
        <p>Warenkorb wird geladen …</p>
      </main>
    );
  }

  if (fehler) {
    return (
      <main>
        <h1>Checkout</h1>
        <p>{fehler}</p>
        <Link href="/speisekarte">Zurück zur Speisekarte</Link>
      </main>
    );
  }

  if (!warenkorb || warenkorb.items.length === 0) {
    return (
      <main>
        <h1>Checkout</h1>
        <p>Dein Warenkorb ist leer.</p>
        <Link href="/speisekarte">Zur Speisekarte</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Checkout</h1>

      <section>
        <h2>Deine Bestellung</h2>

        {warenkorb.items.map((position) => (
          <article key={position.itemId}>
            <h3>{position.product.name}</h3>

            <p>
              {position.quantity} × {formatPrice(position.baseUnitPrice)}
            </p>

            {position.options.length > 0 && (
              <ul>
                {position.options.map((option) => (
                  <li key={option.id}>
                    {option.name}
                    {Number.parseFloat(option.surcharge) > 0
                      ? ` (+ ${formatPrice(option.surcharge)})`
                      : ""}
                  </li>
                ))}
              </ul>
            )}

            <strong>{formatPrice(position.lineTotal)}</strong>
          </article>
        ))}

        <p>
          <strong>Gesamt: {formatPrice(warenkorb.total)}</strong>
        </p>
      </section>

      <section>
        <h2>Deine Daten</h2>

        <div>
          <label htmlFor="firstName">Vorname *</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={customer.firstName}
            onChange={(event) => feldAendern("firstName", event.target.value)}
            maxLength={100}
            required
          />

          {formularFehler.firstName && <p>{formularFehler.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName">Nachname *</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={customer.lastName}
            onChange={(event) => feldAendern("lastName", event.target.value)}
            maxLength={100}
            required
          />

          {formularFehler.lastName && <p>{formularFehler.lastName}</p>}
        </div>

        <div>
          <label htmlFor="email">E-Mail *</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={customer.email}
            onChange={(event) => feldAendern("email", event.target.value)}
            maxLength={150}
            required
          />

          {formularFehler.email && <p>{formularFehler.email}</p>}
        </div>

        <div>
          <label htmlFor="phone">Telefon *</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={customer.phone}
            onChange={(event) => feldAendern("phone", event.target.value)}
            minLength={6}
            maxLength={30}
            required
          />

          {formularFehler.phone && <p>{formularFehler.phone}</p>}
        </div>
      </section>

      <section>
        <h2>Abholzeit</h2>

        <div>
          <label htmlFor="requestedTime">Gewünschter Abholzeitpunkt *</label>

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

          <p>Bitte plane mindestens 30 Minuten Vorbereitungszeit ein.</p>

          {requestedTimeFehler && <p>{requestedTimeFehler}</p>}
        </div>
      </section>

      <section>
        <h2>Zahlungsart</h2>

        {paymentFehler && <p>{paymentFehler}</p>}

        {paymentMethods.map((paymentMethod) => (
          <label key={paymentMethod.id}>
            <input
              type="radio"
              name="paymentMethod"
              value={paymentMethod.id}
              checked={paymentMethodId === paymentMethod.id}
              onChange={() => {
                setPaymentMethodId(paymentMethod.id);
                setPaymentFehler(null);
              }}
            />

            {paymentMethod.name}
          </label>
        ))}

        {!paymentMethodId && paymentFehler === null && (
          <p>Bitte wähle eine Zahlungsart aus.</p>
        )}
      </section>

      {bestellFehler && <p>{bestellFehler}</p>}

      <button
        type="button"
        onClick={() => void weiter()}
        disabled={bestellungLaeuft}
      >
        {bestellungLaeuft
          ? "Bestellung wird übermittelt …"
          : "Bestellung aufgeben"}
      </button>

      <Link href="/speisekarte">Zurück zur Speisekarte</Link>
    </main>
  );
}
