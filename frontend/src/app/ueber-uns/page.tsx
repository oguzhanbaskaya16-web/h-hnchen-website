import Link from "next/link";
import styles from "./ueberUns.module.css";

const values = [
  {
    number: "01",
    title: "Frische",
    text: "Unsere Gerichte werden frisch zubereitet und kommen direkt vom Grill.",
  },
  {
    number: "02",
    title: "Qualität",
    text: "Wir setzen auf sorgfältig ausgewählte Zutaten und ehrlichen Geschmack.",
  },
  {
    number: "03",
    title: "Gastfreundschaft",
    text: "Freundlicher Service und ein herzliches Miteinander gehören für uns dazu.",
  },
] as const;

const openingHours = [
  ["Montag", "11:00–21:00 Uhr"],
  ["Dienstag", "11:00–21:00 Uhr"],
  ["Mittwoch", "11:00–21:00 Uhr"],
  ["Donnerstag", "11:00–21:00 Uhr"],
  ["Freitag", "11:00–21:00 Uhr"],
  ["Samstag", "11:00–21:00 Uhr"],
  ["Sonntag", "12:00–21:00 Uhr"],
] as const;

export default function UeberUns() {
  return (
    <>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" />
              Über Palmen Grill
            </p>

            <h1>
              Frisch vom Grill.
              <span>Mit Herz serviert.</span>
            </h1>

            <p className={styles.lead}>
              Bei Palmen Grill verbinden wir ehrliches Grillhandwerk mit
              frischen Zutaten und unkompliziertem Service. Unser Ziel ist
              einfach: Essen, auf das du dich jedes Mal freuen kannst.
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/speisekarte">
                Speisekarte entdecken
                <span aria-hidden="true">→</span>
              </Link>

              <a
                className={styles.secondaryButton}
                href="https://www.google.com/maps/search/?api=1&query=Palmen+Grill+R%C3%BCsselsheim"
                rel="noreferrer"
                target="_blank"
              >
                Route planen
              </a>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <img
              src="/images/palmen-grill-hero.png"
              alt="Frisch gegrilltes Hähnchen mit Beilagen bei Palmen Grill"
            />

            <div className={styles.imageShade} aria-hidden="true" />

            <blockquote>
              <span aria-hidden="true">“</span>
              <p>
                Gutes Essen verbindet – und genau so soll es sich anfühlen.
              </p>
            </blockquote>
          </div>
        </section>

        <section className={styles.valuesSection}>
          <div className={styles.sectionHeading}>
            <p>Unser Versprechen</p>
            <h2>Dafür stehen wir</h2>
          </div>

          <div className={styles.valueGrid}>
            {values.map((value) => (
              <article className={styles.valueCard} key={value.title}>
                <span className={styles.valueNumber}>{value.number}</span>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.visitSection}>
          <div className={styles.locationBlock}>
            <p className={styles.sectionKicker}>Hier findest du uns</p>

            <h2>Komm vorbei und hol deine Bestellung frisch ab.</h2>

            <p className={styles.locationText}>
              Bestelle entspannt online und wähle deine gewünschte Abholzeit.
              Wir bereiten alles frisch für dich vor.
            </p>

            <div className={styles.addressCard}>
              <span className={styles.pin} aria-hidden="true">
                ⌖
              </span>

              <div>
                <strong>Palmen Grill</strong>
                <span>Südring · Rüsselsheim</span>
              </div>
            </div>

            <a
              className={styles.routeLink}
              href="https://www.google.com/maps/search/?api=1&query=Palmen+Grill+R%C3%BCsselsheim"
              rel="noreferrer"
              target="_blank"
            >
              In Google Maps öffnen
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className={styles.hoursBlock}>
            <div className={styles.hoursHeading}>
              <div>
                <p className={styles.sectionKicker}>Öffnungszeiten</p>
                <h2>Heute für dich da.</h2>
              </div>

              <span className={styles.openBadge}>Geöffnet</span>
            </div>

            <dl className={styles.hoursList}>
              {openingHours.map(([day, hours]) => (
                <div key={day}>
                  <dt>{day}</dt>
                  <dd>{hours}</dd>
                </div>
              ))}
            </dl>

            <p className={styles.hoursNote}>
              <span aria-hidden="true">◷</span>
              Bestellungen bitte bis 30 Minuten vor Ladenschluss aufgeben.
            </p>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div>
            <p>Bereit für etwas Frisches?</p>
            <h2>Dein Lieblingsgericht wartet schon.</h2>
          </div>

          <Link href="/speisekarte">
            Zur Speisekarte
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.footerBrand}>
            <span aria-hidden="true">🌴</span>

            <span>
              <strong>PALMEN GRILL</strong>
              <small>Frisch vom Grill</small>
            </span>
          </Link>

          <nav aria-label="Navigation im Fußbereich">
            <Link href="/">Startseite</Link>
            <Link href="/speisekarte">Speisekarte</Link>
            <Link href="/ueber-uns">Über uns</Link>
          </nav>

          <p>© {new Date().getFullYear()} Palmen Grill</p>
        </div>
      </footer>
    </>
  );
}