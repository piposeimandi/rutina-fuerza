# Rutina Fuerza

Registro de rutina de fuerza de 12 semanas, pensado para seguir tu plan sin backend, sin dependencias y con almacenamiento local en el navegador.

## Características

- Plan de 12 semanas
- Días de entrenamiento: lunes, miércoles y viernes
- Seguimiento de series, repeticiones y peso
- Comparación semanal de progreso
- Exportación e importación de datos en JSON
- 100% estático: HTML, CSS y JavaScript
- Sin servidor de aplicación ni base de datos

## Cómo probarlo

```bash
python -m http.server 8000
```

Luego abrí:

```text
http://localhost:8000/
```

## Estructura

```text
.
├── index.html
├── styles.css
├── app.js
├── README.md
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
