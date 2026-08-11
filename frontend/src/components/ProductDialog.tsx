"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MenuOption, MenuOptionGroup, MenuProduct } from "@/lib/api";
import { formatPrice } from "@/lib/api";
import styles from "./ProductDialog.module.css";

export type WarenkorbAuswahl = {
  produkt: MenuProduct;
  optionen: {
    produktoption_id: number;
    name: string;
    aufpreis: number;
  }[];
  menge: number;
  gesamtpreis: number;
};

type ProductDialogProps = {
  produkt: MenuProduct | null;
  onClose: () => void;
  onAdd: (auswahl: WarenkorbAuswahl) => void;
};

const FALLBACK_IMAGE = "/images/palmen-grill-hero.png";

function gruppenHinweis(gruppe: MenuOptionGroup): string {
  if (gruppe.minSelections === gruppe.maxSelections) {
    return gruppe.maxSelections === 1
      ? "Eine Auswahl erforderlich"
      : `${gruppe.maxSelections} Auswahlen erforderlich`;
  }

  if (gruppe.minSelections === 0) {
    return gruppe.maxSelections === 1
      ? "Optional · maximal eine Auswahl"
      : `Optional · bis zu ${gruppe.maxSelections} Auswahlen`;
  }

  return `${gruppe.minSelections} bis ${gruppe.maxSelections} Auswahlen`;
}

export default function ProductDialog({
  produkt,
  onClose,
  onAdd,
}: ProductDialogProps) {
  const [ausgewaehlteIds, setAusgewaehlteIds] = useState<number[]>([]);
  const [menge, setMenge] = useState(1);

  const optionenNachId = useMemo(() => {
    const eintraege = produkt?.optionGroups.flatMap((gruppe) =>
      gruppe.options.map((option) => [option.id, option] as const),
    );

    return new Map(eintraege ?? []);
  }, [produkt]);

  const ausgewaehlteOptionen = useMemo(
    () =>
      ausgewaehlteIds
        .map((id) => optionenNachId.get(id))
        .filter((option): option is MenuOption => Boolean(option)),
    [ausgewaehlteIds, optionenNachId],
  );

  const optionspreis = ausgewaehlteOptionen.reduce(
    (summe, option) => summe + Number.parseFloat(option.surcharge),
    0,
  );

  const grundpreis = produkt ? Number.parseFloat(produkt.price) : 0;
  const gesamtpreis = (grundpreis + optionspreis) * menge;

  const auswahlGueltig =
    produkt?.optionGroups.every((gruppe) => {
      const anzahl = gruppe.options.filter((option) =>
        ausgewaehlteIds.includes(option.id),
      ).length;

      return anzahl >= gruppe.minSelections && anzahl <= gruppe.maxSelections;
    }) ?? false;

  useEffect(() => {
    setAusgewaehlteIds([]);
    setMenge(1);
  }, [produkt?.id]);

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
    window.addEventListener("keydown", dialogMitEscapeSchliessen);

    return () => {
      document.body.style.overflow = bisherigerOverflow;
      window.removeEventListener("keydown", dialogMitEscapeSchliessen);
    };
  }, [produkt, onClose]);

  if (!produkt) {
    return null;
  }

  function optionAuswaehlen(gruppe: MenuOptionGroup, option: MenuOption) {
    setAusgewaehlteIds((aktuelleIds) => {
      const istAusgewaehlt = aktuelleIds.includes(option.id);

      if (istAusgewaehlt) {
        return aktuelleIds.filter((id) => id !== option.id);
      }

      const gruppenIds = new Set(
        gruppe.options.map((gruppenOption) => gruppenOption.id),
      );

      const bereitsInGruppe = aktuelleIds.filter((id) => gruppenIds.has(id));

      if (gruppe.maxSelections === 1) {
        return [...aktuelleIds.filter((id) => !gruppenIds.has(id)), option.id];
      }

      if (bereitsInGruppe.length >= gruppe.maxSelections) {
        return aktuelleIds;
      }

      return [...aktuelleIds, option.id];
    });
  }

  function zumWarenkorbHinzufuegen() {
    if (!produkt || !auswahlGueltig) {
      return;
    }

    onAdd({
      produkt,
      optionen: ausgewaehlteOptionen.map((option) => ({
        produktoption_id: option.id,
        name: option.name,
        aufpreis: Number.parseFloat(option.surcharge),
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
            src={produkt.image ?? FALLBACK_IMAGE}
            alt={produkt.name}
            fill
            sizes="(max-width: 700px) 100vw, 440px"
            className={styles.image}
          />

          {produkt.isHighlight && (
            <span className={styles.highlight}>Palmen-Tipp</span>
          )}
        </div>

        <div className={styles.content}>
          <header className={styles.header}>
            <p>DEINE AUSWAHL</p>
            <h2 id="product-dialog-title">{produkt.name}</h2>

            <span className={styles.basePrice}>
              {formatPrice(produkt.price)}
            </span>

            <p className={styles.description}>
              {produkt.description ?? produkt.shortDescription ?? ""}
            </p>

            {produkt.allergenInformation && (
              <p className={styles.allergen}>
                <strong>Allergene:</strong> {produkt.allergenInformation}
              </p>
            )}
          </header>

          {produkt.optionGroups.map((gruppe) => (
            <fieldset className={styles.optionGroup} key={gruppe.id}>
              <legend>
                <span>{gruppe.name}</span>
                <small>{gruppenHinweis(gruppe)}</small>
              </legend>

              <div className={styles.optionList}>
                {gruppe.options.map((option) => {
                  const istAusgewaehlt = ausgewaehlteIds.includes(option.id);

                  return (
                    <label
                      className={`${styles.option} ${
                        istAusgewaehlt ? styles.selectedOption : ""
                      }`}
                      key={option.id}
                    >
                      <input
                        type="checkbox"
                        name={`option-${gruppe.id}`}
                        checked={istAusgewaehlt}
                        onChange={() => optionAuswaehlen(gruppe, option)}
                      />

                      <span className={styles.optionName}>{option.name}</span>

                      <strong>
                        {Number.parseFloat(option.surcharge) === 0
                          ? "inklusive"
                          : `+ ${formatPrice(option.surcharge)}`}
                      </strong>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className={styles.quantitySection}>
            <div>
              <strong>Menge</strong>
              <span>Wie oft möchtest du das Gericht?</span>
            </div>

            <div className={styles.quantity}>
              <button
                type="button"
                onClick={() => setMenge((aktuell) => Math.max(1, aktuell - 1))}
                disabled={menge === 1}
                aria-label="Menge verringern"
              >
                −
              </button>

              <span>{menge}</span>

              <button
                type="button"
                onClick={() => setMenge((aktuell) => Math.min(99, aktuell + 1))}
                disabled={menge === 99}
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
            disabled={!auswahlGueltig}
          >
            <span>Zum Warenkorb hinzufügen</span>
            <strong>{formatPrice(gesamtpreis)}</strong>
          </button>
        </div>
      </section>
    </div>
  );
}
