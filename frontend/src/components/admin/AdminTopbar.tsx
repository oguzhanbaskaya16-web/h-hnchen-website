import styles from "./AdminTopbar.module.css";

type AdminTopbarProps = {
  title?: string;
  subtitle?: string;
};

export default function AdminTopbar({
  title = "Bestellungen",
  subtitle = "Übersicht aller Online-Bestellungen",
}: AdminTopbarProps) {
  return (
    <header className={styles.topbar}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.notification} aria-label="Benachrichtigungen">
          ♧
          <span>3</span>
        </button>

        <div className={styles.userIcon} aria-hidden="true">♙</div>

        <div className={styles.user}>
          <strong>Palmen Grill</strong>
          <span>Mitarbeiter</span>
        </div>

        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </div>
    </header>
  );
}
