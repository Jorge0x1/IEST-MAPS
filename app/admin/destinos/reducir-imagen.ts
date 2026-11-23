// Reduce una foto en el navegador antes de subirla: lado mayor de 1280 px como
// máximo y JPEG a calidad 0.82 (suele quedar en 150–300 KB). Respeta la
// orientación EXIF del celular y pinta fondo blanco por si el original es PNG
// con transparencia.

const LADO_MAXIMO = 1280;
const CALIDAD_JPEG = 0.82;

export async function reducirImagen(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const ancho = Math.max(1, Math.round(imagen.width * escala));
    const alto = Math.max(1, Math.round(imagen.height * escala));

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext("2d");
    if (!contexto) throw new Error("El navegador no pudo procesar la imagen.");
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, ancho, alto);
    contexto.drawImage(imagen, 0, 0, ancho, alto);

    return await new Promise<Blob>((resolver, rechazar) => {
      lienzo.toBlob(
        (blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo comprimir la imagen."))),
        "image/jpeg",
        CALIDAD_JPEG,
      );
    });
  } finally {
    imagen.close();
  }
}

// Reduce un logo: lado mayor de 256 px como máximo, SIN fondo (conserva la
// transparencia). WebP si el navegador sabe codificarlo; si no, PNG.
const LADO_MAXIMO_LOGO = 256;

export async function reducirLogo(archivo: File): Promise<{ blob: Blob; extension: "png" | "webp" }> {
  const imagen = await createImageBitmap(archivo);
  try {
    const escala = Math.min(1, LADO_MAXIMO_LOGO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.max(1, Math.round(imagen.width * escala));
    lienzo.height = Math.max(1, Math.round(imagen.height * escala));
    const contexto = lienzo.getContext("2d");
    if (!contexto) throw new Error("El navegador no pudo procesar la imagen.");
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    const codificar = (tipo: string) =>
      new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, tipo, 0.9));
    const webp = await codificar("image/webp");
    // Safari viejo ignora image/webp y devuelve PNG: se revisa el tipo real.
    if (webp && webp.type === "image/webp") return { blob: webp, extension: "webp" };
    const png = await codificar("image/png");
    if (!png) throw new Error("No se pudo procesar el logo.");
    return { blob: png, extension: "png" };
  } finally {
    imagen.close();
  }
}
