import { SessionHeader } from "@/app/components/session-header";
import { requerirRol } from "@/utils/auth";
import styles from "./guardia.module.css";

// Misma barra superior que el panel de administración, sin menú lateral: el guardia
// solo tiene una pantalla.
export default async function GuardiaLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requerirRol("guardia");
  return (
    <div className={styles.shell}>
      <SessionHeader
        nombre={profile.nombre ?? profile.correo ?? "Guardia"}
        rol={profile.rol}
        variant="admin"
        contexto={{ titulo: "Control de acceso", detalle: "Registro de visitantes" }}
      />
      {children}
    </div>
  );
}
