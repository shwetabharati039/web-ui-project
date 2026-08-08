// ═══════════════════════════════════════
// TASKS / TO-DO LIST
// ═══════════════════════════════════════
let taskFilter = 'all';

window.addTask = function() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    if (!text) { showToast('Enter a task first', 'error'); input.focus(); return; }
    const etaVal = document.getElementById('taskEta').value || '';
    const durationVal = parseInt(document.getElementById('taskDuration').value, 10) || 0;
    tasks.unshift({
        id: Date.now().toString(),
        text: text,
        done: false,
        createdAt: new Date().toISOString(),
        dueDate: etaVal ? etaVal.slice(0, 10) : (document.getElementById('taskDueDate').value || ''),
        priority: document.getElementById('taskPriority').value || 'medium',
        duration: durationVal,
        eta: etaVal,
        rating: 100,
        reminderSent: false,
        dangerMode: false,
        lastDangerNotify: 0
    });
    input.value = '';
    document.getElementById('taskDueDate').value = '';
    document.getElementById('taskEta').value = '';
    document.getElementById('taskDuration').value = '';
    saveTasks();
    renderTasks();
    updateTaskBadge();
    if (etaVal) {
        if (Notification.permission === 'default') Notification.requestPermission();
        showToast('Task added — reminder set for its ETA', 'success');
    } else {
        showToast('Task added', 'success');
    }
};

window.handleTaskKeydown = function(e) {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
};

window.toggleTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : '';
    if (task.done) task.dangerMode = false;
    else task.reminderSent = false;
    saveTasks();
    renderTasks();
    updateTaskBadge();
    if (task.done) {
        const etaMs = taskEtaMs(task);
        const rating = task.rating === undefined || task.rating === null ? 100 : task.rating;
        if (etaMs !== null && new Date(task.completedAt).getTime() > etaMs) {
            showToast('Task completed late — rating kept at ' + rating, 'error');
        } else {
            showToast('Task completed on time — rating ' + rating, 'success');
        }
    } else {
        showToast('Task re-opened', 'success');
    }
};

window.deleteTask = function(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    updateTaskBadge();
    showToast('Task deleted', 'success');
};

window.clearCompletedTasks = function() {
    const done = tasks.filter(t => t.done).length;
    if (done === 0) { showToast('No completed tasks', 'error'); return; }
    showModal('Clear Completed Tasks?', 'This will permanently remove ' + done + ' completed task' + (done !== 1 ? 's' : '') + '.', () => {
        tasks = tasks.filter(t => !t.done);
        saveTasks();
        renderTasks();
        updateTaskBadge();
        showToast('Completed tasks cleared', 'success');
    });
};

window.setTaskFilter = function(filter) {
    taskFilter = filter;
    document.querySelectorAll('.task-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.filter === filter);
    });
    renderTasks();
};

function formatTaskDue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(d); due.setHours(0, 0, 0, 0);
    const diff = Math.round((due - today) / 86400000);
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    if (diff === -1) return 'Due yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(ms) {
    if (ms < 60000) return '<1m';
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h >= 24) {
        const d = Math.floor(h / 24);
        const rh = h % 24;
        return d + 'd ' + (rh > 0 ? rh + 'h' : '');
    }
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
}

function taskEtaMs(task) {
    if (!task.eta) return null;
    const ms = new Date(task.eta).getTime();
    return isNaN(ms) ? null : ms;
}

function taskOverdue(task) {
    const ms = taskEtaMs(task);
    return ms !== null && !task.done && Date.now() > ms;
}

function renderTaskEta(task) {
    const ms = taskEtaMs(task);
    if (ms === null) return '';
    const diff = ms - Date.now();
    let cls = 'task-eta', text;
    if (task.done) {
        text = 'ETA ' + formatTime(ms);
    } else if (diff > 0) {
        cls += ' upcoming';
        text = 'ETA ' + formatTime(ms) + ' · in ' + formatDuration(diff);
    } else {
        cls += ' overdue';
        text = 'OVERDUE by ' + formatDuration(-diff) + ' · ETA was ' + formatTime(ms);
    }
    return '<span class="' + cls + '"><i class="fa-regular fa-hourglass-half"></i> ' + text + '</span>';
}

