import Image from "next/image";
import Link from "next/link";
import styles from "./startseite.module.css";

const categories = [
  {
    number: "01",
    title: "Grillklassiker",
    text: "Knusprige Hähnchengerichte, frisch vom Grill und nach Wunsch kombiniert.",
    accent: "bordeaux",
  },
  {
    number: "02",
    title: "Beilagen & Salate",
    text: "Von goldenen Pommes bis zum frischen Salat – genau das, was dazu passt.",
    accent: "green",
  },
  {
    number: "03",
    title: "Menüs & Getränke",
    text: "Schnell gewählt, vollständig kombiniert und bereit für deine Abholung.",
    accent: "gold",
  },
] as const;

const orderSteps = [
  {
    number: "1",
    title: "Gericht auswählen",
    text: "Entdecke unsere Speisekarte und öffne dein Wunschgericht.",
  },
  {
    number: "2",
    title: "Nach Wunsch anpassen",
    text: "Wähle Beilagen, Extras und die passende Menge aus.",
  },
  {
    number: "3",
    title: "Bestellen & abholen",
    text: "Schließe deine Bestellung ab und hole sie frisch zubereitet ab.",
  },
] as const;

export default function Home() {
  return (
    <>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span aria-hidden="true" />
                Frisch gegrillt · täglich zubereitet
              </p>
              <h1>
                Knusprig vom Grill.
                <span> Einfach online bestellen.</span>
              </h1>
              <p className={styles.lead}>
                Wähle dein Lieblingsgericht, stelle es nach deinem Geschmack
                zusammen und hole es frisch zubereitet bei uns ab.
              </p>

              <div className={styles.heroActions}>
                <Link className={styles.primaryButton} href="/speisekarte">
                  Speisekarte ansehen
                  <span aria-hidden="true">→</span>
                </Link>
                <Link className={styles.secondaryButton} href="/ueber-uns">
                  Mehr über uns
                </Link>
              </div>

              <ul className={styles.quickFacts} aria-label="Unsere Vorteile">
                <li>
                  <strong>Frisch</strong>
                  <span>zubereitet</span>
                </li>
                <li>
                  <strong>Einfach</strong>
                  <span>online wählen</span>
                </li>
                <li>
                  <strong>Schnell</strong>
                  <span>zur Abholung</span>
                </li>
              </ul>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.imageFrame}>
                <Image
                  src="/images/palmen-grill-hero.png"
                  alt="Knusprig gegrilltes Hähnchen mit frischer Beilage"
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 46vw"
                />
                <div className={styles.imageShade} aria-hidden="true" />
                <div className={styles.imageCaption}>
                  <span>Unser Klassiker</span>
                  <strong>Frisch vom Grill</strong>
                </div>
              </div>

              <div className={styles.openCard}>
                <span className={styles.openDot} aria-hidden="true" />
                <span>
                  <small>Heute geöffnet</small>
                  <strong>11:00–21:00 Uhr</strong>
                </span>
              </div>

              <div className={styles.palmMark} aria-hidden="true">
                🌴
              </div>
            </div>
          </div>
        </section>

        <section className={styles.introSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>Das erwartet dich</p>
              <h2>Für jeden Hunger das Richtige.</h2>
            </div>
            <p>
              Unsere Speisekarte ist übersichtlich aufgebaut, damit du ohne
              Umwege findest, worauf du gerade Lust hast.
            </p>
          </div>

          <div className={styles.categoryGrid}>
            {categories.map((category) => (
              <Link
                className={`${styles.categoryCard} ${styles[category.accent]}`}
                href="/speisekarte"
                key={category.title}
              >
                <span className={styles.categoryNumber}>{category.number}</span>
                <div>
                  <h3>{category.title}</h3>
                  <p>{category.text}</p>
                </div>
                <span className={styles.cardArrow} aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.orderSection}>
          <div className={styles.orderPanel}>
            <div className={styles.orderIntro}>
              <p className={styles.sectionKicker}>So funktioniert&apos;s</p>
              <h2>In drei Schritten zu deinem Essen.</h2>
              <p>
                Kein Anruf, kein langes Warten: Du stellst deine Bestellung in
                Ruhe zusammen und wir kümmern uns um den Grill.
              </p>
              <Link href="/speisekarte">
                Bestellung starten <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ol className={styles.stepList}>
              {orderSteps.map((step) => (
                <li key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.storySection}>
          <div className={styles.storyBadge} aria-hidden="true">
            <span>🌴</span>
          </div>
          <div className={styles.storyCopy}>
            <p className={styles.sectionKicker}>Palmen Grill</p>
            <h2>Guter Geschmack braucht keine Umwege.</h2>
            <p>
              Bei uns stehen ehrliches Grillhandwerk, frische Zubereitung und
              unkomplizierter Service im Mittelpunkt. Was uns ausmacht und wer
              hinter Palmen Grill steht, erzählen wir dir auf unserer
              Über-uns-Seite.
            </p>
            <Link className={styles.textLink} href="/ueber-uns">
              Palmen Grill kennenlernen <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className={styles.hoursCard}>
            <p>Heute für dich da</p>
            <strong>11:00–21:00 Uhr</strong>
            <span>Bestellung zur Abholung</span>
            <Link href="/speisekarte">Jetzt auswählen</Link>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div>
            <p>Schon entschieden?</p>
            <h2>Dein Lieblingsgericht wartet.</h2>
          </div>
          <Link href="/speisekarte">
            Zur Speisekarte <span aria-hidden="true">→</span>
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