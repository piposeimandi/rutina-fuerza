# Training log improvements

## Objective

Make the app match the real routine in `rutina_musculo_12_semanas.pdf`, fix the dead
start-date button, make set counts dynamic, differentiate weighted vs bodyweight
exercises, add explanations for every exercise, and rebuild the layout mobile-first.

## Problem

1. **Wrong routine.** The app hardcodes a 5x5 barbell strength program. The PDF is a
   beginner dumbbell muscle-gain routine with 2 kg weights and 6 different exercises.
   There is zero overlap between the two lists.
2. **Dead button.** `index.html` declares `#btnCambiarInicio`, but `bindEvents()` in
   `app.js` never binds it. Zero behaviour behind it.
3. **Set count hardcoded.** `app.js:221` loops `s < 3` and six default literals hardcode
   `sets: [0, 0, 0]`. The PDF needs 3 sets for some exercises and 2 for others.
4. **Weight is meaningless for two exercises.** Flexiones and sit-to-stand are pure
   bodyweight. Showing a `Peso (kg)` input for them is noise.
5. **No exercise explanations anywhere.** The PDF documents technique for all six.
6. **Not mobile-first.** Base CSS is desktop; one `max-width: 860px` query stacks it.
7. **Weight semantics.** One weight per exercise applied to all its sets, never stated
   in the UI. Added load vs total load is indistinguishable.

## Source of truth

`rutina_musculo_12_semanas.pdf` (untracked). Extracted with `pdftotext -layout`.
Canonical exercise data, verbatim:

1. **Flexiones** — 3 series de 6-10 reps. Type `bodyweight`.
   "Apoye manos y pies en el piso, cuerpo recto. Baje el pecho controladamente y empuje
   para subir. Como su máximo actual es 12, no busque el máximo en cada serie. Descanse
   1:30-2 minutos." Works: pecho, hombros y tríceps.
2. **Curl de bíceps** — 3 series de 10-15 reps. Type `weighted`, 2 kg per hand.
   "Una mancuerna de 2 kg en cada mano, brazos a los costados. Mantenga los codos
   quietos y doble los brazos llevando las mancuernas hacia los hombros. Baje
   lentamente." Works: parte delantera del brazo.
3. **Curl martillo** — 2 series de 10-15 reps. Type `weighted`, 2 kg.
   "Igual que el curl, pero con las palmas enfrentadas entre sí. Suba y baje sin
   balancear el cuerpo." Works: bíceps y músculos del antebrazo.
4. **Extensión de tríceps** — 3 series de 10-15 reps. Type `weighted`, single dumbbell.
   "Use una sola mancuerna con ambas manos. Llévela por encima de la cabeza, baje
   lentamente detrás de la cabeza y vuelva a subir. Mantenga los codos apuntando hacia
   arriba." Works: parte trasera del brazo.
5. **Press de hombros** — 2 series de 10-15 reps. Type `weighted`, 2 kg per hand.
   "Una mancuerna en cada mano a la altura de los hombros. Empuje hacia arriba y baje
   lentamente. No haga rebotes." Works: hombros y brazos.
6. **Sentarse y levantarse de una silla** — 2 series de 10-15 reps. Type `bodyweight`.
   "Póngase delante de una silla. Baje lentamente hasta tocarla con el trasero y vuelva a
   ponerse de pie. Mantenga los pies firmes." Works: piernas y glúteos.

Program-level copy, also from the PDF:

- Objective: ganar masa muscular y fortalecer brazos, hombros, pecho y piernas. Nivel inicial.
- Frequency Monday/Wednesday/Friday, 25-35 min per session.
- First 2-3 weeks: learn the movements before lifting more weight.
- Rest between sets 60-90 s; up to 2 min after flexiones.
- Weeks 1-2: use 2 kg and learn technique, no need to reach the limit.
- Weeks 3-6: approach the top of the rep range, then add a little weight.
- Weeks 7-12: keep increasing weight or reps gradually.
- Warm up 5 min of gentle movement first.
- Effort, not sharp pain. Stop on strong or unusual pain.

Confirmed already correct: the PDF's `REGISTRO PERSONAL` columns are
`Fecha | Peso usado | Repeticiones | Cómo me sentí`, which match the app's existing
`weight / sets / feel` model. Keep that shape.

## Locked decisions

- **Weight:** one weight per exercise applied to all its sets. Drop sets out of scope.
- **Type:** exactly `weighted`, `bodyweight`, `weighted-extra`.
- **Explanations:** in BOTH places — a collapsible "Cómo se hace" inside each exercise
  card, and a separate "Ejercicios" reference section on the page.
- **Sets:** stay a flat number array so stored sessions need no migration.
- **Delivery:** single commit to `main`, no PR. Cost accepted: no per-item rollback.
- Keep `STORAGE_KEY` unchanged so existing data survives.

## Tasks

### T0 — Replace the exercise list with the PDF routine

- [x] Replace `EXERCISES` with the six exercises above, carrying `sets`, `repsRange`,
      `type`, `works` and `technique`.
- [x] Update the header eyebrow copy from "12 semanas" to reflect the real program
      (objective and 25-35 min duration).
- [x] Keep Monday/Wednesday/Friday. The PDF frequency matches `TRAINING_DAYS` already.

### T1 — Start date modal

