import Image from "next/image";
import { redirect } from "next/navigation";
import { iniciarSesionConGoogle } from "./actions";
import { obtenerSesionConPerfil, rutaParaRol } from "@/utils/auth";
import iestMapsLogo from "@/assets/IESTMaps_Logo.png";
import styles from "./page.module.css";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sesion = await obtenerSesionConPerfil();
  if (sesion) redirect(rutaParaRol(sesion.profile.rol));
  const { error } = await searchParams;

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginShell}>
        <section className={styles.identityPanel} aria-labelledby="brand-heading">
          <div className={styles.routeGraphic} aria-hidden="true">
            <span className={styles.routePath} />
            <span className={`${styles.routeNode} ${styles.routeNodeStart}`} />
            <span className={`${styles.routeNode} ${styles.routeNodeMiddle}`} />
            <span className={`${styles.routeNode} ${styles.routeNodeEnd}`} />
          </div>

          <div className={styles.brandLockup}>
            <Image
              src={iestMapsLogo}
              alt="Símbolo de IEST Maps"
              className={styles.brandLogo}
              preload
            />
            <div>
              <p className={styles.brandName}>IEST Maps</p>
              <p className={styles.brandDescriptor}>Orientación del campus</p>
            </div>
          </div>

          <div className={styles.identityCopy}>
            <p className={styles.eyebrow}>Campus en movimiento</p>
            <h1 id="brand-heading" className={styles.brandHeading}>
              Tu recorrido comienza aquí.
            </h1>
            <p className={styles.brandText}>
              Una plataforma universitaria pensada para orientarte y acompañar
              tus trayectos dentro del campus.
            </p>
          </div>

          <div className={styles.locationCaption}>
            <span aria-hidden="true" className={styles.locationDot} />
            <span>IEST Anáhuac · Plataforma institucional</span>
          </div>
        </section>

        <section className={styles.accessPanel} aria-labelledby="login-heading">
          <div className={styles.accessContent}>
            <p className={styles.accessEyebrow}>Acceso institucional</p>
            <h2 id="login-heading" className={styles.loginHeading}>
              Bienvenido
            </h2>
            <p className={styles.loginIntro}>
              Inicia sesión con tu cuenta institucional para consultar las
              rutas del campus.
            </p>

            {error ? (
              <p role="alert" className={styles.errorMessage}>
                <span aria-hidden="true" className={styles.errorMark}>
                  !
                </span>
                <span>{error}</span>
              </p>
            ) : null}

            <form action={iniciarSesionConGoogle} className={styles.loginForm}>
              <button
                type="submit"
                className={styles.googleButton}
                aria-describedby="institutional-access-note"
              >
                <span className={styles.googleIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.74 2.98-4.31 2.98-7.35Z" />
                    <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z" />
                    <path fill="#FBBC05" d="M6.39 13.9A6.02 6.02 0 0 1 6.07 12c0-.66.11-1.3.32-1.9V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.59Z" />
                    <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.59C7.18 7.73 9.39 5.97 12 5.97Z" />
                  </svg>
                </span>
                <span>Continuar con Google</span>
                <span aria-hidden="true" className={styles.buttonArrow}>
                  →
                </span>
              </button>
            </form>

            <div id="institutional-access-note" className={styles.accessNote}>
              <span aria-hidden="true" className={styles.noteAccent} />
              <div>
                <p>Cuenta institucional requerida</p>
                <span>Solo se aceptan cuentas con dominio @iest.edu.mx</span>
              </div>
            </div>

            <p className={styles.securityNote}>
              Serás dirigido al acceso seguro de Google para continuar.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
