import type { ReactNode } from "react";
import styles from "./admin-ui.module.css";

type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const badgeToneClasses: Record<Tone, string> = {
  brand: styles.badgeBrand,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
  neutral: styles.badgeNeutral,
};

const statToneClasses: Record<Exclude<Tone, "neutral">, string> = {
  brand: styles.statBrand,
  success: styles.statSuccess,
  warning: styles.statWarning,
  danger: styles.statDanger,
  info: styles.statInfo,
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`${styles.statusBadge} ${badgeToneClasses[tone]}`}>
      <span className={styles.badgeDot} aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Exclude<Tone, "neutral">;
}) {
  return (
    <article className={`${styles.statCard} ${statToneClasses[tone]}`}>
      <div className={styles.statRoute} aria-hidden="true">
        <span />
        <span />
      </div>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </article>
  );
}
