# Aviso de llegada al destino — diseño corto

Fecha: 2026-11-21 · Aprobado por Carlos en conversación (tarjeta y botones); el ajuste de radio es propuesta de Claude.

## Intención
En pruebas de campus, al terminar un recorrido la app no avisaba claramente que se llegó: volvía directo a "Empezar a caminar". Además, la llegada se marcaba cuando aún faltaban ~10 m.

## Causa encontrada
- `modo-navegacion.tsx` llama `onLlegada` en cuanto la fase pasa a `llegada`; `navegador.tsx` lo conecta a `terminarNavegacion`, que apaga la navegación al instante. El texto "Llegaste a X" casi no se ve.
- `LLEGADA_M = 10` en `lib/rutas/navegacion.ts`: se llega cuando faltan ≤ 10 m sobre la línea de la ruta.

## Alcance
1. **Tarjeta de llegada** (decisión de Carlos: se queda hasta tocar un botón, no se cierra sola).
   - Al entrar en fase `llegada` no se sale de la navegación. Se muestra una tarjeta "¡Llegaste!" con nombre y edificio/piso del destino, y una animación corta (pin que cae + pulso). Respeta `prefers-reduced-motion`. Mantiene sonido/vibración existentes.
   - Botones (decisión de Claude, aprobada): **Listo** cierra la tarjeta y deja el destino en el panel; **Buscar otro destino** limpia el destino y vuelve a la búsqueda.
2. **Radio de llegada** (propuesta de Claude): bajar `LLEGADA_M` de 10 a 5 m. Como el GPS del teléfono se desvía unos metros, mostrar el botón "Ya llegué" también cuando falten ≤ 25 m en el último tramo, para que nadie se quede sin forma de terminar si el GPS se queda corto.

## Fuera de alcance
- Voz (TTS): después, empezando con `speechSynthesis`.
- Cambios al recálculo, desvíos o cambio de piso.

## Enfoque
Una sola vía sensata: ajustar el flujo existente (`onLlegada` deja de cerrar; la tarjeta y sus botones salen de `modo-navegacion.tsx`; `navegador.tsx` provee las dos acciones). Alternativa descartada: cierre automático por temporizador, porque una persona distraída puede perderse el aviso.

## Verificación
- Tests de `lib/rutas/navegacion.test.ts` actualizados para el nuevo radio y para el botón de "Ya llegué" cercano.
- `npm test` y `npm run lint`.
- Prueba manual con "Ya llegué": la tarjeta no se cierra sola.
