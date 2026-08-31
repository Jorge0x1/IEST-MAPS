import { redirect } from "next/navigation";
import { obtenerSesionConPerfil, rutaParaRol } from "@/utils/auth";

export default async function Home() {
  const sesion = await obtenerSesionConPerfil();

  if (!sesion) {
    redirect("/login");
  }

  redirect(rutaParaRol(sesion.profile.rol));
}
