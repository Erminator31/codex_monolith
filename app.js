// app.js - einfache Todo SPA

// Hilfsfunktion für UUID (einfache Version)
function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
}

// Laden/Speichern aus localStorage
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem('todoTasks')) || [];
  } catch (e) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

let tasks = loadTasks();

const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const prioritySelect = document.getElementById('prioritySelect');
const taskList = document.getElementById('taskList');
const doneList = document.getElementById('doneList');
const sortSelect = document.getElementById('sortSelect');
const themeToggle = document.getElementById('themeToggle');
const openView = document.getElementById('openView');
const doneView = document.getElementById('doneView');

// THEME -----------------------------------------------------------
function applyTheme(t) {
  document.body.setAttribute('data-theme', t);
}

function loadTheme() {
  const stored = localStorage.getItem('todoTheme');
  return stored || 'light';
}

let currentTheme = loadTheme();
applyTheme(currentTheme);

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('todoTheme', currentTheme);
  applyTheme(currentTheme);
});

// INPUT Handling --------------------------------------------------
function updateAddBtn() {
  addTaskBtn.disabled = taskInput.value.trim().length === 0;
}

updateAddBtn();

taskInput.addEventListener('input', updateAddBtn);

// Sortier-Handler
sortSelect.addEventListener('change', () => {
  // Bei Auswahl nach Priorität sortieren wir sofort High->Medium->Low
  if (sortSelect.value === 'priority') {
    const weight = { high: 0, medium: 1, low: 2 };
    const openTasks = tasks.filter(t => !t.isDone);
    openTasks.sort((a, b) => weight[a.priority] - weight[b.priority]);
    // Reihenfolge für Persistenz aktualisieren
    openTasks.forEach((t, idx) => {
      t.order = idx;
    });
    saveTasks();
  }
  render();
});

addTaskBtn.addEventListener('click', () => {
  const text = taskInput.value.trim();
  if (!text) return;
  const task = {
    id: uuid(),
    text,
    priority: prioritySelect.value,
    createdAt: new Date().toISOString(),
    doneAt: null,
    isDone: false,
    order: tasks.filter(t => !t.isDone).length
  };
  tasks.push(task);
  saveTasks();
  taskInput.value = '';
  updateAddBtn();
  render();
});

// RENDER ---------------------------------------------------------
function render() {
  const hash = location.hash || '#/';
  const showDone = hash === '#/done';
  openView.hidden = showDone;
  doneView.hidden = !showDone;

  if (showDone) {
    renderDone();
  } else {
    renderOpen();
  }
}

function sortOpen(list) {
  const mode = sortSelect.value;
  if (mode === 'priority') {
    const weight = {high:0, medium:1, low:2};
    list.sort((a,b) => weight[a.priority] - weight[b.priority]);
  } else if (mode === 'created') {
    list.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else {
    list.sort((a,b) => a.order - b.order);
  }
}

function renderOpen() {
  const openTasks = tasks.filter(t => !t.isDone);
  sortOpen(openTasks);
  taskList.innerHTML = '';
  for (const t of openTasks) {
    const li = document.createElement('li');
    li.dataset.id = t.id;
    li.draggable = true;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => toggleDone(t.id, cb.checked));

    const badge = document.createElement('span');
    badge.className = 'badge ' + t.priority;
    badge.textContent = t.priority;

    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = t.text;
    textSpan.addEventListener('dblclick', () => startEdit(t.id, textSpan));

    li.append(cb, badge, textSpan);
    taskList.append(li);
  }
}

function renderDone() {
  const doneTasks = tasks.filter(t => t.isDone)
    .sort((a,b) => new Date(b.doneAt) - new Date(a.doneAt));
  doneList.innerHTML = '';
  for (const t of doneTasks) {
    const li = document.createElement('li');
    li.dataset.id = t.id;

    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = t.text;

    const times = document.createElement('span');
    times.className = 'timestamps';
    times.textContent = `erstellt ${new Date(t.createdAt).toLocaleString()} | erledigt ${new Date(t.doneAt).toLocaleString()}`;

    const btn = document.createElement('button');
    btn.textContent = 'Wiederherstellen';
    btn.addEventListener('click', () => restoreTask(t.id));

    li.append(textSpan, times, btn);
    doneList.append(li);
  }
}

render();

window.addEventListener('hashchange', render);

// TOGGLE DONE ----------------------------------------------------
function toggleDone(id, checked) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.isDone = checked;
  t.doneAt = checked ? new Date().toISOString() : null;
  saveTasks();
  render();
}

function restoreTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.isDone = false;
  t.doneAt = null;
  // set order to end of open list
  t.order = tasks.filter(tt => !tt.isDone && tt.id !== id).length;
  saveTasks();
  render();
}

// DRAG AND DROP --------------------------------------------------
let dragged;

taskList.addEventListener('dragstart', e => {
  const li = e.target.closest('li');
  if (!li) return;
  dragged = li;
  li.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});

taskList.addEventListener('dragover', e => {
  e.preventDefault();
  const li = e.target.closest('li');
  if (!li || li === dragged) return;
  const rect = li.getBoundingClientRect();
  const after = e.clientY > rect.top + rect.height/2;
  if (after) {
    li.after(dragged);
  } else {
    li.before(dragged);
  }
});

taskList.addEventListener('drop', e => {
  e.preventDefault();
});

taskList.addEventListener('dragend', () => {
  if (!dragged) return;
  dragged.classList.remove('dragging');
  const ids = Array.from(taskList.children).map(li => li.dataset.id);
  ids.forEach((id, idx) => {
    const t = tasks.find(x => x.id === id);
    if (t) t.order = idx;
  });
  dragged = null;
  saveTasks();
});

// INLINE EDIT ----------------------------------------------------
function startEdit(id, span) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = t.text;
  span.replaceWith(input);
  input.focus();

  function cancel() {
    input.replaceWith(span);
  }

  function save() {
    t.text = input.value.trim();
    span.textContent = t.text;
    input.replaceWith(span);
    saveTasks();
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      save();
    } else if (e.key === 'Escape') {
      cancel();
    }
  });
}
