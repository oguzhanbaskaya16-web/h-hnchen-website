"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { formatPrice, getOrder, getOrderPdfUrl, type Order } from "@/lib/api";

type PageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

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
      <main>
        <h1>Bestellung wird geladen …</h1>
      </main>
    );
  }

  if (fehler || !bestellung) {
    return (
      <main>
        <h1>Bestellung nicht gefunden</h1>
        <p>{fehler}</p>
        <Link href="/speisekarte">Zur Speisekarte</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Vielen Dank für deine Bestellung!</h1>

      <p>
        Bestellnummer: <strong>{bestellung.orderNumber}</strong>
      </p>

      <p>Status: {bestellung.status}</p>

      <p>
        Abholung:{" "}
        {new Intl.DateTimeFormat("de-DE", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(bestellung.requestedTime))}
      </p>

      {bestellung.customer && (
        <section>
          <h2>Kundendaten</h2>

          <p>
            {bestellung.customer.firstName} {bestellung.customer.lastName}
          </p>

          <p>{bestellung.customer.email}</p>
          <p>{bestellung.customer.phone}</p>
        </section>
      )}

      <section>
        <h2>Bestellung</h2>

        {bestellung.items.map((position) => (
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
          <strong>Gesamt: {formatPrice(bestellung.totalAmount)}</strong>
        </p>
      </section>

      {bestellung.payments[0] && (
        <section>
          <h2>Zahlung</h2>
          <p>{bestellung.payments[0].method.name}</p>
          <p>Status: {bestellung.payments[0].status}</p>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          const pdfUrl = getOrderPdfUrl(bestellung.orderNumber);

          window.open(pdfUrl, "_blank", "noopener,noreferrer");
        }}
      >
        PDF öffnen / drucken
      </button>

      <Link href="/speisekarte">Neue Bestellung starten</Link>
    </main>
  );
}
