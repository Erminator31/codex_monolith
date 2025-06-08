// Hilfsfunktion zur Generierung von UUID v4
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Zugriff auf DOM-Elemente
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const doneList = document.getElementById('doneList');
const prioritySelect = document.getElementById('prioritySelect');
const themeToggle = document.getElementById('themeToggle');
const sortSelect = document.getElementById('sortSelect');
const tasksSection = document.getElementById('tasksSection');
const doneSection = document.getElementById('doneSection');
const taskTemplate = document.getElementById('taskItemTemplate');

let tasks = loadTasks();

// Anwendung initialisieren
initTheme();
render();
window.addEventListener('hashchange', render);
if (sortSelect) sortSelect.addEventListener('change', render);

// Eingabe überwachen
taskInput.addEventListener('input', () => {
    addTaskBtn.disabled = taskInput.value.trim().length === 0;
});

// Aufgabe hinzufügen
addTaskBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    if (!text) return;
    const newTask = {
        id: uuidv4(),
        text,
        priority: prioritySelect.value,
        createdAt: new Date().toISOString(),
        doneAt: null,
        isDone: false,
        order: tasks.filter(t => !t.isDone).length
    };
    tasks.push(newTask);
    saveTasks();
    taskInput.value = '';
    addTaskBtn.disabled = true;
    render();
});

// Theme wechseln
themeToggle.addEventListener('click', () => {
    const current = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = current;
    localStorage.setItem('todoTheme', current);
});

// Aufgaben aus localStorage laden
function loadTasks() {
    try {
        return JSON.parse(localStorage.getItem('todoTasks')) || [];
    } catch (e) {
        return [];
    }
}

// Aufgaben speichern
function saveTasks() {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

// Theme initialisieren
function initTheme() {
    const saved = localStorage.getItem('todoTheme') || 'light';
    document.body.dataset.theme = saved;
}

// Rendering der aktuellen Ansicht
function render() {
    const hash = location.hash;
    if (hash === '#/done') {
        tasksSection.hidden = true;
        doneSection.hidden = false;
        renderDone();
    } else {
        tasksSection.hidden = false;
        doneSection.hidden = true;
        renderOpen();
    }
}

// Offene Aufgaben sortiert nach order anzeigen
function renderOpen() {
    taskList.innerHTML = '';
    let openTasks = tasks.filter(t => !t.isDone);
    if (sortSelect && sortSelect.value === 'priority') {
        const prioMap = { high: 1, medium: 2, low: 3 };
        openTasks.sort((a, b) => prioMap[a.priority] - prioMap[b.priority]);
    } else {
        openTasks.sort((a, b) => a.order - b.order);
    }
    openTasks.forEach(task => taskList.appendChild(createTaskItem(task)));
}

// Erledigte Aufgaben nach doneAt absteigend anzeigen
function renderDone() {
    doneList.innerHTML = '';
    const doneTasks = tasks.filter(t => t.isDone).sort((a, b) => new Date(b.doneAt) - new Date(a.doneAt));
    doneTasks.forEach(task => doneList.appendChild(createTaskItem(task, true)));
}

// Ein Task-Listeneintrag erstellen
function createTaskItem(task, isDoneView = false) {
    const li = taskTemplate.content.firstElementChild.cloneNode(true);
    const label = li.querySelector('label');
    const textSpan = label.querySelector('.task-text');
    const checkbox = label.querySelector('.done-checkbox');
    const badge = li.querySelector('.badge');
    const timestamps = li.querySelector('.timestamps');
    const restoreBtn = li.querySelector('.restore-btn');

    li.dataset.id = task.id;
    checkbox.dataset.id = task.id;

    textSpan.textContent = task.text;
    badge.textContent = task.priority;
    badge.classList.add(task.priority);
    checkbox.checked = task.isDone;
    timestamps.textContent = `erstellt: ${new Date(task.createdAt).toLocaleString()}`;

    if (task.isDone) {
        timestamps.textContent += `, erledigt: ${new Date(task.doneAt).toLocaleString()}`;
        restoreBtn.hidden = false;
        checkbox.style.display = 'none';
    }

    // Checkbox Handler
    checkbox.addEventListener('change', () => {
        task.isDone = checkbox.checked;
        if (task.isDone) {
            task.doneAt = new Date().toISOString();
        } else {
            task.doneAt = null;
        }
        saveTasks();
        render();
    });

    // Restore Button
    restoreBtn.addEventListener('click', () => {
        task.isDone = false;
        task.doneAt = null;
        task.order = tasks.filter(t => !t.isDone).length;
        saveTasks();
        render();
    });

    // Inline Editing
    textSpan.addEventListener('click', e => e.preventDefault());
    textSpan.addEventListener('dblclick', e => {
        e.preventDefault();
        startEdit(textSpan, task);
    });

    // Drag & Drop nur in offener Ansicht
    if (!task.isDone) {
        li.addEventListener('dragstart', e => {
            li.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
        });
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
    } else {
        li.draggable = false;
    }

    if (isDoneView) {
        li.appendChild(restoreBtn);
    }
    return li;
}

// Inline Edit starten
function startEdit(span, task) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.maxLength = 200;
    span.replaceWith(input);
    input.focus();

    function cancel() {
        input.replaceWith(span);
    }

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            task.text = input.value.trim();
            saveTasks();
            span.textContent = task.text;
            input.replaceWith(span);
        } else if (e.key === 'Escape') {
            cancel();
        }
    });
}

// Drag & Drop Logik
let dragOverId = null;
taskList.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = document.querySelector('.dragging');
    const afterElement = getDragAfterElement(e.clientY);
    if (afterElement == null) {
        taskList.appendChild(dragging);
    } else {
        taskList.insertBefore(dragging, afterElement);
    }
});

taskList.addEventListener('drop', e => {
    e.preventDefault();
});

function getDragAfterElement(y) {
    const elements = [...taskList.querySelectorAll('.task-item:not(.dragging)')];
    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Speichern der neuen Reihenfolge bei Drag & Drop Ende
taskList.addEventListener('dragend', () => {
    Array.from(taskList.children).forEach((li, index) => {
        const id = li.dataset.id;
        const task = tasks.find(t => t.id === id);
        if (task) task.order = index;
    });
    saveTasks();
});
