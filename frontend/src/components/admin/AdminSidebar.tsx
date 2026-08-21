"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebar.module.css";

const navigation = [
  { label: "Übersicht", href: "/admin", icon: "⌂" },
  { label: "Bestellungen", href: "/admin/bestellungen", icon: "🛒" },
  { label: "Speisekarte", href: "/admin/speisekarte", icon: "♨" },
  { label: "Statistiken", href: "/admin/statistiken", icon: "▥" },
  { label: "Drucker", href: "/admin/drucker", icon: "▣" },
  { label: "Einstellungen", href: "/admin/einstellungen", icon: "⚙" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.brand}>
        <span className={styles.palm} aria-hidden="true">🌴</span>
        <span>
          <strong>PALMEN</strong>
          <strong className={styles.brandAccent}>GRILL</strong>
        </span>
      </Link>

      <nav className={styles.navigation} aria-label="Mitarbeiternavigation">
        {navigation.map((item) => {
          const active = item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.href === "/admin/bestellungen" && (
                <span className={styles.badge}>3</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.systemStatus}>
          <span className={styles.statusDot} aria-hidden="true" />
          <div>
            <strong>Systemstatus</strong>
            <small>Alle Systeme online</small>
          </div>
        </div>

        <button type="button" className={styles.logout}>
          <span aria-hidden="true">↪</span>
          Abmelden
        </button>
      </div>
    </aside>
  );
}
