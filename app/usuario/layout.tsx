import { requerirRol } from "@/utils/auth";

// La vista del alumno es un mapa a pantalla completa: no hay header. El nombre
// y "Cerrar sesión" viven en el menú de cuenta de la barra de búsqueda.
export default async function UsuarioLayout({ children }: { children: React.ReactNode }) {
  await requerirRol("alumno");
  return <div className="min-h-dvh bg-slate-50">{children}</div>;
}
