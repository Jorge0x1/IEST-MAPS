import Image from "next/image";
import brandIcon from "@/assets/IESTMaps_IconPage.svg";
import styles from "./admin-shell.module.css";

export function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.adminBrand} ${compact ? styles.adminBrandCompact : ""}`}>
      <span className={styles.brandIconWrap}>
        <Image src={brandIcon} alt="" className={styles.brandIcon} />
      </span>
      <div className={styles.brandCopy}>
        <p>IEST Maps</p>
        <span>Panel de administración</span>
      </div>
    </div>
  );
}
