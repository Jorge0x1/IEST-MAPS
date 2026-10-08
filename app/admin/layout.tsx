import { SessionHeader } from "@/app/components/session-header";
import { requerirRol } from "@/utils/auth";
import { AdminBrand } from "./admin-brand";
import { AdminMobileNav } from "./admin-mobile-nav";
import { AdminNav } from "./admin-nav";
import styles from "./admin-shell.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requerirRol("administrador");
  const nombre = profile.nombre ?? profile.correo ?? "Administrador";

  return (
    <div className={styles.adminShell}>
      <aside className={styles.sidebar} aria-label="Panel administrativo">
        <div className={styles.sidebarInner}>
          <AdminBrand />

          <div className={styles.sidebarDivider} aria-hidden="true">
            <span />
          </div>

          <AdminNav />

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarRoute} aria-hidden="true">
              <span className={styles.sidebarRouteLine} />
              <span className={styles.sidebarRouteStart} />
              <span className={styles.sidebarRouteEnd} />
            </div>
            <p className={styles.sidebarFooterLabel}>Gestión segura</p>
            <p>
              Los cambios de rol se aplican inmediatamente en el siguiente
              acceso del usuario.
            </p>
          </div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <SessionHeader
          nombre={nombre}
          rol={profile.rol}
          variant="admin"
          mobileNavigation={<AdminMobileNav />}
        />
        <div className={styles.contentArea}>{children}</div>
      </div>
    </div>
  );
}