function renderTaskRating(task) {
    const r = task.rating === undefined || task.rating === null ? 100 : task.rating;
    let cls = 'neutral', label = 'No ETA', icon = 'star';
    if (task.eta) {
        const ms = taskEtaMs(task);
        const late = task.done && ms !== null && task.completedAt && new Date(task.completedAt).getTime() > ms;
        if (task.done) {
            if (late) { cls = 'bad'; icon = 'triangle-exclamation'; label = 'Late · Rating ' + r; }
            else { cls = 'good'; icon = 'star'; label = 'On time · Rating ' + r; }
        } else if (taskOverdue(task)) {
            cls = 'bad'; icon = 'triangle-exclamation'; label = 'Rating ' + r;
        } else {
            cls = 'good'; icon = 'star'; label = 'Rating ' + r;
        }
    }
    return '<span class="task-rating ' + cls + '"><i class="fa-solid fa-' + icon + '"></i> ' + label + '</span>';
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    renderDangerBanner();
    const settings = loadTaskReminderSettings();
    const remindInput = document.getElementById('taskRemindBefore');
    const dangerInput = document.getElementById('taskDangerInterval');
    if (document.activeElement !== remindInput) remindInput.value = settings.remindBefore;
    if (document.activeElement !== dangerInput) dangerInput.value = settings.dangerInterval;
    const doneCount = tasks.filter(t => t.done).length;
    const activeCount = tasks.length - doneCount;
    document.getElementById('tasksSubtitle').textContent = tasks.length === 0
        ? 'Plan your day, one task at a time'
        : activeCount + ' active · ' + doneCount + ' completed';

    const summary = document.getElementById('taskSummary');
    if (tasks.length === 0) {
        summary.innerHTML = '';
    } else {
        const pct = Math.round(doneCount / tasks.length * 100);
        summary.innerHTML = '<div class="task-summary-inner"><div class="task-summary-label">' + doneCount + ' of ' + tasks.length + ' done</div><div class="task-progress-track"><div class="task-progress-fill" style="width:' + pct + '%"></div></div><div class="task-summary-pct">' + pct + '%</div></div>';
    }

    let filtered = tasks;
    if (taskFilter === 'active') filtered = tasks.filter(t => !t.done);
    else if (taskFilter === 'done') filtered = tasks.filter(t => t.done);

    filtered = [...filtered].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (da !== db) return da - db;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filtered.length === 0) {
        const msg = tasks.length === 0
            ? '<div class="empty-state"><i class="fa-solid fa-list-check"></i><h3>No tasks yet</h3><p>Add your first task to start planning your day.</p></div>'
            : (taskFilter === 'active'
                ? '<div class="empty-state"><i class="fa-solid fa-circle-check"></i><h3>All done!</h3><p>No active tasks. Enjoy your free time.</p></div>'
                : '<div class="empty-state"><i class="fa-solid fa-list-check"></i><h3>Nothing completed yet</h3><p>Complete a task to see it here.</p></div>');
        container.innerHTML = msg;
        return;
    }

    container.innerHTML = filtered.map(task => {
        const due = task.dueDate ? '<span class="task-meta-item"><i class="fa-regular fa-calendar"></i> ' + formatTaskDue(task.dueDate) + '</span>' : '';
        const eta = renderTaskEta(task);
        const duration = task.duration ? '<span class="task-meta-item"><i class="fa-regular fa-clock"></i> ' + task.duration + 'm</span>' : '';
        const rating = renderTaskRating(task);
        const priority = task.priority && task.priority !== 'medium'
            ? '<span class="task-priority ' + task.priority + '">' + (task.priority === 'high' ? 'High' : 'Low') + '</span>' : '';
        const danger = taskOverdue(task) ? ' danger' : '';
        return '<div class="task-item' + (task.done ? ' done' : '') + danger + '">' +
            '<button class="task-check' + (task.done ? ' checked' : '') + '" onclick="toggleTask(\'' + task.id + '\')" title="' + (task.done ? 'Mark as active' : 'Mark as done') + '">' + (task.done ? '<i class="fa-solid fa-check"></i>' : '') + '</button>' +
            '<div class="task-info">' +
                '<div class="task-text">' + escapeHtml(task.text) + '</div>' +
                '<div class="task-meta">' + priority + due + eta + duration + rating + '</div>' +
            '</div>' +
            '<button class="task-delete" onclick="deleteTask(\'' + task.id + '\')" title="Delete task"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>';
    }).join('');
}

