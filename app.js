const STORAGE_KEY = 'rutina-fuerza:v1';
const PROGRAM_WEEKS = 12;
const TRAINING_DAYS = [1, 3, 5];
const DEFAULT_START = '2026-01-05';

const state = {
  startDate: DEFAULT_START,
  selectedDate: null,
  sessions: {},
};

const calendarBody = document.getElementById('calendarBody');
const weekBadge = document.getElementById('weekBadge');
const sessionInfo = document.getElementById('sessionMessage');
const sessionForm = document.getElementById('sessionForm');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const selectedWeekLabel = document.getElementById('selectedWeekLabel');
const statusMessage = document.getElementById('statusMessage');

const exerciseTemplate = document.getElementById('exerciseTemplate');
const exerciseList = document.getElementById('exerciseList');
const noteInput = document.getElementById('noteInput');
const importInput = document.getElementById('importInput');
const programInfo = document.getElementById('programInfo');

// Configuración de ejercicios
const EXERCISES = [
  { name: 'Sentadilla', reps: '3x5', notes: 'Peso principal' },
  { name: 'Press de banca', reps: '3x5', notes: 'Peso principal' },
  { name: 'Peso muerto', reps: '1x5', notes: 'Peso principal' },
  { name: 'Press militar', reps: '3x5', notes: 'Accesorio' },
  { name: 'Deadlift rows', reps: '3x5', notes: 'Accesorio' },
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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state.sessions = {};
      return;
    }
    const parsed = JSON.parse(raw);
    state.startDate = parsed.startDate || DEFAULT_START;
    state.sessions = parsed.sessions || {};
  } catch {
    state.sessions = {};
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    startDate: state.startDate,
    sessions: state.sessions,
  }));
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

      cell.innerHTML = `
        <strong>${date.getDate()}</strong>
        <small>${session ? (session.status === 'done' ? 'Hecha' : 'Omitida') : 'Pendiente'}</small>
      `;

      cell.addEventListener('click', () => {
        state.selectedDate = key;
        renderCalendar();
        renderSession();
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
  programInfo.textContent = `Inicio: ${state.startDate}`;
}

function currentWeek() {
  return weekForDate(new Date());
}

function renderSession() {
  if (!state.selectedDate) {
    sessionInfo.classList.remove('hidden');
    sessionForm.classList.add('hidden');
    sessionInfo.textContent = 'Seleccioná una fecha del calendario.';
    return;
  }

  const session = getSession(state.selectedDate) || {
    date: state.selectedDate,
    status: 'pending',
    exercises: EXERCISES.map(() => ({ weight: 0, sets: [0, 0, 0], feel: '' })),
    note: '',
  };

  sessionInfo.classList.add('hidden');
  sessionForm.classList.remove('hidden');
  selectedDateLabel.textContent = state.selectedDate;
  selectedWeekLabel.textContent = `Semana ${weekForDate(state.selectedDate)}`;
  noteInput.value = session.note || '';

  // Renderizar ejercicios
  exerciseList.innerHTML = '';
  EXERCISES.forEach((ex, index) => {
    const exData = session.exercises?.[index] || { weight: 0, sets: [0, 0, 0], feel: '' };
    const clone = exerciseTemplate.content.cloneNode(true);
    
    clone.querySelector('.exercise-name').textContent = ex.name;
    clone.querySelector('.exercise-badge').textContent = ex.reps;
    clone.querySelector('.exercise-meta').textContent = ex.notes;
    
    const weightInput = clone.querySelector('.weight-input');
    weightInput.value = exData.weight || 0;
    weightInput.addEventListener('input', () => {
      if (!state.selectedDate) return;
      const current = getSession(state.selectedDate) || { exercises: EXERCISES.map(() => ({ weight: 0, sets: [0, 0, 0], feel: '' })), note: '' };
      current.exercises[index].weight = Number(weightInput.value || 0);
      setSession(state.selectedDate, { ...current, date: state.selectedDate, status: current.status || 'pending' });
    });
    
    const feelInput = clone.querySelector('.feel-input');
    feelInput.value = exData.feel || '';
    feelInput.addEventListener('input', () => {
      if (!state.selectedDate) return;
      const current = getSession(state.selectedDate) || { exercises: EXERCISES.map(() => ({ weight: 0, sets: [0, 0, 0], feel: '' })), note: '' };
      current.exercises[index].feel = feelInput.value;
      setSession(state.selectedDate, { ...current, date: state.selectedDate, status: current.status || 'pending' });
    });
    
    const setGrid = clone.querySelector('.set-grid');
    setGrid.innerHTML = '';
    for (let s = 0; s < 3; s++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.value = exData.sets?.[s] || 0;
      input.placeholder = `Serie ${s + 1}`;
      input.addEventListener('input', () => {
        if (!state.selectedDate) return;
        const current = getSession(state.selectedDate) || { exercises: EXERCISES.map(() => ({ weight: 0, sets: [0, 0, 0], feel: '' })), note: '' };
        current.exercises[index].sets = Array.from(setGrid.querySelectorAll('input')).map(inp => Number(inp.value || 0));
        setSession(state.selectedDate, { ...current, date: state.selectedDate, status: current.status || 'pending' });
      });
      setGrid.appendChild(input);
    }
    
    exerciseList.appendChild(clone);
  });

  // Update button states
  document.querySelectorAll('[data-status]').forEach((button) => {
    button.classList.remove('active');
    if (button.dataset.status === session.status) {
      button.classList.add('active');
    }
  });
}

function isSameDay(a, b) {
  return a && b && toDateKey(a) === toDateKey(b);
}

function updateSelectedSession(status) {
  if (!state.selectedDate) return;

  const current = getSession(state.selectedDate) || {
    date: state.selectedDate,
    status: 'pending',
    exercises: EXERCISES.map(() => ({ weight: 0, sets: [0, 0, 0], feel: '' })),
    note: '',
  };

  if (status === 'clear') {
    deleteSession(state.selectedDate);
  } else {
    current.status = status;
    current.note = noteInput.value.trim();
    setSession(state.selectedDate, current);
  }

  renderCalendar();
  renderSession();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ startDate: state.startDate, sessions: state.sessions }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rutina-fuerza-${toDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  statusMessage.textContent = '✓ Archivo exportado';
  statusMessage.className = 'status-message success';
  setTimeout(() => { statusMessage.textContent = ''; statusMessage.className = 'status-message'; }, 3000);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || typeof parsed !== 'object') throw new Error('JSON invalido');
      state.startDate = parsed.startDate || DEFAULT_START;
      state.sessions = parsed.sessions || {};
      saveState();
      renderCalendar();
      state.selectedDate = null;
      renderSession();
      statusMessage.textContent = '✓ Datos importados correctamente';
      statusMessage.className = 'status-message success';
      setTimeout(() => { statusMessage.textContent = ''; statusMessage.className = 'status-message'; }, 3000);
    } catch {
      statusMessage.textContent = '✗ El archivo no es válido';
      statusMessage.className = 'status-message error';
      setTimeout(() => { statusMessage.textContent = ''; statusMessage.className = 'status-message'; }, 3000);
    }
  };
  reader.readAsText(file);
}

function bindEvents() {
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
      renderCalendar();
      renderSession();
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
    if (!state.selectedDate) return;
    const current = getSession(state.selectedDate) || { exercises: EXERCISES.map(() => ({ weight: 0, sets: [0, 0, 0], feel: '' })), note: '' };
    current.note = noteInput.value;
    setSession(state.selectedDate, { ...current, date: state.selectedDate, status: current.status || 'pending' });
  });
}

// Inicializar
loadState();
bindEvents();
renderCalendar();
renderSession();