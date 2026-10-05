# Rutina Fuerza

Registro de rutina de fuerza de 12 semanas, pensado para seguir el plan sin backend ni dependencias.

## Qué incluye
- Plan de 12 semanas
- Días de entrenamiento: lunes, miércoles y viernes
- Seguimiento de series, repeticiones, peso y sensación
- Comparación semanal de progreso
- Exportación e importación de datos en JSON
- 100% estático: HTML, CSS y JavaScript

## Cómo probarlo localmente

```bash
python -m http.server 8000
```

Luego abrí:

```text
http://localhost:8000/
```

## Importante

La información se guarda en `localStorage` del navegador. Para evitar perder datos, exportá el archivo JSON con frecuencia.

## Deploy en GitHub Pages

1. Subir este repositorio
2. Ir a `Settings > Pages`
3. Seleccionar la rama `main`
4. Guardar

Quedará disponible en:

```text
https://piposeimandi.github.io/rutina-fuerza/
```
