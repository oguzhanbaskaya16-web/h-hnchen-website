"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { formatPrice, getOrder, getOrderPdfUrl, type Order } from "@/lib/api";
import styles from "./bestellung.module.css";

type PageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

const STATUS_TEXTE: Record<string, string> = {
  EINGEGANGEN: "Eingegangen",
  RECEIVED: "Eingegangen",
  BESTAETIGT: "Bestätigt",
  CONFIRMED: "Bestätigt",
  IN_ZUBEREITUNG: "In Zubereitung",
  PREPARING: "In Zubereitung",
  ABHOLBEREIT: "Abholbereit",
  READY: "Abholbereit",
  ABGEHOLT: "Abgeholt",
  COMPLETED: "Abgeholt",
  STORNIERT: "Storniert",
  CANCELLED: "Storniert",
  AUSSTEHEND: "Ausstehend",
  PENDING: "Ausstehend",
  BEZAHLT: "Bezahlt",
  PAID: "Bezahlt",
  FEHLGESCHLAGEN: "Fehlgeschlagen",
  FAILED: "Fehlgeschlagen",
};

function statusText(status: string) {
  const schluessel = status.trim().toUpperCase().replaceAll(" ", "_");

  return (
    STATUS_TEXTE[schluessel] ??
    status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (zeichen) => zeichen.toUpperCase())
  );
}

function statusFarbe(status: string): "gruen" | "gold" | "rot" {
  const schluessel = status.toUpperCase();

  if (
    schluessel.includes("STORNIERT") ||
    schluessel.includes("CANCELLED") ||
    schluessel.includes("FEHL") ||
    schluessel.includes("FAILED")
  ) {
    return "rot";
  }

  if (
    schluessel.includes("AUSSTEHEND") ||
    schluessel.includes("PENDING")
  ) {
    return "gold";
  }

  return "gruen";
}

function datumUndUhrzeit(wert: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(wert));
}

export default function BestellbestaetigungPage({ params }: PageProps) {
  const { orderNumber } = use(params);
  const [bestellung, setBestellung] = useState<Order | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      try {
        setLaedt(true);
        setFehler(null);
        const order = await getOrder(orderNumber);

        if (aktiv) {
          setBestellung(order);
        }
      } catch (error) {
        if (aktiv) {
          setFehler(
            error instanceof Error
              ? error.message
              : "Die Bestellung konnte nicht geladen werden.",
          );
        }
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
  }, [orderNumber]);

  if (laedt) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard} aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.eyebrow}>EINEN MOMENT BITTE</p>
          <h1>Bestellung wird geladen</h1>
          <p>Wir rufen deine Bestelldaten sicher ab.</p>
        </section>
      </main>
    );
  }

  if (fehler || !bestellung) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard}>
          <span className={styles.errorIcon} aria-hidden="true">!</span>
          <p className={styles.eyebrow}>BESTELLUNG NICHT GEFUNDEN</p>
          <h1>Das hat leider nicht geklappt</h1>
          <p>
            {fehler ??
              "Die gewünschte Bestellung konnte nicht geladen werden."}
          </p>
          <Link href="/speisekarte" className={styles.primaryLink}>
            Zur Speisekarte
          </Link>
        </section>
      </main>
    );
  }

  const zahlung = bestellung.payments[0];
  const artikelanzahl = bestellung.items.reduce(
    (summe, position) => summe + position.quantity,
    0,
  );
  const liefergebuehr = Number.parseFloat(bestellung.deliveryFee);
const rabatt = Number.parseFloat(bestellung.discountAmount);
const bestellnummer = bestellung.orderNumber;

