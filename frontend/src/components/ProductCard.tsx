"use client";

import Image from "next/image";
import type { MenuProduct } from "@/lib/api";
import { formatPrice } from "@/lib/api";
import styles from "./ProductCard.module.css";

type ProductCardProps = {
  produkt: MenuProduct;
  onSelect: (produkt: MenuProduct) => void;
};

const FALLBACK_IMAGE = "/images/palmen-grill-hero.png";

export default function ProductCard({ produkt, onSelect }: ProductCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <Image
          src={produkt.image ?? FALLBACK_IMAGE}
          alt={produkt.name}
          fill
          sizes="(max-width: 700px) 100vw, 420px"
          className={styles.image}
        />

        {produkt.isHighlight && (
          <span className={styles.highlight}>Palmen-Tipp</span>
        )}
      </div>

      <div className={styles.content}>
        <div>
          <h3>{produkt.name}</h3>
          <p className={styles.description}>
            {produkt.shortDescription ?? produkt.description ?? ""}
          </p>
        </div>

        <div className={styles.information}>
          {(produkt.preparationTimeMinutes ?? 0) > 0 && (
            <span>ca. {produkt.preparationTimeMinutes} Min.</span>
          )}

          {produkt.allergenInformation && (
            <span title={produkt.allergenInformation}>Allergene</span>
          )}
        </div>

        <div className={styles.footer}>
          <strong className={styles.price}>{formatPrice(produkt.price)}</strong>

          <button
            type="button"
            className={styles.addButton}
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
