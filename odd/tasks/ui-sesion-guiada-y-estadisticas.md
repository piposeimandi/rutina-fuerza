# UI: sesión guiada por pantallas + estadísticas

## Objetivo
Cambiar la UX para que, al seleccionar un día, el calendario se oculte y la sesión se presente con tarjetas minimizadas en flujo guiado (uno por uno), y agregar una pantalla de Estadísticas (adherencia + progresión).

## Cambios realizados
- Vistas: Calendario | Sesión | Estadísticas. Nav visible en Calendario/Stats; en Sesión hay "← Volver al calendario".
- Sesión guiada: tarjetas colapsables, una activa a la vez, botón "Listo, siguiente" marca y pasa al siguiente. "Marcar como hecha" marca toda la sesión.
- Campo `done` por ejercicio con normalización/migración silenciosa (datos v1 compatibles).
- Estadísticas: % cumplimiento, hechas/planificadas, racha; progresión por ejercicio (tendencia + sparkline SVG a mano).
- Ejercicios y Copia de seguridad como secciones colapsables dentro de Calendario.
- Mobile-first, sin dependencias externas.

## Archivos
- index.html
- app.js
- styles.css
- README.md

## Estado
- Rama: feat
- Commits: 63ee967, e2d4094
- Push: ok