function updateTaskBadge() {
    const badge = document.getElementById('taskBadge');
    const overdue = tasks.filter(taskOverdue).length;
    const count = overdue > 0 ? overdue : tasks.filter(t => !t.done).length;
    if (count > 0) {
        badge.style.display = 'inline';
        badge.textContent = overdue > 0 ? count + '!' : count;
        badge.classList.toggle('danger', overdue > 0);
    } else {
        badge.style.display = 'none';
        badge.classList.remove('danger');
    }
}

// ═══════════════════════════════════════
// TASK ETA REMINDERS / DANGER ALERTS
// ═══════════════════════════════════════
let taskReminderInterval = null;

function loadTaskReminderSettings() {
    try {
        const s = JSON.parse(localStorage.getItem(TASK_REMINDER_KEY));
        return { remindBefore: 15, dangerInterval: 5, ...(s || {}) };
    } catch { return { remindBefore: 15, dangerInterval: 5 }; }
}

function saveTaskReminderSettings(s) { localStorage.setItem(TASK_REMINDER_KEY, JSON.stringify(s)); }

window.updateTaskRemindBefore = function() {
    const s = loadTaskReminderSettings();
    s.remindBefore = Math.max(1, Math.min(120, parseInt(document.getElementById('taskRemindBefore').value, 10) || 15));
    saveTaskReminderSettings(s);
    showToast('Reminder fires ' + s.remindBefore + ' min before ETA', 'success');
};

window.updateTaskDangerInterval = function() {
    const s = loadTaskReminderSettings();
    s.dangerInterval = Math.max(1, Math.min(60, parseInt(document.getElementById('taskDangerInterval').value, 10) || 5));
    saveTaskReminderSettings(s);
    showToast('Danger alerts every ' + s.dangerInterval + ' min', 'success');
};

function taskRatingOf(task) {
    return task.rating === undefined || task.rating === null ? 100 : task.rating;
}

function notifyTask(title, body) {
    if (Notification.permission === 'granted') {
        try { new Notification(title, { body: body }); } catch (e) {}
    }
    showToast(body, 'error');
}

function renderDangerBanner() {
    const banner = document.getElementById('taskDangerBanner');
    const overdue = tasks.filter(t => !t.done && taskOverdue(t));
    if (overdue.length === 0) {
        banner.style.display = 'none';
        banner.innerHTML = '';
        return;
    }
    const worst = overdue.reduce((a, b) => taskRatingOf(a) < taskRatingOf(b) ? a : b);
    banner.style.display = 'flex';
    banner.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><div><strong>' + overdue.length + ' overdue task' + (overdue.length > 1 ? 's' : '') + '</strong> — highest risk: “' + escapeHtml(worst.text) + '” (rating ' + taskRatingOf(worst) + '). Finish it before the rating drops further.</div>';
}

function checkTaskReminders() {
    const settings = loadTaskReminderSettings();
    const now = Date.now();
    let changed = false;
    tasks.forEach(task => {
        if (task.done) return;
        const etaMs = taskEtaMs(task);
        if (etaMs === null) return;
        const leadMs = settings.remindBefore * 60000;
        if (!task.reminderSent && now >= etaMs - leadMs && now < etaMs) {
            task.reminderSent = true;
            changed = true;
            notifyTask('Index — Due soon', '“' + task.text + '” is due at ' + formatTime(etaMs) + '.');
        }
        if (now > etaMs) {
            const intervalMs = settings.dangerInterval * 60000;
            if (!task.lastDangerNotify || now - task.lastDangerNotify >= intervalMs) {
                task.lastDangerNotify = now;
                changed = true;
                const elapsedIntervals = Math.max(1, Math.floor((now - etaMs) / intervalMs));
                task.rating = Math.max(0, 100 - elapsedIntervals * 5);
                notifyTask('Index — OVERDUE', '“' + task.text + '” is overdue — rating dropped to ' + task.rating + '. Get it done!');
            }
        }
    });
    if (changed) {
        saveTasks();
        renderTasks();
        updateTaskBadge();
    }
}

function startTaskReminderCheck() {
    if (taskReminderInterval) clearInterval(taskReminderInterval);
    checkTaskReminders();
    taskReminderInterval = setInterval(checkTaskReminders, 30000);
}

