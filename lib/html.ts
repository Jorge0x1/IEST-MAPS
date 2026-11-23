// Escapa texto para meterlo en HTML. Leaflet interpreta como HTML el texto de
// tooltips, popups y divIcons: todo dato que venga de la base pasa por aquí.
// Sin dependencias, para poder usarlo en el servidor, el navegador y las pruebas.
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