function pdfOeffnen() {
  const pdfUrl = getOrderPdfUrl(bestellnummer);
  window.open(pdfUrl, "_blank", "noopener,noreferrer");
}

  return (
    <main className={styles.page}>
      <span className={styles.decorLeft} aria-hidden="true" />
      <span className={styles.decorRight} aria-hidden="true" />

      <div className={styles.container}>
        <Link href="/speisekarte" className={styles.backLink}>
          <span aria-hidden="true">←</span>
          Zurück zur Speisekarte
        </Link>

        <section className={styles.successHero}>
          <div className={styles.successIcon} aria-hidden="true">✓</div>
          <p className={styles.eyebrow}>BESTELLUNG ERFOLGREICH ÜBERMITTELT</p>
          <h1>Vielen Dank für deine Bestellung!</h1>
          <p className={styles.heroText}>
            Wir haben deine Bestellung erhalten und bereiten alles zur
            gewünschten Abholzeit frisch für dich vor.
          </p>

          <div className={styles.heroMeta}>
            <div className={styles.metaItem}>
              <span>Bestellnummer</span>
              <strong>{bestellung.orderNumber}</strong>
            </div>
            <div className={styles.metaItem}>
              <span>Status</span>
              <strong
                className={styles.statusBadge}
                data-farbe={statusFarbe(bestellung.status)}
              >
                <i aria-hidden="true" />
                {statusText(bestellung.status)}
              </strong>
            </div>
            <div className={styles.metaItem}>
              <span>Abholung</span>
              <strong>{datumUndUhrzeit(bestellung.requestedTime)} Uhr</strong>
            </div>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <header className={styles.cardHeader}>
                <div className={styles.sectionIcon} aria-hidden="true">🛍</div>
                <div>
                  <p className={styles.sectionLabel}>DEINE AUSWAHL</p>
                  <h2>Bestellpositionen</h2>
                </div>
                <span className={styles.articleCount}>
                  {artikelanzahl} Artikel
                </span>
              </header>

              <div className={styles.orderItems}>
                {bestellung.items.map((position) => (
                  <article className={styles.orderItem} key={position.itemId}>
                    <div className={styles.quantityBadge}>
                      {position.quantity}×
                    </div>
                    <div className={styles.itemContent}>
                      <div className={styles.itemHeading}>
                        <div>
                          <h3>{position.product.name}</h3>
                          <p>
                            Grundpreis {formatPrice(position.baseUnitPrice)} pro
                            Stück
                          </p>
                        </div>
                        <strong>{formatPrice(position.lineTotal)}</strong>
                      </div>

                      {position.options.length > 0 && (
                        <ul className={styles.optionsList}>
                          {position.options.map((option) => (
                            <li key={option.id}>
                              <span>
                                <i aria-hidden="true">✓</i>
                                {option.name}
                              </span>
                              {Number.parseFloat(option.surcharge) > 0 && (
                                <strong>+ {formatPrice(option.surcharge)}</strong>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className={styles.itemCalculation}>
                        <span>
                          {position.quantity} × {formatPrice(position.unitTotal)}
                        </span>
                        <strong>{formatPrice(position.lineTotal)}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {bestellung.note && (
              <section className={`${styles.card} ${styles.noteCard}`}>
                <div className={styles.sectionIcon} aria-hidden="true">✎</div>
                <div>
                  <p className={styles.sectionLabel}>DEIN HINWEIS</p>
                  <h2>Anmerkung zur Bestellung</h2>
                  <p>{bestellung.note}</p>
                </div>
              </section>
            )}
          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.card} ${styles.pickupCard}`}>
              <header className={styles.compactHeader}>
                <div className={styles.sectionIcon} aria-hidden="true">◷</div>
                <div>
                  <p className={styles.sectionLabel}>ABHOLUNG</p>
                  <h2>Deine Abholzeit</h2>
                </div>
              </header>
              <div className={styles.pickupTime}>
                <strong>{datumUndUhrzeit(bestellung.requestedTime)}</strong>
                <span>Palmen Grill · Abholung vor Ort</span>
              </div>
              <p className={styles.infoHint}>
                Bitte halte bei der Abholung deine Bestellnummer bereit.
              </p>
            </section>

            {bestellung.customer && (
              <section className={styles.card}>
                <header className={styles.compactHeader}>
                  <div className={styles.sectionIcon} aria-hidden="true">♙</div>
                  <div>
                    <p className={styles.sectionLabel}>KONTAKTDATEN</p>
                    <h2>Kundendaten</h2>
                  </div>
                </header>
                <dl className={styles.infoList}>
                  <div>
                    <dt>Name</dt>
                    <dd>
                      {bestellung.customer.firstName}{" "}
                      {bestellung.customer.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt>E-Mail</dt>
                    <dd>
                      <a href={`mailto:${bestellung.customer.email}`}>
                        {bestellung.customer.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Telefon</dt>
                    <dd>
                      <a href={`tel:${bestellung.customer.phone}`}>
                        {bestellung.customer.phone}
                      </a>
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            <section className={`${styles.card} ${styles.summaryCard}`}>
              <header className={styles.compactHeader}>
                <div className={styles.sectionIcon} aria-hidden="true">€</div>
                <div>
                  <p className={styles.sectionLabel}>ZAHLUNG</p>
                  <h2>Zahlung &amp; Summe</h2>
                </div>
              </header>

              {zahlung ? (
                <div className={styles.paymentBox}>
                  <div>
                    <span>Zahlungsart</span>
                    <strong>{zahlung.method.name}</strong>
                  </div>
                  <span
                    className={styles.paymentStatus}
                    data-farbe={statusFarbe(zahlung.status)}
                  >
                    {statusText(zahlung.status)}
                  </span>
                </div>
              ) : (
                <p className={styles.infoHint}>
                  Für diese Bestellung wurden keine Zahlungsdaten hinterlegt.
                </p>
              )}

              <div className={styles.priceRows}>
                <div>
                  <span>Zwischensumme</span>
                  <strong>{formatPrice(bestellung.subtotal)}</strong>
                </div>
                {liefergebuehr > 0 && (
                  <div>
                    <span>Liefergebühr</span>
                    <strong>{formatPrice(bestellung.deliveryFee)}</strong>
                  </div>
                )}
                {rabatt > 0 && (
                  <div>
                    <span>Rabatt</span>
                    <strong>− {formatPrice(bestellung.discountAmount)}</strong>
                  </div>
                )}
                <div className={styles.totalRow}>
                  <span>Gesamt</span>
                  <strong>{formatPrice(bestellung.totalAmount)}</strong>
                </div>
              </div>

              <button
                type="button"
                className={styles.pdfButton}
                onClick={pdfOeffnen}
              >
                <span aria-hidden="true">▣</span>
                PDF öffnen / drucken
                <i aria-hidden="true">↗</i>
              </button>

              <Link href="/speisekarte" className={styles.secondaryLink}>
                Neue Bestellung starten
              </Link>

              <div className={styles.securityHint}>
                <span aria-hidden="true">✓</span>
                <p>
                  <strong>Sicher gespeichert</strong>
                  Deine Bestelldaten wurden erfolgreich übermittelt.
                </p>
              </div>
            </section>
          </aside>
        </div>

        <p className={styles.orderDate}>
          Bestellung aufgegeben am {datumUndUhrzeit(bestellung.orderedAt)} Uhr
        </p>
      </div>
    </main>
  );
}