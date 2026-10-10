const STORAGE_KEY = 'rutina-fuerza:v1';
const PROGRAM_WEEKS = 12;
const TRAINING_DAYS = [1, 3, 5];
const DEFAULT_START = '2026-01-05';

// Set count boundaries. One weight per exercise, so sets only carry reps values.
const MIN_SETS = 1;
const MAX_SETS = 10;
const EXERCISE_TYPES = ['weighted', 'bodyweight', 'weighted-extra'];

const EXERCISE_TYPE_LABELS = {
  weighted: 'Con peso',
  bodyweight: 'Peso corporal',
  'weighted-extra': 'Peso extra',
};

const state = {
  startDate: DEFAULT_START,
  selectedDate: null,
  view: 'calendar',
  sessions: {},
  exerciseTypes: {},
};

// Which exercise of the current session is expanded right now. Per-exercise
// completion lives in the session data (`done`); this only remembers what the
// user was working on and is never persisted.
let activeExercise = { date: null, name: null };

const viewCalendar = document.getElementById('viewCalendar');
const viewSession = document.getElementById('viewSession');
const viewStats = document.getElementById('viewStats');
const appNav = document.getElementById('appNav');

const calendarBody = document.getElementById('calendarBody');
const weekBadge = document.getElementById('weekBadge');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const selectedWeekLabel = document.getElementById('selectedWeekLabel');
const statusMessage = document.getElementById('statusMessage');
const legacyNotice = document.getElementById('legacyNotice');

const exerciseTemplate = document.getElementById('exerciseTemplate');
const exerciseList = document.getElementById('exerciseList');
const noteInput = document.getElementById('noteInput');
const importInput = document.getElementById('importInput');
const programInfo = document.getElementById('programInfo');

const exerciseReference = document.getElementById('exerciseReference');
const exerciseReferenceTemplate = document.getElementById('exerciseReferenceTemplate');

const statCumplimiento = document.getElementById('statCumplimiento');
const statHechas = document.getElementById('statHechas');
const statRacha = document.getElementById('statRacha');
const statBarFill = document.getElementById('statBarFill');
const statDetail = document.getElementById('statDetail');
const progressionList = document.getElementById('progressionList');

const startDateDialog = document.getElementById('startDateDialog');
const startDateForm = document.getElementById('startDateForm');
const startDateInput = document.getElementById('startDateInput');
const startDateWarning = document.getElementById('startDateWarning');

// Canonical routine. Extracted verbatim from rutina_musculo_12_semanas.pdf, which is
// the source of truth. Set counts differ per exercise (3, 3, 2, 3, 2, 2), so the
// prescription lives in data and is never hardcoded at the render site.
const EXERCISES = [
  {
    name: 'Flexiones',
    sets: 3,
    repsRange: '6-10',
    type: 'bodyweight',
    defaultWeight: 0,
    works: 'Pecho, hombros y tríceps',
    technique: 'Apoye manos y pies en el piso, cuerpo recto. Baje el pecho controladamente y empuje para subir. Como su máximo actual es 12, no busque el máximo en cada serie.',
    rest: '1:30-2 min',
  },
  {
    name: 'Curl de bíceps',
    sets: 3,
    repsRange: '10-15',
    type: 'weighted',
    defaultWeight: 2,
    works: 'Parte delantera del brazo',
    technique: 'Una mancuerna de 2 kg en cada mano, brazos a los costados. Mantenga los codos quietos y doble los brazos llevando las mancuernas hacia los hombros. Baje lentamente.',
    rest: '60-90 s',
  },
  {
    name: 'Curl martillo',
    sets: 2,
    repsRange: '10-15',
    type: 'weighted',
    defaultWeight: 2,
    works: 'Bíceps y músculos del antebrazo',
    technique: 'Igual que el curl, pero con las palmas enfrentadas entre sí. Suba y baje sin balancear el cuerpo.',
    rest: '60-90 s',
  },
  {
    name: 'Extensión de tríceps',
    sets: 3,
    repsRange: '10-15',
    type: 'weighted',
    defaultWeight: 2,
    works: 'Parte trasera del brazo',
    technique: 'Use una sola mancuerna con ambas manos. Llévela por encima de la cabeza, baje lentamente detrás de la cabeza y vuelva a subir. Mantenga los codos apuntando hacia arriba.',
    rest: '60-90 s',
  },
  {
    name: 'Press de hombros',
    sets: 2,
    repsRange: '10-15',
    type: 'weighted',
    defaultWeight: 2,
    works: 'Hombros y brazos',
    technique: 'Una mancuerna en cada mano a la altura de los hombros. Empuje hacia arriba y baje lentamente. No haga rebotes.',
    rest: '60-90 s',
  },
  {
    name: 'Sentarse y levantarse de una silla',
    sets: 2,
    repsRange: '10-15',
    type: 'bodyweight',
    defaultWeight: 0,
    works: 'Piernas y glúteos',
    technique: 'Póngase delante de una silla. Baje lentamente hasta tocarla con el trasero y vuelva a ponerse de pie. Mantenga los pies firmes.',
    rest: '60-90 s',
  },
];

