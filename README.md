# Rutina Fuerza

Registro de una rutina de fuerza de 12 semanas con mancuernas para principiantes, tal como está en `rutina_musculo_12_semanas.pdf`. Sin backend, sin dependencias, sin build: abrís el `index.html` y entrenás.

## La rutina

6 ejercicios, lunes, miércoles y viernes. Cada sesión dura entre 25 y 35 minutos. El objetivo es ganar masa muscular y fortalecer brazos, hombros, pecho y piernas.

| Ejercicio | Series x reps | Carga | Trabaja |
| --- | --- | --- | --- |
| Flexiones | 3 x 6-10 | Peso corporal (máximo actual 12) | Pecho, hombros y tríceps |
| Curl de bíceps | 3 x 10-15 | 2 kg por mano | Parte delantera del brazo |
| Curl martillo | 2 x 10-15 | 2 kg | Bíceps y músculos del antebrazo |
| Extensión de tríceps | 3 x 10-15 | Una mancuerna con ambas manos | Parte trasera del brazo |
| Press de hombros | 2 x 10-15 | 2 kg por mano | Hombros y brazos |
| Sentarse y levantarse de una silla | 2 x 10-15 | Peso corporal | Piernas y glúteos |

### Cómo progresás

- **Semanas 1-2**: aprendé la técnica con 2 kg. No busques el máximo.
- **Semanas 3-6**: llegá al techo del rango de reps y sumá peso.
- **Semanas 7-12**: seguí subiendo de a poco.

Calentá 5 minutos con movimiento suave. Descansá 60-90 segundos entre series, y hasta 2 minutos después de las flexiones. Esforzate, pero no te|lastimas: si sentís un dolor fuerte o raro, frená.

## Qué incluye

- Sesión guiada por pantallas: al elegir un día el calendario se oculta y vas ejercicio por ejercicio. Cada tarjeta se minimiza/expande, con botón "Listo, siguiente" para pasar al siguiente.
- Estadísticas: adherencia (hechas vs planificadas, racha) y progresión por ejercicio (peso, tendencia y gráfico de reps).

## Cómo probarlo localmente

```bash
python3 -m http.server 8000
```

Luego abrí:

```text
http://localhost:8000/
```

## Importante

La información se guarda en `localStorage` del navegador, o sea que es local a tu dispositivo: no se sincroniza con nada y si limpiás la caché o cambiás de navegador, no la tenés más. Exportá el archivo JSON con frecuencia, es tu única copia.

## Deploy en GitHub Pages

1. Subir este repositorio
2. Ir a `Settings > Pages`
3. Seleccionar la rama `main`
4. Guardar

Quedará disponible en:

```text
https://piposeimandi.github.io/rutina-fuerza/
```
