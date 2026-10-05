const STORAGE_KEY = 'rutinaFuerzaData';

const weekFocus = {
  1: ['Sentadilla', 'Press banca', 'Peso muerto'],
  2: ['Sentadilla', 'Press militar', 'Remo'],
  3: ['Sentadilla', 'Press banca', 'Peso muerto'],
  4: ['Sentadilla', 'Press incline', 'Dominadas'],
  5: ['Sentadilla profunda', 'Press banca', 'Peso muerto'],
  6: ['Sentadilla', 'Press militar', 'Remo'],
  7: ['Sentadilla', 'Press banca', 'Peso muerto'],
  8: ['Sentadilla', 'Press incline', 'Dominadas'],
  9: ['Sentadilla', 'Press banca', 'Peso muerto'],
  10: ['Sentadilla', 'Press militar', 'Remo'],
  11: ['Sentadilla', 'Press banca', 'Peso muerto'],
  12: ['Prueba de fuerza', 'Ajustes finales', 'Recuperación activa']
};

const defaultState = {
  entries: []
};

const form = document.getElementById('entry-form');
const weekInput = document.getElementById('week');
const dayInput = document.getElementById('day');
const exerciseInput = document.getElementById('exercise');
const setsInput = document.getElementById('sets');
const repsInput = document.getElementById('reps');
const weightInput = document.getElementById('weight');
const rpeInput = document.getElementById('rpe');
const notesInput = document.getElementById('notes');

const entriesBody = document.getElementById('entries-body');
const weeksGrid = document.getElementById('weeks-grid');
const statSessions = document.getElementById('stat-sessions');
const statVolume = document.getElementById('stat-volume');
const statCurrentWeek = document.getElementById('stat-current-week');
const statLastDate = document.getElementById('stat-last-date');

const importBtn = document.getElementById('import-data');
const exportBtn = document.getElementById('export-data');
const fileInput = document.getElementById('file-input');
const resetBtn = document.getElementById('reset-data');

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || !Array.isArray(saved.entries)) {
      return { ...defaultState };
    }
    return saved;
  } catch (error) {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getCurrentWeek() {
  const selected = Number(weekInput.value || 1);
  return Math.min(12, Math.max(1, selected));
}

function getVolume(entry) {
  return Number(entry.sets || 0) * Number(entry.reps || 0) * Number(entry.weight || 0);
}

function renderWeeks() {
  const cards = Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    const focusList = weekFocus[weekNumber] || ['Foco general'];

    return `
      <div class="week-card">
        <h3>Semana ${weekNumber}</h3>
        <ul>
          ${focusList.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  });

  weeksGrid.innerHTML = cards.join('');
}

function renderStats() {
  const entries = sortEntries(state.entries);
  const totalVolume = entries.reduce((sum, entry) => sum + getVolume(entry), 0);
  const lastEntry = entries[0];

  statSessions.textContent = String(entries.length);
  statVolume.textContent = `${Math.round(totalVolume)} kg`;
  statCurrentWeek.textContent = String(getCurrentWeek());
  statLastDate.textContent = lastEntry ? new Date(lastEntry.date).toLocaleDateString('es-AR') : '-';
}

function renderEntries() {
  const entries = sortEntries(state.entries);

  if (entries.length === 0) {
    entriesBody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">Todavía no hay registros. Agregá tu primer entrenamiento.</td>
      </tr>
    `;
    return;
  }

  entriesBody.innerHTML = entries
    .map(
      entry => `
        <tr>
          <td>${new Date(entry.date).toLocaleDateString('es-AR')}</td>
          <td>${entry.week}</td>
          <td>${entry.day}</td>
          <td>${entry.exercise}</td>
          <td>${entry.sets}</td>
          <td>${entry.reps}</td>
          <td>${entry.weight} kg</td>
          <td>${entry.rpe}</td>
          <td>${entry.notes || '-'}</td>
          <td class="cell-action">
            <button class="delete-btn" data-id="${entry.id}" type="button">Eliminar</button>
          </td>
        </tr>
      `
    )
    .join('');
}

function render() {
  renderWeeks();
  renderStats();
  renderEntries();
}

function createEntry(data) {
  return {
    id: crypto.randomUUID(),
    ...data,
    date: new Date().toISOString()
  };
}

form.addEventListener('submit', event => {
  event.preventDefault();

  const payload = {
    week: Number(weekInput.value),
    day: dayInput.value,
    exercise: exerciseInput.value.trim(),
    sets: Number(setsInput.value),
    reps: Number(repsInput.value),
    weight: Number(weightInput.value),
    rpe: Number(rpeInput.value),
    notes: notesInput.value.trim()
  };

  if (!payload.exercise || !payload.day) {
    return;
  }

  const entry = createEntry(payload);
  state.entries.push(entry);
  saveState();
  form.reset();
  weekInput.value = String(getCurrentWeek());
  setsInput.value = '4';
  repsInput.value = '8';
  weightInput.value = '0';
  rpeInput.value = '8';
  render();
});

entriesBody.addEventListener('click', event => {
  const button = event.target.closest('.delete-btn');
  if (!button) return;

  const { id } = button.dataset;
  state.entries = state.entries.filter(entry => entry.id !== id);
  saveState();
  render();
});

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rutina-fuerza-backup.json';
  link.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', event => {
  const [file] = event.target.files || [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result));
      if (!imported || !Array.isArray(imported.entries)) {
        alert('El archivo JSON no tiene el formato esperado.');
        return;
      }

      state = imported;
      saveState();
      render();
    } catch (error) {
      alert('No se pudo importar el archivo JSON.');
    } finally {
      fileInput.value = '';
    }
  };

  reader.readAsText(file);
});

resetBtn.addEventListener('click', () => {
  const shouldReset = window.confirm('¿Seguro que querés borrar todos los registros?');
  if (!shouldReset) return;

  state = { entries: [] };
  saveState();
  render();
});

weekInput.addEventListener('change', () => {
  statCurrentWeek.textContent = String(getCurrentWeek());
});

render();
