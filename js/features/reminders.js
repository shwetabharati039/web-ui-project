// ═══════════════════════════════════════
// DAILY WRITING REMINDERS
// ═══════════════════════════════════════
import { REMINDER_KEY } from '../core/constants.js';
import { showToast } from '../ui/toast.js';

let reminderInterval = null;
let lastReminderFired = '';

export function loadReminder() {
    try {
        const r = JSON.parse(localStorage.getItem(REMINDER_KEY));
        return r || { enabled: false, time: '20:00', message: 'Time to write!' };
    } catch {
        return { enabled: false, time: '20:00', message: 'Time to write!' };
    }
}

export function saveReminder(r) {
    try {
        localStorage.setItem(REMINDER_KEY, JSON.stringify(r));
    } catch {}
}

function reminderTimeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export function checkReminder() {
    const reminder = loadReminder();
    if (!reminder.enabled) return;
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const targetMin = reminderTimeToMinutes(reminder.time);
    const todayKey = now.toDateString();

    if (currentMin === targetMin && lastReminderFired !== todayKey) {
        lastReminderFired = todayKey;
        if (Notification.permission === 'granted') {
            new Notification('Index — Daily Reminder', {
                body: reminder.message || 'Time to write!',
                icon: '📖'
            });
        }
    }
}

export function startReminderCheck() {
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(checkReminder, 30000);
}

export function toggleReminderPanel() {
    const panel = document.getElementById('reminderPanel');
    if (!panel) return;
    const isOpen = panel.classList.toggle('show');
    if (isOpen) panel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function toggleReminder() {
    const reminder = loadReminder();
    if (!reminder.enabled) {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    reminder.enabled = true;
                    saveReminder(reminder);
                    startReminderCheck();
                    showToast('Reminders enabled', 'success');
                    renderReminderUI();
                } else {
                    showToast('Notification permission denied', 'error');
                }
            });
            return;
        }
    }
    reminder.enabled = !reminder.enabled;
    saveReminder(reminder);
    if (reminder.enabled) {
        startReminderCheck();
        showToast('Reminders enabled', 'success');
    } else {
        showToast('Reminders disabled', 'success');
    }
    renderReminderUI();
}

export function updateReminderTime() {
    const reminder = loadReminder();
    const timeInput = document.getElementById('reminderTime');
    if (timeInput) reminder.time = timeInput.value || '20:00';
    saveReminder(reminder);
}

export function updateReminderMessage() {
    const reminder = loadReminder();
    const msgInput = document.getElementById('reminderMessage');
    if (msgInput) reminder.message = msgInput.value || 'Time to write!';
    saveReminder(reminder);
}

export function renderReminderUI() {
    const reminder = loadReminder();
    const sw = document.getElementById('reminderSwitch');
    const timeInput = document.getElementById('reminderTime');
    const msgInput = document.getElementById('reminderMessage');
    const statusEl = document.getElementById('reminderStatus');

    if (timeInput) timeInput.value = reminder.time || '20:00';
    if (msgInput) msgInput.value = reminder.message || 'Time to write!';

    if (sw && statusEl) {
        if (reminder.enabled) {
            sw.classList.add('active');
            statusEl.innerHTML = '<div class="reminder-dot"></div><span>Active — daily at ' + reminder.time + '</span>';
        } else {
            sw.classList.remove('active');
            statusEl.innerHTML = '<div class="reminder-dot inactive"></div><span>Off — click to enable</span>';
        }
    }
}

