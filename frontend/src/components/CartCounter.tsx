"use client";

import { useEffect, useState } from "react";
import { getCart } from "@/lib/api";

const CART_ID_SPEICHER = "palmen-grill-cart-id";
const WARENKORB_EVENT = "palmen-warenkorb-aktualisiert";

async function ermittleArtikelanzahl(): Promise<number> {
  const cartId = window.localStorage.getItem(CART_ID_SPEICHER);

  if (!cartId) {
    return 0;
  }

  try {
    const warenkorb = await getCart(cartId);

    return warenkorb.items.reduce(
      (summe, position) => summe + position.quantity,
      0,
    );
  } catch {
    return 0;
  }
}

export default function CartCounter() {
  const [artikelanzahl, setArtikelanzahl] = useState(0);

  useEffect(() => {
    let aktiv = true;

    async function artikelanzahlLaden() {
      const anzahl = await ermittleArtikelanzahl();

      if (aktiv) {
        setArtikelanzahl(anzahl);
      }
    }

    function aktualisieren() {
      void artikelanzahlLaden();
    }

    aktualisieren();

    window.addEventListener(WARENKORB_EVENT, aktualisieren);
    window.addEventListener("storage", aktualisieren);
    window.addEventListener("focus", aktualisieren);

    return () => {
      aktiv = false;

      window.removeEventListener(
        WARENKORB_EVENT,
        aktualisieren,
      );

      window.removeEventListener(
        "storage",
        aktualisieren,
      );

      window.removeEventListener(
        "focus",
        aktualisieren,
      );
    };
  }, []);

  return (
    <span aria-live="polite">
      {artikelanzahl} Artikel
    </span>
  );
}