// Sessions written before the routine swap store their exercises as a positional
// array with no name anywhere in the payload, so the previous program is listed
// here to re-attach each entry to the exercise it was actually logged against.
// Unknown positions fall back to a synthesized key so nothing is ever dropped.
const LEGACY_EXERCISE_NAMES = [
  'Sentadilla',
  'Press de banca',
  'Peso muerto',
  'Press militar',
  'Deadlift rows',
];

function parseDateKey(value) {
  if (typeof value !== 'string') return null;
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getProgramDates(startDate = state.startDate) {
  const start = parseDateKey(startDate);
  if (!start) return [];

  const dates = [];
  let current = new Date(start);
  for (let i = 0; i < PROGRAM_WEEKS * 7; i++) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates.filter((date) => TRAINING_DAYS.includes(date.getDay()));
}

function isTrainingDay(date) {
  const value = date instanceof Date ? date : parseDateKey(date);
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return false;
  return TRAINING_DAYS.includes(value.getDay());
}

function weekForDate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : parseDateKey(dateValue);
  if (!date) return 1;
  const start = parseDateKey(state.startDate);
  if (!start) return 1;
  const diffDays = Math.floor((date - start) / 86400000);
  if (diffDays < 0) return 1;
  return Math.min(PROGRAM_WEEKS, Math.floor(diffDays / 7) + 1);
}

