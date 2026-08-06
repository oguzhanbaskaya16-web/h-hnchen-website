"use client";

import Image from "next/image";
import type { Produkt } from "@/data/products";
import { formatierePreis } from "@/data/products";
import styles from "./ProductCard.module.css";

type ProductCardProps = {
  produkt: Produkt;
  onSelect: (produkt: Produkt) => void;
};

export default function ProductCard({
  produkt,
  onSelect,
}: ProductCardProps) {
  return (
    <article
      className={`${styles.card} ${
        !produkt.ist_verfuegbar ? styles.unavailable : ""
      }`}
    >
      <div className={styles.imageWrapper}>
        <Image
          src={produkt.bild}
          alt={produkt.name}
          fill
          sizes="(max-width: 700px) 100vw, 420px"
          className={styles.image}
        />

        {produkt.ist_highlight && (
          <span className={styles.highlight}>Palmen-Tipp</span>
        )}

        {!produkt.ist_verfuegbar && (
          <span className={styles.unavailableLabel}>
            Heute nicht verfügbar
          </span>
        )}
      </div>

      <div className={styles.content}>
        <div>
          <h3>{produkt.name}</h3>
          <p className={styles.description}>
            {produkt.kurzbeschreibung}
          </p>
        </div>

        <div className={styles.information}>
          {produkt.zubereitungszeit_minuten > 0 && (
            <span>
              ca. {produkt.zubereitungszeit_minuten} Min.
            </span>
          )}

          {produkt.allergenhinweis && (
            <span title={produkt.allergenhinweis}>
              Allergene
            </span>
          )}
        </div>

        <div className={styles.footer}>
          <strong className={styles.price}>
            {formatierePreis(produkt.preis)}
          </strong>

          <button
            type="button"
            className={styles.addButton}
            disabled={!produkt.ist_verfuegbar}
            onClick={() => onSelect(produkt)}
          >
            <span aria-hidden="true">＋</span>
            Hinzufügen
          </button>
        </div>
      </div>
    </article>
  );
}