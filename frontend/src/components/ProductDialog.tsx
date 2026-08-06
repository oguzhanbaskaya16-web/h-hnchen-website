"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  findeProdukt,
  formatierePreis,
  produktoptionen,
  type Produkt,
} from "@/data/products";
import styles from "./ProductDialog.module.css";

type ProduktoptionEintrag = (typeof produktoptionen)[number];

type OptionDetail = {
  verknuepfung: ProduktoptionEintrag;
  optionsprodukt: Produkt;
};

export type WarenkorbAuswahl = {
  produkt: Produkt;
  optionen: {
    produktoption_id: number;
    name: string;
    aufpreis: number;
  }[];
  menge: number;
  gesamtpreis: number;
};

type ProductDialogProps = {
  produkt: Produkt | null;
  onClose: () => void;
  onAdd: (auswahl: WarenkorbAuswahl) => void;
};

const gruppenNamen: Record<string, string> = {
  beilage: "Beilage wählen",
  sauce: "Saucen wählen",
  extra: "Extras wählen",
  getraenk: "Getränk wählen",
};

export default function ProductDialog({
  produkt,
  onClose,
  onAdd,
}: ProductDialogProps) {
  const [ausgewaehlteIds, setAusgewaehlteIds] = useState<number[]>(
    [],
  );
  const [menge, setMenge] = useState(1);

  const optionDetails = useMemo<OptionDetail[]>(() => {
    if (!produkt) {
      return [];
    }

    return produktoptionen
      .filter(
        (option) =>
          option.hauptprodukt_id === produkt.produkt_id,
      )
      .flatMap((verknuepfung) => {
        const optionsprodukt = findeProdukt(
          verknuepfung.optionsprodukt_id,
        );

        if (!optionsprodukt) {
          return [];
        }

        return [
          {
            verknuepfung,
            optionsprodukt,
          },
        ];
      });
  }, [produkt]);

  const gruppierteOptionen = useMemo(() => {
    return optionDetails.reduce<Record<string, OptionDetail[]>>(
      (gruppen, eintrag) => {
        const optionstyp = eintrag.verknuepfung.optionstyp;

        if (!gruppen[optionstyp]) {
          gruppen[optionstyp] = [];
        }

        gruppen[optionstyp].push(eintrag);
        return gruppen;
      },
      {},
    );
  }, [optionDetails]);

  const ausgewaehlteOptionen = optionDetails.filter((eintrag) =>
    ausgewaehlteIds.includes(
      eintrag.verknuepfung.produktoption_id,
    ),
  );

  const optionspreis = ausgewaehlteOptionen.reduce(
    (summe, eintrag) =>
      summe + eintrag.verknuepfung.aufpreis,
    0,
  );

  const gesamtpreis = produkt
    ? (produkt.preis + optionspreis) * menge
    : 0;

  useEffect(() => {
    setAusgewaehlteIds([]);
    setMenge(1);
  }, [produkt?.produkt_id]);

  useEffect(() => {
    if (!produkt) {
      return;
    }

    function dialogMitEscapeSchliessen(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const bisherigerOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener(
      "keydown",
      dialogMitEscapeSchliessen,
    );

    return () => {
      document.body.style.overflow = bisherigerOverflow;
      window.removeEventListener(
        "keydown",
        dialogMitEscapeSchliessen,
      );
    };
  }, [produkt, onClose]);

  if (!produkt) {
    return null;
  }

  function optionAuswaehlen(eintrag: OptionDetail) {
    const {
      produktoption_id,
      optionstyp,
      mehrfachauswahl,
    } = eintrag.verknuepfung;

    setAusgewaehlteIds((aktuelleIds) => {
      const istAusgewaehlt =
        aktuelleIds.includes(produktoption_id);

      if (mehrfachauswahl) {
        return istAusgewaehlt
          ? aktuelleIds.filter(
              (id) => id !== produktoption_id,
            )
          : [...aktuelleIds, produktoption_id];
      }

      const idsOhneDieseGruppe = aktuelleIds.filter(
        (id) => {
          const vorhandeneOption = optionDetails.find(
            (option) =>
              option.verknuepfung.produktoption_id === id,
          );

          return (
            vorhandeneOption?.verknuepfung.optionstyp !==
            optionstyp
          );
        },
      );

      return [...idsOhneDieseGruppe, produktoption_id];
    });
  }

  function zumWarenkorbHinzufuegen() {
  if (!produkt) {
    return;
  }

  onAdd({
    produkt,
    optionen: ausgewaehlteOptionen.map((eintrag) => ({
      produktoption_id:
        eintrag.verknuepfung.produktoption_id,
      name: eintrag.optionsprodukt.name,
      aufpreis: eintrag.verknuepfung.aufpreis,
    })),
    menge,
    gesamtpreis,
  });

  onClose();
}

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Produktdialog schließen"
        >
          ×
        </button>

        <div className={styles.productImage}>
          <Image
            src={produkt.bild}
            alt={produkt.name}
            fill
            sizes="(max-width: 700px) 100vw, 440px"
            className={styles.image}
          />

          {produkt.ist_highlight && (
            <span className={styles.highlight}>
              Palmen-Tipp
            </span>
          )}
        </div>

        <div className={styles.content}>
          <header className={styles.header}>
            <p>DEINE AUSWAHL</p>

            <h2 id="product-dialog-title">
              {produkt.name}
            </h2>

            <span className={styles.basePrice}>
              {formatierePreis(produkt.preis)}
            </span>

            <p className={styles.description}>
              {produkt.beschreibung}
            </p>

            {produkt.allergenhinweis && (
              <p className={styles.allergen}>
                <strong>Allergene:</strong>{" "}
                {produkt.allergenhinweis}
              </p>
            )}
          </header>

          {Object.entries(gruppierteOptionen).map(
            ([optionstyp, eintraege]) => {
              const mehrfachauswahl =
                eintraege[0]?.verknuepfung
                  .mehrfachauswahl ?? false;

              return (
                <fieldset
                  className={styles.optionGroup}
                  key={optionstyp}
                >
                  <legend>
                    <span>
                      {gruppenNamen[optionstyp] ??
                        optionstyp}
                    </span>

                    <small>
                      {mehrfachauswahl
                        ? "Mehrfachauswahl möglich"
                        : "Eine Auswahl möglich"}
                    </small>
                  </legend>

                  <div className={styles.optionList}>
                    {eintraege.map((eintrag) => {
                      const optionId =
                        eintrag.verknuepfung
                          .produktoption_id;

                      const istAusgewaehlt =
                        ausgewaehlteIds.includes(optionId);

                      return (
                        <label
                          className={`${styles.option} ${
                            istAusgewaehlt
                              ? styles.selectedOption
                              : ""
                          }`}
                          key={optionId}
                        >
                          <input
                            type={
                              mehrfachauswahl
                                ? "checkbox"
                                : "radio"
                            }
                            name={`option-${optionstyp}`}
                            checked={istAusgewaehlt}
                            onChange={() =>
                              optionAuswaehlen(eintrag)
                            }
                          />

                          <span className={styles.optionName}>
                            {
                              eintrag.optionsprodukt
                                .name
                            }

                            <small>
                              {
                                eintrag.optionsprodukt
                                  .kurzbeschreibung
                              }
                            </small>
                          </span>

                          <strong>
                            {eintrag.verknuepfung
                              .aufpreis === 0
                              ? "inklusive"
                              : `+ ${formatierePreis(
                                  eintrag
                                    .verknuepfung
                                    .aufpreis,
                                )}`}
                          </strong>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            },
          )}

          <div className={styles.quantitySection}>
            <div>
              <strong>Menge</strong>
              <span>Wie oft möchtest du das Gericht?</span>
            </div>

            <div className={styles.quantity}>
              <button
                type="button"
                onClick={() =>
                  setMenge((aktuell) =>
                    Math.max(1, aktuell - 1),
                  )
                }
                disabled={menge === 1}
                aria-label="Menge verringern"
              >
                −
              </button>

              <span>{menge}</span>

              <button
                type="button"
                onClick={() =>
                  setMenge((aktuell) =>
                    Math.min(20, aktuell + 1),
                  )
                }
                aria-label="Menge erhöhen"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.addToCart}
            onClick={zumWarenkorbHinzufuegen}
          >
            <span>Zum Warenkorb hinzufügen</span>
            <strong>{formatierePreis(gesamtpreis)}</strong>
          </button>
        </div>
      </section>
    </div>
  );
}