function currentWeek() {
  return weekForDate(new Date());
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function findExercise(name) {
  return EXERCISES.find((exercise) => exercise.name === name) || null;
}

// --- Set helpers -----------------------------------------------------------

function clampSetCount(value) {
  const count = Math.round(Number(value));
  if (!Number.isFinite(count)) return MIN_SETS;
  return Math.min(MAX_SETS, Math.max(MIN_SETS, count));
}

// Single source for "how many sets does this exercise start with": the `sets`
// field of the prescription. A literal count at a call site is what this
// replaced, so every default flows from here.
function parseSetCount(exercise, fallback = MIN_SETS) {
  const declared = exercise && typeof exercise === 'object' ? exercise.sets : exercise;
  return clampSetCount(declared, fallback);
}

function emptySets(exercise) {
  return Array.from({ length: parseSetCount(exercise) }, () => 0);
}

function fallbackExerciseData(setsCount = MIN_SETS) {
  return {
    weight: 0,
    sets: Array.from({ length: clampSetCount(setsCount) }, () => 0),
    feel: '',
    done: false,
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Weighted exercises open a brand new session already loaded with the prescribed
// load instead of a zero the user has to notice and replace.
function defaultExerciseData(exercise) {
  return {
    weight: toNumber(exercise && exercise.defaultWeight),
    sets: emptySets(exercise),
    feel: '',
    done: false,
  };
}

// Sessions key their exercises by NAME. Positions would silently re-attach logged
// weight and reps to the wrong exercise the moment EXERCISES changes.
function emptySessionData(dateKey) {
  const exercises = {};
  EXERCISES.forEach((exercise) => {
    exercises[exercise.name] = defaultExerciseData(exercise);
  });
  return {
    date: dateKey,
    status: 'pending',
    exercises,
    note: '',
  };
}

function legacyKeyForIndex(index) {
  return LEGACY_EXERCISE_NAMES[index] || `Ejercicio retirado ${index + 1}`;
}

// Turns any stored `exercises` payload into a name-keyed map. Arrays (pre-migration
// shape) are read positionally once, against the known previous program.
function storedExercisesToMap(stored) {
  const map = {};
  if (Array.isArray(stored)) {
    stored.forEach((entry, index) => {
      map[legacyKeyForIndex(index)] = entry;
    });
    return map;
  }
  if (isPlainObject(stored)) return stored;
  return map;
}

function normalizeExerciseEntry(entry, fallback, forceDone = false) {
  if (!isPlainObject(entry)) return fallback;

  let sets;
  if (Array.isArray(entry.sets)) {
    sets = entry.sets.slice(0, MAX_SETS).map(toNumber);
    // A stored [] means the user removed every series; restore the minimum.
    while (sets.length < MIN_SETS) sets.push(0);
  } else {
    // Missing or non-array sets: fall back to the prescription default.
    sets = fallback.sets.slice();
  }

  // `done` is new. Data written before it existed has no clue about it: infer
  // quietly instead of forcing the user to re-tap six cards.
  const hasReps = sets.some((value) => value > 0);
  const done = typeof entry.done === 'boolean' ? entry.done : (forceDone || hasReps);

  return {
    weight: toNumber(entry.weight),
    sets,
    feel: typeof entry.feel === 'string' ? entry.feel : '',
    done,
  };
}

// Stored data is never trusted: a missing, partial, legacy or hand-edited session
// must still render. Pads/clamps and re-keys instead of throwing.
function normalizeSession(raw, dateKey) {
  const base = emptySessionData(dateKey);
  if (!isPlainObject(raw)) return base;

  const stored = storedExercisesToMap(raw.exercises);
  const exercises = {};
  const status = ['pending', 'done', 'skipped'].includes(raw.status) ? raw.status : 'pending';
  const forceDone = status === 'done';

  Object.keys(base.exercises).forEach((name) => {
    exercises[name] = normalizeExerciseEntry(stored[name], base.exercises[name], forceDone);
  });

  // Entries the current program does not know about belong to a previous routine.
  // They stay in the payload (export/import carry them) instead of being discarded.
  Object.keys(stored).forEach((name) => {
    if (Object.prototype.hasOwnProperty.call(exercises, name)) return;
    exercises[name] = normalizeExerciseEntry(stored[name], fallbackExerciseData(), forceDone);
  });

  return {
    date: dateKey,
    status,
    exercises,
    note: typeof raw.note === 'string' ? raw.note : '',
  };
}

// Every read/write of an exercise entry goes through here, so a missing or legacy
// key can never produce `undefined.weight`.
function exerciseData(session, exercise) {
  if (!exercise) return fallbackExerciseData();
  if (!isPlainObject(session)) return defaultExerciseData(exercise);
  if (!isPlainObject(session.exercises)) {
    session.exercises = emptySessionData(state.selectedDate).exercises;
  }
  if (!isPlainObject(session.exercises[exercise.name])) {
    session.exercises[exercise.name] = defaultExerciseData(exercise);
  }
  return session.exercises[exercise.name];
}

function legacyExerciseNames(session) {
  if (!session || !isPlainObject(session.exercises)) return [];
  return Object.keys(session.exercises).filter((name) => !findExercise(name));
}

function defaultExerciseTypes() {
  const types = {};
  EXERCISES.forEach((exercise) => {
    types[exercise.name] = exercise.type;
  });
  return types;
}

function getExerciseType(name) {
  const override = state.exerciseTypes[name];
  if (EXERCISE_TYPES.includes(override)) return override;
  const fallback = findExercise(name);
  return fallback ? fallback.type : 'weighted';
}

function setExerciseType(name, type) {
  if (!EXERCISE_TYPES.includes(type)) return;
  state.exerciseTypes[name] = type;
  saveState();
}

function prescriptionLabel(exercise) {
  const sets = exercise.sets;
  const noun = sets === 1 ? 'serie' : 'series';
  return `${sets} ${noun} de ${exercise.repsRange} repeticiones`;
}

// --- Persistence -----------------------------------------------------------

// Shared by loadState() and importData() so both paths accept exactly the same
// shapes and reject the same garbage.
function applyImportedState(parsed) {
  if (!isPlainObject(parsed)) return false;

  let applied = false;

  if (parseDateKey(parsed.startDate)) {
    state.startDate = parsed.startDate;
    applied = true;
  }

  if (isPlainObject(parsed.sessions)) {
    const sessions = {};
    Object.keys(parsed.sessions).forEach((key) => {
      // Drop entries keyed by something that is not a date.
      if (!parseDateKey(key)) return;
      sessions[key] = normalizeSession(parsed.sessions[key], key);
    });
    state.sessions = sessions;
    applied = true;
  }

  if (isPlainObject(parsed.exerciseTypes)) {
    state.exerciseTypes = defaultExerciseTypes();
    Object.entries(parsed.exerciseTypes).forEach(([name, type]) => {
      if (!EXERCISE_TYPES.includes(type)) return;
      // Overrides for exercises the current program does not have are kept as-is:
      // they stay inert, but a routine change never eats them.
      state.exerciseTypes[name] = type;
    });
    applied = true;
  }

  return applied;
}

function loadState() {
  state.startDate = DEFAULT_START;
  state.sessions = {};
  state.exerciseTypes = defaultExerciseTypes();

  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, disabled cookies): run on defaults.
    return;
  }
  if (typeof raw !== 'string' || raw === '') return;

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt payload: keep defaults instead of breaking the boot sequence.
    return;
  }
  if (!isPlainObject(parsed)) return;

  try {
    // This is the migration point: normalizeSession() re-keys every stored
    // session by exercise name before anything renders.
    applyImportedState(parsed);
  } catch {
    // Last resort: a payload that survives JSON.parse but breaks normalization
    // must not take the app down. Defaults stay.
    state.startDate = DEFAULT_START;
    state.sessions = {};
    state.exerciseTypes = defaultExerciseTypes();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startDate: state.startDate,
      sessions: state.sessions,
      exerciseTypes: state.exerciseTypes,
    }));
  } catch {
    showStatus('✗ No se pudo guardar en este navegador', 'error');
  }
}

