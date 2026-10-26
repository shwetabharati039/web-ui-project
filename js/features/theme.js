// ═══════════════════════════════════════
// THEME & AUTO SCHEDULE
// ═══════════════════════════════════════
import { THEME_KEY, SCHEDULE_KEY } from '../core/constants.js';
import { showToast } from '../ui/toast.js';

let autoScheduleInterval = null;

function loadSchedule() {
    try {
        const s = JSON.parse(localStorage.getItem(SCHEDULE_KEY));
        return s || { enabled: false, lightTime: '07:00', darkTime: '19:00' };
    } catch {
        return { enabled: false, lightTime: '07:00', darkTime: '19:00' };
    }
}

function saveSchedule(s) {
    try {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s));
    } catch {}
}

function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function isDarkTime(schedule) {
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const darkStart = timeToMinutes(schedule.darkTime);
    const lightStart = timeToMinutes(schedule.lightTime);
    if (darkStart > lightStart) {
        return current >= darkStart || current < lightStart;
    } else {
        return current >= darkStart && current < lightStart;
    }
}

function applyAutoTheme() {
    const schedule = loadSchedule();
    const shouldBeDark = isDarkTime(schedule);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (shouldBeDark !== isDark) {
        document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
        const icon = document.getElementById('themeIcon');
        const label = document.getElementById('themeLabel');
        if (icon) icon.className = shouldBeDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        if (label) label.textContent = shouldBeDark ? 'Light Mode' : 'Dark Mode';
        try { localStorage.setItem(THEME_KEY, shouldBeDark ? 'dark' : 'light'); } catch {}
    }
}

function startAutoSchedule() {
    if (autoScheduleInterval) clearInterval(autoScheduleInterval);
    autoScheduleInterval = setInterval(applyAutoTheme, 60000);
}

function renderAutoScheduleUI() {
    const schedule = loadSchedule();
    const wrap = document.getElementById('autoScheduleWrap');
    const sw = document.getElementById('autoScheduleSwitch');
    const status = document.getElementById('autoScheduleStatus');
    const lightInput = document.getElementById('scheduleLightTime');
    const darkInput = document.getElementById('scheduleDarkTime');

    if (!wrap || !sw || !status) return;

    if (lightInput) lightInput.value = schedule.lightTime || '07:00';
    if (darkInput) darkInput.value = schedule.darkTime || '19:00';

    if (schedule.enabled) {
        sw.classList.add('active');
        status.innerHTML = '<div class="auto-schedule-dot active"></div><span>Active (' + schedule.lightTime + ' – ' + schedule.darkTime + ')</span>';
    } else {
        sw.classList.remove('active');
        status.innerHTML = '<div class="auto-schedule-dot inactive"></div><span>Off</span>';
    }
}

export function loadTheme() {
    const schedule = loadSchedule();
    if (schedule.enabled) {
        applyAutoTheme();
        renderAutoScheduleUI();
        startAutoSchedule();
        return;
    }
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('themeIcon');
        const label = document.getElementById('themeLabel');
        if (icon) icon.className = 'fa-solid fa-sun';
        if (label) label.textContent = 'Light Mode';
    }
    renderAutoScheduleUI();
}

export function toggleTheme() {
    const schedule = loadSchedule();
    if (schedule.enabled) {
        schedule.enabled = false;
        saveSchedule(schedule);
    }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    try { localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark'); } catch {}
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    if (label) label.textContent = isDark ? 'Dark Mode' : 'Light Mode';
    renderAutoScheduleUI();
}

export function toggleAutoSchedule() {
    const schedule = loadSchedule();
    schedule.enabled = !schedule.enabled;
    saveSchedule(schedule);
    if (schedule.enabled) {
        applyAutoTheme();
        startAutoSchedule();
        showToast('Auto schedule enabled', 'success');
    } else {
        if (autoScheduleInterval) {
            clearInterval(autoScheduleInterval);
            autoScheduleInterval = null;
        }
        showToast('Auto schedule disabled', 'error');
    }
    renderAutoScheduleUI();
}

export function updateScheduleTimes() {
    const schedule = loadSchedule();
    const lightEl = document.getElementById('scheduleLightTime');
    const darkEl = document.getElementById('scheduleDarkTime');
    if (lightEl) schedule.lightTime = lightEl.value;
    if (darkEl) schedule.darkTime = darkEl.value;
    saveSchedule(schedule);
    if (schedule.enabled) {
        applyAutoTheme();
    }
    renderAutoScheduleUI();
    showToast('Schedule times updated', 'success');
}

