"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CartCounter from "./CartCounter";
import styles from "./Header.module.css";

const navigation = [
  { name: "Startseite", href: "/" },
  { name: "Speisekarte", href: "/speisekarte" },
  { name: "Über uns", href: "/ueber-uns" },
];

export default function Header() {
  const pathname = usePathname();

  const showCart =
    pathname === "/speisekarte" || pathname === "/bestellen";

  function zumWarenkorbScrollen(
    event: MouseEvent<HTMLAnchorElement>,
  ) {
    if (pathname !== "/speisekarte") {
      return;
    }

    const warenkorbBereich =
      document.getElementById("warenkorb");

    if (!warenkorbBereich) {
      return;
    }

    event.preventDefault();

    warenkorbBereich.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      "/speisekarte#warenkorb",
    );
  }

  if (pathname === "/bestaetigung") {
    return null;
  }

  return (
    <>
      <div className={styles.openingBar}>
        <span
          className={styles.statusDot}
          aria-hidden="true"
        />

        Heute geöffnet

        <span
          className={styles.divider}
          aria-hidden="true"
        >
          •
        </span>

        11:00–21:00 Uhr
      </div>

      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="Zur Startseite von Palmen Grill"
          >
            <span
              className={styles.brandIcon}
              aria-hidden="true"
            >
              🌴
            </span>

            <span className={styles.brandText}>
              <strong>PALMEN GRILL</strong>
              <small>Frisch vom Grill</small>
            </span>
          </Link>

          <nav
            className={styles.mainNav}
            aria-label="Hauptnavigation"
          >
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive ? styles.active : undefined
                  }
                  aria-current={
                    isActive ? "page" : undefined
                  }
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {showCart ? (
            <Link
              href="/speisekarte#warenkorb"
              className={styles.cartLink}
              aria-label="Zum Warenkorb springen"
              onClick={zumWarenkorbScrollen}
            >
              <span
                className={styles.cartIcon}
                aria-hidden="true"
              >
                🛒
              </span>

              <CartCounter />
            </Link>
          ) : (
            <Link
              href="/speisekarte"
              className={styles.orderLink}
            >
              Jetzt bestellen
            </Link>
          )}
        </div>
      </header>
    </>
  );
}