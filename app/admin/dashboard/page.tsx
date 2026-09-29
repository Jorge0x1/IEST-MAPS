import { AccessButton } from "./access-button";
import { CreateUserForm } from "./create-user-form";
import { eliminarAltaPendiente } from "./actions";
import { RoleSelector } from "./role-selector";
import { StatCard, StatusBadge } from "../components/admin-ui";
import styles from "./dashboard.module.css";
import { requerirRol, type RolUsuario } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";

type Profile = {
  id: string;
  nombre: string | null;
  correo: string | null;
  rol: RolUsuario;
  activo: boolean;
  created_at: string;
};

type AltaPendiente = {
  id: string;
  nombre: string | null;
  correo: string;
  rol: RolUsuario;
  created_at: string;
};

const etiquetasRol: Record<string, string> = {
  administrador: "Administrador",
  guardia: "Guardia",
  alumno: "Alumno",
};

const tonosRol: Record<string, "brand" | "warning" | "info" | "neutral"> = {
  administrador: "brand",
  guardia: "warning",
  alumno: "info",
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function fecha(fechaIso: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(fechaIso));
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ buscar?: string }> }) {
  const { profile: administrador } = await requerirRol("administrador");
  const { buscar = "" } = await searchParams;
  const supabase = await createClient();
  const [profilesResult, pendientesResult] = await Promise.all([
    supabase.from("profiles").select("id, nombre, correo, rol, activo, created_at").neq("rol", "visitante").order("created_at", { ascending: false }),
    supabase.from("usuarios_autorizados").select("id, nombre, correo, rol, created_at").eq("estado", "pendiente").order("created_at", { ascending: false }),
  ]);

  const perfiles = (profilesResult.data ?? []) as Profile[];
  const pendientes = (pendientesResult.data ?? []) as AltaPendiente[];
  const termino = normalizar(buscar.trim());
  const perfilesFiltrados = termino
    ? perfiles.filter((perfil) => normalizar(`${perfil.nombre ?? ""} ${perfil.correo ?? ""} ${perfil.rol}`).includes(termino))
    : perfiles;
  const resumen = {
    activos: perfiles.filter((p) => p.activo).length,
    pendientes: pendientes.length,
    desactivados: perfiles.filter((p) => !p.activo).length,
    privilegiados: perfiles.filter((p) => p.activo && ["administrador", "guardia"].includes(p.rol)).length,
  };

  return (
    <main className={styles.dashboardPage}>
      <header className={styles.pageHeader}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowNode} aria-hidden="true" />
            Gestión institucional
          </p>
          <h1 className={styles.pageTitle}>Usuarios y accesos</h1>
          <p className={styles.pageDescription}>
            Autoriza correos institucionales, prepara sus roles y controla quién puede entrar al sistema.
          </p>
        </div>

        <div className={styles.authStatus} aria-label="Google Auth conectado">
          <span className={styles.authIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m6.5 12.5 3.2 3.2 7.8-8" /></svg>
          </span>
          <div>
            <p>Google Auth</p>
            <span>Conectado</span>
          </div>
        </div>

        <div className={styles.headerRoute} aria-hidden="true">
          <span className={styles.headerRouteLine} />
          <span className={styles.headerRouteStart} />
          <span className={styles.headerRouteEnd} />
        </div>
      </header>

      <section aria-label="Resumen de usuarios" className={styles.statsGrid}>
        <StatCard label="Usuarios activos" value={resumen.activos} tone="success" />
        <StatCard label="Pendientes de acceso" value={resumen.pendientes} tone="warning" />
        <StatCard label="Accesos desactivados" value={resumen.desactivados} tone="danger" />
        <StatCard label="Roles privilegiados" value={resumen.privilegiados} tone="brand" />
      </section>

      <section className={styles.panel} aria-labelledby="alta-title">
        <div className={styles.panelHeader}>
          <div className={styles.panelHeadingGroup}>
            <p className={styles.panelKicker}>Nuevo acceso</p>
            <h2 id="alta-title" className={styles.panelTitle}>Dar de alta un correo</h2>
            <p className={styles.panelDescription}>
              La cuenta de Google se enlazará automáticamente cuando la persona ingrese por primera vez.
            </p>
          </div>
        </div>
        <div className={styles.panelBody}>
          <CreateUserForm />
        </div>
      </section>

      {pendientes.length > 0 ? (
        <section className={`${styles.panel} ${styles.pendingPanel}`} aria-labelledby="pendientes-title">
          <div className={styles.panelHeader}>
            <div className={styles.panelHeadingGroup}>
              <p className={styles.panelKicker}>Activación pendiente</p>
              <h2 id="pendientes-title" className={styles.panelTitle}>Pendientes de primer acceso</h2>
              <p className={styles.panelDescription}>
                Estos correos ya tienen un rol reservado, pero aún no han iniciado sesión con Google.
              </p>
            </div>
            <span className={styles.countBadge} aria-label={`${pendientes.length} altas pendientes`}>
              {pendientes.length}
            </span>
          </div>
          <ul className={styles.pendingList}>
            {pendientes.map((alta) => (
              <li key={alta.id} className={styles.pendingItem}>
                <div className={styles.pendingIdentity}>
                  <p className={styles.identityName}>{alta.nombre || "Nombre pendiente"}</p>
                  <p className={styles.identityMeta}>{alta.correo} · Alta {fecha(alta.created_at)}</p>
                </div>
                <div className={styles.pendingActions}>
                  <StatusBadge tone={tonosRol[alta.rol] ?? "neutral"}>
                    {etiquetasRol[alta.rol] ?? alta.rol}
                  </StatusBadge>
                  <form action={eliminarAltaPendiente.bind(null, alta.id)}>
                    <button className={styles.dangerButton}>Cancelar alta</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`${styles.panel} ${styles.directoryPanel}`} aria-labelledby="directorio-title">
        <div className={`${styles.panelHeader} ${styles.directoryHeader}`}>
          <div className={styles.panelHeadingGroup}>
            <p className={styles.panelKicker}>Control de acceso</p>
            <h2 id="directorio-title" className={styles.panelTitle}>Directorio de usuarios</h2>
            <p className={styles.panelDescription}>
              {perfilesFiltrados.length} de {perfiles.length} cuentas institucionales
            </p>
          </div>
          <form className={styles.searchForm} action="/admin/dashboard">
            <label htmlFor="buscar" className={styles.srOnly}>Buscar usuario</label>
            <div className={styles.searchControl}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg>
              <input
                id="buscar"
                name="buscar"
                type="search"
                defaultValue={buscar}
                placeholder="Nombre, correo o rol"
                className={`${styles.control} ${styles.searchInput}`}
              />
            </div>
            <button className={styles.primaryButton}>Buscar</button>
          </form>
        </div>

        {profilesResult.error || pendientesResult.error ? (
          <div className={styles.feedbackBox} role="alert">
            No fue posible cargar el directorio. Ejecuta primero la migración 0002 en Supabase.
          </div>
        ) : perfilesFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyNode} aria-hidden="true" />
            No encontramos usuarios con ese criterio.
          </div>
        ) : (
          <div>
            <div className={styles.directoryColumns} aria-hidden="true">
              <span>Usuario</span>
              <span>Estado</span>
              <span>Registro</span>
              <span>Rol</span>
              <span>Acceso</span>
            </div>
            <ul className={styles.directoryList} aria-label="Usuarios institucionales">
              {perfilesFiltrados.map((perfil) => (
                <li
                  key={perfil.id}
                  className={`${styles.directoryRow} ${perfil.activo ? "" : styles.directoryRowInactive}`}
                >
                  <div className={`${styles.directoryCell} ${styles.identityCell}`}>
                    <p className={styles.identityName}>{perfil.nombre || "Nombre no disponible"}</p>
                    <p className={styles.identityMeta}>{perfil.correo || "Sin correo"}</p>
                  </div>
                  <div className={styles.directoryCell}>
                    <span className={styles.dataLabel}>Estado</span>
                    <StatusBadge tone={perfil.activo ? "success" : "danger"}>
                      {perfil.activo ? "Activo" : "Desactivado"}
                    </StatusBadge>
                  </div>
                  <div className={styles.directoryCell}>
                    <span className={styles.dataLabel}>Registro</span>
                    <span className={styles.dateText}>{fecha(perfil.created_at)}</span>
                  </div>
                  <div className={`${styles.directoryCell} ${styles.roleCell}`}>
                    <span className={styles.dataLabel}>Rol</span>
                    <RoleSelector
                      profileId={perfil.id}
                      rolActual={perfil.rol}
                      deshabilitado={perfil.id === administrador.id || !perfil.activo}
                    />
                  </div>
                  <div className={`${styles.directoryCell} ${styles.accessCell}`}>
                    <span className={styles.dataLabel}>Acceso</span>
                    {perfil.id === administrador.id ? (
                      <span className={styles.currentAccount}>Tu cuenta</span>
                    ) : (
                      <AccessButton profileId={perfil.id} activo={perfil.activo} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