function getSession(dateKey) {
  return state.sessions[dateKey] || null;
}

function setSession(dateKey, session) {
  state.sessions[dateKey] = session;
  saveState();
}

function deleteSession(dateKey) {
  delete state.sessions[dateKey];
  saveState();
}

function ensureSelectedSession() {
  if (!state.selectedDate) return null;
  const session = normalizeSession(getSession(state.selectedDate), state.selectedDate);
  state.sessions[state.selectedDate] = session;
  return session;
}

function showStatus(message, kind) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = kind ? `status-message ${kind}` : 'status-message';
  setTimeout(() => {
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
  }, 3000);
}

// --- Views ----------------------------------------------------------------

// The session is derived from state.selectedDate; the tabs pick between the
// calendar and the stats screens. Both come through here.
function currentView() {
  if (state.selectedDate) return 'session';
  return state.view === 'stats' ? 'stats' : 'calendar';
}

function renderApp() {
  const view = currentView();

  viewCalendar.classList.toggle('hidden', view !== 'calendar');
  viewSession.classList.toggle('hidden', view !== 'session');
  viewStats.classList.toggle('hidden', view !== 'stats');
  appNav.classList.toggle('hidden', view === 'session');

  document.querySelectorAll('.nav-tab[data-view]').forEach((tab) => {
    const isActive = tab.dataset.view === view;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  if (view === 'calendar') renderCalendar();
  else if (view === 'session') renderSession();
  else if (view === 'stats') renderStats();
}

function showCalendarView() {
  state.selectedDate = null;
  state.view = 'calendar';
  // Re-entering a date later must re-derive the first pending exercise.
  activeExercise = { date: null, name: null };
  renderApp();
}

function renderCalendar() {
  const dates = getProgramDates();
  const rows = [];

  for (let week = 1; week <= PROGRAM_WEEKS; week++) {
    const cells = [];
    dates.filter((date) => weekForDate(date) === week).forEach((date) => {
      const key = toDateKey(date);
      const session = getSession(key);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';

      if (session && session.status === 'done') cell.classList.add('done');
      if (session && session.status === 'skipped') cell.classList.add('skipped');
      if (isSameDay(date, new Date())) cell.classList.add('today');
      if (state.selectedDate === key) cell.classList.add('selected');

      // A stored session is not automatically "Omitida": 'pending' is the default
      // status of a session that only exists because it has a note or a weight.
      const statusLabel = session && session.status !== 'pending'
        ? (session.status === 'done' ? 'Hecha' : 'Omitida')
        : 'Pendiente';

      cell.innerHTML = `
        <strong>${date.getDate()}</strong>
        <small>${statusLabel}</small>
      `;

      cell.addEventListener('click', () => {
        state.selectedDate = key;
        renderApp();
      });
      cells.push(cell);
    });

    const row = document.createElement('tr');
    const weekCell = document.createElement('td');
    weekCell.innerHTML = `<strong>W${week}</strong>`;
    row.appendChild(weekCell);
    cells.forEach((cell) => {
      const td = document.createElement('td');
      td.appendChild(cell);
      row.appendChild(td);
    });
    rows.push(row);
  }

  calendarBody.innerHTML = '';
  rows.forEach((row) => calendarBody.appendChild(row));
  weekBadge.textContent = `Semana ${currentWeek()}`;
  programInfo.textContent =
    `Inicio: ${state.startDate} · Lunes, miércoles y viernes · 25-35 min`;
}

function isSameDay(a, b) {
  return a && b && toDateKey(a) === toDateKey(b);
}

// --- Guided session -------------------------------------------------------

function resolveActiveExercise(session) {
  if (activeExercise.date !== state.selectedDate) {
    const pending = EXERCISES.find((exercise) => !exerciseData(session, exercise).done);
    activeExercise = { date: state.selectedDate, name: pending ? pending.name : null };
  }
  return activeExercise.name;
}

function toggleExerciseCard(name) {
  const session = ensureSelectedSession();
  const current = resolveActiveExercise(session);
  activeExercise = { date: state.selectedDate, name: current === name ? null : name };
  renderSession();
}

function finishExercise(name) {
  const session = ensureSelectedSession();
  if (!session) return;
  const exercise = findExercise(name);
  if (!exercise) return;

  exerciseData(session, exercise).done = true;
  setSession(state.selectedDate, session);

  const next = EXERCISES.find((candidate) => !exerciseData(session, candidate).done);
  activeExercise = { date: state.selectedDate, name: next ? next.name : null };
  renderSession();
}

// Collapsed summary label, e.g. "2 kg · 12/12/10" or "12/12/10" for bodyweight.
function exerciseSummaryLabel(exData, exercise) {
  const parts = [];
  if (getExerciseType(exercise.name) !== 'bodyweight') {
    parts.push(`${exData.weight} kg`);
  }
  const logged = exData.sets.filter((value) => value > 0);
  parts.push(logged.length > 0 ? logged.join('/') : 'Sin cargar');
  return parts.join(' · ');
}

// --- Exercise cards --------------------------------------------------------

function readSetGrid(setGrid) {
  return Array.from(setGrid.querySelectorAll('input')).map((input) => toNumber(input.value));
}

function updateSetButtons(addBtn, removeBtn, count) {
  addBtn.disabled = count >= MAX_SETS;
  removeBtn.disabled = count <= MIN_SETS;
}

function renderExerciseCard(exercise, index, session, activeName) {
  const exData = exerciseData(session, exercise);
  const isActive = exercise.name === activeName;

  const clone = exerciseTemplate.content.cloneNode(true);
  const card = clone.querySelector('.exercise-card');
  card.dataset.index = String(index);
  card.classList.toggle('is-done', Boolean(exData.done));
  card.classList.toggle('is-active', isActive);

  const summary = clone.querySelector('.exercise-summary');
  summary.setAttribute('aria-expanded', String(isActive));
  clone.querySelector('.exercise-name').textContent = exercise.name;
  clone.querySelector('.exercise-badge').textContent = `${exercise.sets} × ${exercise.repsRange}`;
  clone.querySelector('.exercise-summary-meta').textContent = exerciseSummaryLabel(exData, exercise);
  summary.addEventListener('click', () => toggleExerciseCard(exercise.name));

  const body = clone.querySelector('.exercise-body');
  body.classList.toggle('hidden', !isActive);

  // Cómo se hace
  clone.querySelector('.how-technique').textContent = exercise.technique;
  clone.querySelector('.how-works').textContent = exercise.works;
  clone.querySelector('.how-prescription').textContent = prescriptionLabel(exercise);
  clone.querySelector('.how-rest').textContent = exercise.rest;

  // Tipo de carga
  const typeSelect = clone.querySelector('.type-select');
  const typeLabel = clone.querySelector('.type-field-label');
  // Cards are cloned per exercise, so the id has to be unique per index.
  typeSelect.id = `exerciseType-${index}`;
  typeLabel.htmlFor = typeSelect.id;
  typeSelect.value = getExerciseType(exercise.name);
  typeSelect.addEventListener('change', () => {
    setExerciseType(exercise.name, typeSelect.value);
    replaceExerciseCard(index);
    renderExerciseReference();
  });

  // Peso: hidden for bodyweight, relabelled for weighted-extra.
  const type = getExerciseType(exercise.name);
  clone.querySelector('.weight-field').classList.toggle('hidden', type === 'bodyweight');
  clone.querySelector('.weight-label').textContent = type === 'weighted-extra' ? 'Peso extra (kg)' : 'Peso (kg)';
  clone.querySelector('.weight-hint').classList.toggle('hidden', type !== 'weighted-extra');

  const weightInput = clone.querySelector('.weight-input');
  const weightLabel = clone.querySelector('.weight-label');
  weightInput.id = `weight-${index}`;
  weightLabel.htmlFor = weightInput.id;
  weightInput.value = exData.weight;
  weightInput.addEventListener('input', () => {
    const current = ensureSelectedSession();
    if (!current) return;
    exerciseData(current, exercise).weight = toNumber(weightInput.value);
    setSession(state.selectedDate, current);
  });

  const feelInput = clone.querySelector('.feel-input');
  // Cards are cloned per exercise, so the id has to be unique per index.
  feelInput.id = `feel-${index}`;
  clone.querySelector('.feel-field-label').htmlFor = feelInput.id;
  feelInput.value = exData.feel;
  feelInput.addEventListener('input', () => {
    const current = ensureSelectedSession();
    if (!current) return;
    exerciseData(current, exercise).feel = feelInput.value;
    setSession(state.selectedDate, current);
  });

  // Series
  const setGrid = clone.querySelector('.set-grid');
  exData.sets.forEach((value, position) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.inputMode = 'numeric';
    input.value = value;
    input.placeholder = `Serie ${position + 1}`;
    input.setAttribute('aria-label', `Serie ${position + 1}`);
    input.addEventListener('input', () => {
      const current = ensureSelectedSession();
      if (!current) return;
      exerciseData(current, exercise).sets = readSetGrid(setGrid);
      setSession(state.selectedDate, current);
    });
    setGrid.appendChild(input);
  });

  const addBtn = clone.querySelector('.set-add');
  const removeBtn = clone.querySelector('.set-remove');
  addBtn.addEventListener('click', () => changeSetCount(exercise, index, 1));
  removeBtn.addEventListener('click', () => changeSetCount(exercise, index, -1));
  updateSetButtons(addBtn, removeBtn, exData.sets.length);

  // Guided flow: completing an exercise collapses it and opens the next pending.
  clone.querySelector('.exercise-finish').addEventListener('click', () => finishExercise(exercise.name));

  return card;
}

// Only the clicked card is rebuilt: re-rendering on every keystroke would steal
// focus from the input being typed into.
function replaceExerciseCard(index) {
  const existing = exerciseList.querySelector(`.exercise-card[data-index="${index}"]`);
  const exercise = EXERCISES[index];
  if (!existing || !exercise) return;
  const session = ensureSelectedSession();
  existing.replaceWith(renderExerciseCard(exercise, index, session, resolveActiveExercise(session)));
}

// `sets` stays a flat array of numbers on purpose: stored sessions need no
// inner-shape migration when the set count changes.
function changeSetCount(exercise, index, delta) {
  const current = ensureSelectedSession();
  if (!current) return;

  const entry = exerciseData(current, exercise);
  const target = clampSetCount(entry.sets.length + delta);
  if (target === entry.sets.length) return;

  if (target > entry.sets.length) {
    const extra = Array.from({ length: target - entry.sets.length }, () => 0);
    entry.sets = entry.sets.concat(extra);
  } else {
    entry.sets = entry.sets.slice(0, target);
  }

  setSession(state.selectedDate, current);
  replaceExerciseCard(index);
}

function renderLegacyNotice(session) {
  if (!legacyNotice) return;
  const legacy = legacyExerciseNames(session);
  if (legacy.length === 0) {
    legacyNotice.classList.add('hidden');
    legacyNotice.textContent = '';
    return;
  }
  legacyNotice.classList.remove('hidden');
  legacyNotice.textContent =
    `Datos de un programa anterior conservados en esta sesión: ${legacy.join(', ')}.`
    + ' Ya no forman parte de la rutina actual, pero siguen guardados en tu copia de seguridad.';
}

function renderSession() {
  if (!state.selectedDate) return;

  const session = ensureSelectedSession();

  selectedDateLabel.textContent = state.selectedDate;
  selectedWeekLabel.textContent = `Semana ${weekForDate(state.selectedDate)}`;
  noteInput.value = session.note;

  renderLegacyNotice(session);

  const activeName = resolveActiveExercise(session);

  exerciseList.innerHTML = '';
  EXERCISES.forEach((exercise, index) => {
    exerciseList.appendChild(renderExerciseCard(exercise, index, session, activeName));
  });

  // Update button states
  document.querySelectorAll('[data-status]').forEach((button) => {
    button.classList.toggle('active', button.dataset.status === session.status);
  });
}

function updateSelectedSession(status) {
  if (!state.selectedDate) return;

  const current = ensureSelectedSession();

  if (status === 'clear') {
    deleteSession(state.selectedDate);
  } else {
    current.status = status;
    current.note = noteInput.value.trim();
    if (status === 'done') {
      // Marking the whole session done short-circuits the per-exercise flow.
      EXERCISES.forEach((exercise) => {
        exerciseData(current, exercise).done = true;
      });
    }
    setSession(state.selectedDate, current);
  }

  activeExercise = { date: null, name: null };
  renderApp();
}

// --- Exercise reference ----------------------------------------------------

function renderExerciseReference() {
  if (!exerciseReference || !exerciseReferenceTemplate) return;

  exerciseReference.innerHTML = '';
  EXERCISES.forEach((exercise) => {
    const clone = exerciseReferenceTemplate.content.cloneNode(true);
    const type = getExerciseType(exercise.name);

    clone.querySelector('.exercise-name').textContent = exercise.name;
    clone.querySelector('.exercise-badge').textContent = `${exercise.sets} × ${exercise.repsRange}`;
    clone.querySelector('.exercise-meta').textContent = `Tipo: ${EXERCISE_TYPE_LABELS[type]}`;
    clone.querySelector('.how-technique').textContent = exercise.technique;
    clone.querySelector('.how-works').textContent = exercise.works;
    clone.querySelector('.how-prescription').textContent = prescriptionLabel(exercise);
    clone.querySelector('.how-rest').textContent = exercise.rest;

    exerciseReference.appendChild(clone);
  });
}

// --- Statistics -------------------------------------------------------------

function trainingDates() {
  return getProgramDates().map((date) => toDateKey(date)).sort();
}

function currentStreak(elapsed, todayKey) {
  let streak = 0;
  for (let i = elapsed.length - 1; i >= 0; i--) {
    const session = getSession(elapsed[i]);
    if (session && session.status === 'done') {
      streak++;
    } else if (session && session.status === 'skipped') {
      break;
    } else if (elapsed[i] === todayKey) {
      // Today's session is 'pending' simply because it has not arrived yet.
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function renderStats() {
  if (statCumplimiento && statHechas && statRacha && statBarFill && statDetail) {
    const todayKey = toDateKey(new Date());
    const elapsed = trainingDates().filter((key) => key <= todayKey);
    const done = elapsed.filter((key) => getSession(key) && getSession(key).status === 'done');
    const skipped = elapsed.filter((key) => getSession(key) && getSession(key).status === 'skipped');
    const pending = elapsed.filter((key) => !getSession(key) || getSession(key).status === 'pending');
    const pct = elapsed.length ? Math.round((done.length / elapsed.length) * 100) : 0;
    const streak = currentStreak(elapsed, todayKey);

    statCumplimiento.textContent = `${pct}%`;
    statHechas.textContent = `${done.length} / ${elapsed.length}`;
    statRacha.textContent = String(streak);
    statBarFill.style.width = `${pct}%`;
    statBarFill.setAttribute('aria-valuenow', String(pct));
    statDetail.textContent = elapsed.length > 0
      ? `${done.length} hechas · ${skipped.length} omitidas · ${pending.length} pendientes de ${elapsed.length} planificadas.`
      : 'Todavía no hay sesiones planificadas en el programa.';
  }

  renderProgression();
}

// A line per completed session with logged reps: date, weight, total reps.
function exercisePoints(exercise) {
  const points = [];
  trainingDates().forEach((key) => {
    const session = getSession(key);
    if (!session || session.status !== 'done') return;
    const raw = session.exercises && session.exercises[exercise.name];
    if (!isPlainObject(raw) || !Array.isArray(raw.sets)) return;
    const sets = raw.sets.map(toNumber);
    const totalReps = sets.reduce((sum, value) => sum + value, 0);
    if (totalReps <= 0) return;
    points.push({
      key,
      weight: toNumber(raw.weight),
      totalReps,
      maxSet: Math.max(...sets),
    });
  });
  return points;
}

function sparklineSVG(values) {
  if (!Array.isArray(values) || values.length < 2) return '';
  const width = 120;
  const height = 32;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || 1;
  const step = (width - pad * 2) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-hidden="true">`
    + `<polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" `
    + `stroke-linejoin="round" stroke-linecap="round"/>`
    + `</svg>`;
}

function buildProgressionRow(exercise, points) {
  const card = document.createElement('article');
  card.className = 'progression-row';

  const head = document.createElement('div');
  head.className = 'progression-head';

  const name = document.createElement('strong');
  name.className = 'progression-name';
  name.textContent = exercise.name;
  head.appendChild(name);

  if (points.length === 0) {
    const none = document.createElement('span');
    none.className = 'progression-none';
    none.textContent = 'Sin datos todavía';
    head.appendChild(none);
    card.appendChild(head);
    return card;
  }

  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;

  const badge = document.createElement('span');
  badge.className = 'exercise-badge';
  badge.textContent = `${last.totalReps} reps`;
  head.appendChild(badge);
  card.appendChild(head);

  const body = document.createElement('div');
  body.className = 'progression-body';

  const trend = document.createElement('span');
  trend.className = 'progression-trend';
  const type = getExerciseType(exercise.name);
  if (prev && (last.weight !== prev.weight || last.totalReps !== prev.totalReps)) {
    // Weighted exercises move against load first, bodyweight against volume.
    const grew = type !== 'bodyweight' && last.weight !== prev.weight
      ? last.weight > prev.weight
      : last.totalReps > prev.totalReps;
    trend.textContent = grew ? '↑' : '↓';
    trend.classList.add(grew ? 'up' : 'down');
  } else {
    trend.textContent = prev ? '=' : '—';
    trend.classList.add('flat');
  }
  body.appendChild(trend);

  const spark = document.createElement('div');
  spark.className = 'progression-spark';
  spark.innerHTML = sparklineSVG(points.map((point) => point.totalReps));
  body.appendChild(spark);

  const detail = document.createElement('span');
  detail.className = 'progression-detail';
  detail.textContent = type !== 'bodyweight' ? `${last.weight} kg` : `Tu mejor serie: ${last.maxSet}`;
  body.appendChild(detail);

  card.appendChild(body);
  return card;
}

function renderProgression() {
  if (!progressionList) return;
  progressionList.innerHTML = '';
  EXERCISES.forEach((exercise) => {
    progressionList.appendChild(buildProgressionRow(exercise, exercisePoints(exercise)));
  });
}

// --- Start date dialog -----------------------------------------------------

// renderCalendar() only draws the current 12-week window. Sessions logged
// outside the new window stay in localStorage but would become invisible, so
// warn before the user commits to a new start date.
function countSessionsOutsideWindow(startDate) {
  const visible = new Set(getProgramDates(startDate).map(toDateKey));
  return Object.keys(state.sessions).filter((key) => !visible.has(key)).length;
}

function updateStartDateWarning() {
  const value = startDateInput.value;

  if (!parseDateKey(value)) {
    startDateWarning.textContent = 'Elegí una fecha válida.';
    startDateWarning.classList.add('is-invalid');
    return;
  }

  startDateWarning.classList.remove('is-invalid');

  const outside = countSessionsOutsideWindow(value);
  if (outside === 0) {
    startDateWarning.textContent = 'Todas tus sesiones guardadas quedan dentro de la ventana de 12 semanas.';
    return;
  }

  const noun = outside === 1 ? 'sesión guardada' : 'sesiones guardadas';
  const suffix = outside === 1
    ? 'quedaría fuera de la ventana de 12 semanas'
    : 'quedarían fuera de la ventana de 12 semanas';

  startDateWarning.textContent =
    `${outside} ${noun} ${suffix}. No se borran, pero el calendario no las va a mostrar.`;
}

function openStartDateDialog() {
  if (!startDateDialog) return;
  startDateInput.value = state.startDate;
  updateStartDateWarning();
  if (typeof startDateDialog.showModal === 'function') {
    startDateDialog.showModal();
  } else {
    startDateDialog.setAttribute('open', '');
  }
}

function closeStartDateDialog() {
  if (!startDateDialog) return;
  if (typeof startDateDialog.close === 'function') {
    startDateDialog.close();
  } else {
    startDateDialog.removeAttribute('open');
  }
}

function saveStartDate() {
  const value = startDateInput.value;
  if (!parseDateKey(value)) {
    // updateStartDateWarning() switches the message to the invalid state.
    updateStartDateWarning();
    return;
  }

  state.startDate = value;
  saveState();
  closeStartDateDialog();
  renderApp();
  showStatus('✓ Fecha de inicio actualizada', 'success');
}

// --- Backup ----------------------------------------------------------------

function exportData() {
  const blob = new Blob([JSON.stringify({
    startDate: state.startDate,
    sessions: state.sessions,
    exerciseTypes: state.exerciseTypes,
  }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rutina-fuerza-${toDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showStatus('✓ Archivo exportado', 'success');
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let parsed = null;
    try {
      parsed = JSON.parse(String(reader.result));
    } catch {
      showStatus('✗ El archivo no es válido', 'error');
      return;
    }

    if (!applyImportedState(parsed)) {
      showStatus('✗ El archivo no es válido', 'error');
      return;
    }

    saveState();
    state.selectedDate = null;
    state.view = 'calendar';
    renderApp();
    renderExerciseReference();
    showStatus('✓ Datos importados correctamente', 'success');
  };
  reader.readAsText(file);
}

function bindEvents() {
  document.querySelectorAll('.nav-tab[data-view]').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.dataset.view === 'stats') {
        state.selectedDate = null;
        state.view = 'stats';
        renderApp();
      } else {
        showCalendarView();
      }
    });
  });

  const backBtn = document.getElementById('btnVolver');
  if (backBtn) {
    backBtn.addEventListener('click', showCalendarView);
  }

  const todayBtn = document.getElementById('btnHoy');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const today = toDateKey(new Date());
      if (isTrainingDay(today)) {
        state.selectedDate = today;
      } else {
        // Encontrar el próximo día de entrenamiento
        const dates = getProgramDates();
        const nextTraining = dates.find(d => toDateKey(d) >= today);
        if (nextTraining) {
          state.selectedDate = toDateKey(nextTraining);
        }
      }
      renderApp();
    });
  }

  const changeStartBtn = document.getElementById('btnCambiarInicio');
  if (changeStartBtn) {
    changeStartBtn.addEventListener('click', openStartDateDialog);
  }

  const cancelStartBtn = document.getElementById('btnCancelarInicio');
  if (cancelStartBtn) {
    cancelStartBtn.addEventListener('click', closeStartDateDialog);
  }

  // The Save button is type="submit", so a click and Enter both land here.
  if (startDateForm) {
    startDateForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveStartDate();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener('input', updateStartDateWarning);
    startDateInput.addEventListener('change', updateStartDateWarning);
  }

  // Native <dialog> closes on Esc by firing "cancel", which needs no handler.
  // Clicking the backdrop is the one native dialog does not do, so wire it here.
  if (startDateDialog) {
    startDateDialog.addEventListener('click', (event) => {
      if (event.target === startDateDialog) closeStartDateDialog();
    });
  }

  const exportBtn = document.getElementById('btnExport');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }

  importInput.addEventListener('change', (e) => importData(e.target.files?.[0]));

  document.querySelectorAll('[data-status]').forEach((button) => {
    button.addEventListener('click', () => updateSelectedSession(button.dataset.status));
  });

  noteInput.addEventListener('input', () => {
    const current = ensureSelectedSession();
    if (!current) return;
    current.note = noteInput.value;
    setSession(state.selectedDate, current);
  });
}

// Inicializar
loadState();
bindEvents();
renderApp();
renderExerciseReference();