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