- [x] Bind `#btnCambiarInicio` to a native `<dialog>` via `showModal()`.
- [x] Prefill a `type="date"` input with `state.startDate`; Cancel closes without
      writing; Save validates via the existing `parseDateKey()`, persists with the
      existing `saveState()`, re-renders, closes, reports through `#statusMessage`.
- [x] Warn inside the dialog how many stored sessions fall outside the new 12-week
      window. `renderCalendar()` only renders the current window, so an unguarded date
      shift makes logged work look deleted.

### T2 — Dynamic sets

- [x] Initial set count derives from each exercise's prescription (3 or 2), not a `3`
      literal.
- [x] `+ Serie` / `- Serie` per exercise card. Minimum 1, maximum 10.
- [x] Add pushes `0`, remove splices the last entry, shape stays a flat number array.
- [x] Add/remove re-renders only that one card. NEVER re-render on `input`, which steals
      focus while typing on mobile.
- [x] `inputmode="numeric"` on set inputs.

### T3 — Exercise type differentiation

- [x] Per-exercise type selector; overrides in `state.exerciseTypes` keyed by name.
- [x] Include `exerciseTypes` in `saveState()`, `exportData()` and `importData()`.
- [x] `bodyweight` hides the weight input entirely.
- [x] `weighted-extra` relabels to "Peso extra" and states it adds to body weight.

### T4 — Exercise explanations

- [x] Collapsible "Cómo se hace" inside each exercise card, showing technique, target
      muscles, rest and set/rep prescription.
- [x] Separate "Ejercicios" section listing all six cards with the same detail, plus the
      program-level copy (progression weeks 1-2 / 3-6 / 7-12, rest, warm-up, the effort
      and pain note).

### T5 — Mobile-first layout

- [x] Invert the cascade: base rules are the phone layout, `min-width` queries add desktop.
- [x] Interactive targets at least 44px tall.
- [x] Input font-size at least 16px so iOS does not zoom on focus.
- [x] Calendar cells sized for touch at 360px, compacted wider.
- [x] Dialog sized for small viewports.
- [x] No horizontal scrolling at 360px viewport width.

### T6 — Robustness

- [x] `normalizeSession()` so a missing or legacy `exercises` / `sets` entry cannot throw.
      `current.exercises[index].weight = ...` assumes the index exists.
- [x] Guard `loadState()` against malformed stored data.
- [x] Existing stored sessions reference exercises by array index. Changing `EXERCISES`
      reindexes them. Migrate by exercise NAME, not index, so logged weight and reps
      survive the T0 swap.

## Route

Single delegated writer. The writer rule fires: `index.html`, `app.js` and `styles.css`
are three interdependent non-trivial files whose ids and classes must agree.

## Checks

- `node --check app.js`
- Headless smoke test on the served app: start-date dialog opens and saves; add/remove a
  series; bodyweight exercise hides the weight field; explanation section renders all six;
  no horizontal scroll at 360px.
- Parent spot check re-running the reported commands.

## Progress

One delegated writer implemented T0-T6. Parent then ran an independent browser
verification pass against `python3 -m http.server 8765` and re-ran `node --check`.

## Verification evidence

Observed, not assumed:

- `node --check app.js` — exit 0, no output. Re-run by the parent as spot check.
- Exercise data matches the PDF exactly: 6 entries, set counts `3,3,2,3,2,2`, types
  `bodyweight,weighted,weighted,weighted,weighted,bodyweight`, default weight 2 kg on
  the four dumbbell exercises. Verified by parsing `EXERCISES` out of `app.js` and
  comparing field by field.
- Start-date dialog: `#btnCambiarInicio` click gives `dialog.open === true` and
  `matches(':modal') === true`, input prefilled `2026-01-05`, focus lands on the input.
- Bodyweight differentiation: Flexiones renders `.field.weight-field.hidden` with the
  input at `0x0`; Curl de bíceps renders the same field unhidden at `104x44`. Confirmed
  both by computed style and visually in a screenshot.
- Dynamic sets: Curl martillo 4 → 3 on remove; floors at 1 with the remove button
  disabled; ceilings at 10 with the add button disabled. Sibling cards unaffected.
- Mobile-first at 360px: `scrollWidth - clientWidth === 0`, no element past the viewport,
  zero interactive targets under 44px, zero inputs under 16px. Measured with
  `body{overflow-x}` forced to `visible`, because a `hidden` overflow on body masks the
  overflow and produces a false pass.
- Explanation section renders all 6 reference cards.
- Legacy migration: planted the v1 positional payload (5 barbell entries incl.
  `Sentadilla {weight:60, sets:[5,5,5], feel:"pesado"}`). After reload all five survived
  with exact values and were surfaced by `#legacyNotice` rather than dropped.
- Only console error is a `favicon.ico` 404. Cosmetic, pre-existing, not a regression.

## Corrections made during verification

Two of my own checks produced false failures and were fixed, not the code:

- I reported bodyweight exercises as showing a weight field. My probe tested
  `.weight-wrap`, but the implementation hides the parent `.field`. Re-tested with
  `getBoundingClientRect()`: correctly hidden.
- My series-removal selector used ASCII `-` while the button label is `−` (U+2212).

## Known gaps

- `README.md` still describes the app generically and never mentions the dumbbell
  routine. Out of scope, not done.
- No `.gitignore`. `.atl/` is untracked tooling cache; do not `git add -A`.
- No favicon, so every page load 404s once.

## Next step

Committed as a single commit to `main` per the locked delivery decision.