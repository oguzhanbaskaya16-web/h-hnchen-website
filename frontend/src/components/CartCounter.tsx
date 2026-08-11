"use client";

import { useEffect, useState } from "react";

const WARENKORB_SPEICHER =
  "palmen-grill-warenkorb";

const WARENKORB_EVENT =
  "palmen-warenkorb-aktualisiert";

type GespeichertePosition = {
  menge?: unknown;
};

function ermittleArtikelanzahl() {
  try {
    const gespeicherterWarenkorb =
      window.localStorage.getItem(
        WARENKORB_SPEICHER,
      );

    if (!gespeicherterWarenkorb) {
      return 0;
    }

    const positionen: unknown = JSON.parse(
      gespeicherterWarenkorb,
    );

    if (!Array.isArray(positionen)) {
      return 0;
    }

    return positionen.reduce(
      (summe: number, position: GespeichertePosition) => {
        return (
          summe +
          (typeof position.menge === "number"
            ? position.menge
            : 0)
        );
      },
      0,
    );
  } catch {
    return 0;
  }
}

export default function CartCounter() {
  const [artikelanzahl, setArtikelanzahl] =
    useState(0);

  useEffect(() => {
    function aktualisieren() {
      setArtikelanzahl(
        ermittleArtikelanzahl(),
      );
    }

    aktualisieren();

    window.addEventListener(
      WARENKORB_EVENT,
      aktualisieren,
    );

    window.addEventListener(
      "storage",
      aktualisieren,
    );

    return () => {
      window.removeEventListener(
        WARENKORB_EVENT,
        aktualisieren,
      );

      window.removeEventListener(
        "storage",
        aktualisieren,
      );
    };
  }, []);

  return (
    <span>
      {artikelanzahl}{" "}
      {artikelanzahl === 1
        ? "Artikel"
        : "Artikel"}
    </span>
  );
}