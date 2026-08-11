// ═══════════════════════════════════════
// THEME
// ═══════════════════════════════════════
import {
    THEME_KEY, SCHEDULE_KEY, WALLPAPER_KEY, PAPER_THEME_KEY, FONT_KEY, REMINDER_KEY,
    currentPaperTheme, setCurrentPaperTheme
} from './state.js';
import { showToast } from './ui.js';
import { navigateTo } from './navigation.js';

let autoScheduleInterval = null;

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
        document.getElementById('themeIcon').className = 'fa-solid fa-sun';
        document.getElementById('themeLabel').textContent = 'Light Mode';
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
    localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
    document.getElementById('themeIcon').className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    document.getElementById('themeLabel').textContent = isDark ? 'Dark Mode' : 'Light Mode';
    renderAutoScheduleUI();
}
window.toggleTheme = toggleTheme;

// ═══════════════════════════════════════
// AUTO THEME SCHEDULE
// ═══════════════════════════════════════
function loadSchedule() {
    try {
        const s = JSON.parse(localStorage.getItem(SCHEDULE_KEY));
        return s || { enabled: false, lightTime: '07:00', darkTime: '19:00' };
    } catch { return { enabled: false, lightTime: '07:00', darkTime: '19:00' }; }
}

function saveSchedule(s) { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s)); }

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
        document.getElementById('themeIcon').className = shouldBeDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        document.getElementById('themeLabel').textContent = shouldBeDark ? 'Light Mode' : 'Dark Mode';
        localStorage.setItem(THEME_KEY, shouldBeDark ? 'dark' : 'light');
    }
}

function startAutoSchedule() {
    if (autoScheduleInterval) clearInterval(autoScheduleInterval);
    autoScheduleInterval = setInterval(applyAutoTheme, 60000);
}

window.toggleAutoSchedule = function() {
    const schedule = loadSchedule();
    schedule.enabled = !schedule.enabled;
    saveSchedule(schedule);
    if (schedule.enabled) {
        applyAutoTheme();
        startAutoSchedule();
        showToast('Auto schedule enabled', 'success');
    } else {
        if (autoScheduleInterval) { clearInterval(autoScheduleInterval); autoScheduleInterval = null; }
        showToast('Auto schedule disabled', 'success');
    }
    renderAutoScheduleUI();
};

window.updateScheduleTimes = function() {
    const schedule = loadSchedule();
    schedule.lightTime = document.getElementById('scheduleLightTime').value || '07:00';
    schedule.darkTime = document.getElementById('scheduleDarkTime').value || '19:00';
    saveSchedule(schedule);
    if (schedule.enabled) applyAutoTheme();
};

function renderAutoScheduleUI() {
    const schedule = loadSchedule();
    const wrap = document.getElementById('autoScheduleWrap');
    const sw = document.getElementById('autoScheduleSwitch');
    const statusEl = document.getElementById('autoScheduleStatus');
    const lightInput = document.getElementById('scheduleLightTime');
    const darkInput = document.getElementById('scheduleDarkTime');

    lightInput.value = schedule.lightTime || '07:00';
    darkInput.value = schedule.darkTime || '19:00';

    if (schedule.enabled) {
        sw.classList.add('active');
        wrap.classList.add('show');
        const shouldBeDark = isDarkTime(schedule);
        statusEl.innerHTML = '<div class="auto-schedule-dot"></div><span>' + (shouldBeDark ? 'Dark mode active (auto)' : 'Light mode active (auto)') + '</span>';
    } else {
        sw.classList.remove('active');
        statusEl.innerHTML = '<div class="auto-schedule-dot inactive"></div><span>Off — click to enable</span>';
    }
}

// ═══════════════════════════════════════
// WALLPAPER
// ═══════════════════════════════════════
const wallpaperPresets = [
    { id: 'none', label: 'None', value: '' },
    { id: 'sunset', label: 'Sunset', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fdfcfb 100%)' },
    { id: 'ocean', label: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'forest', label: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'lavender', label: 'Lavender', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
    { id: 'midnight', label: 'Midnight', value: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)' },
    { id: 'peach', label: 'Peach', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
    { id: 'aurora', label: 'Aurora', value: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 30%, #7c3aed 70%, #f43f5e 100%)' },
    { id: 'paper', label: 'Paper', value: 'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.03) 24px, rgba(0,0,0,0.03) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,0,0,0.02) 24px, rgba(0,0,0,0.02) 25px)' },
    { id: 'dots', label: 'Dots', value: 'radial-gradient(circle, var(--border) 1px, transparent 1px)', bgSize: '20px 20px' },
    { id: 'waves', label: 'Waves', value: 'radial-gradient(ellipse at 10% 90%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(102,126,234,0.08) 0%, transparent 50%)' }
];

export function loadWallpaper() {
    try { const saved = localStorage.getItem(WALLPAPER_KEY); if (saved) applyWallpaper(JSON.parse(saved)); } catch {}
}

function applyWallpaper(data) {
    const main = document.querySelector('.main-content');
    if (!data || !data.value) { main.style.backgroundImage = ''; main.style.backgroundSize = ''; return; }
    main.style.backgroundImage = data.value;
    main.style.backgroundSize = data.bgSize || '';
}

window.openWallpaperModal = function() { renderWallpaperGrid(); document.getElementById('wallpaperModal').classList.add('show'); };
export function closeWallpaperModal() { document.getElementById('wallpaperModal').classList.remove('show'); }
window.closeWallpaperModal = closeWallpaperModal;

function renderWallpaperGrid() {
    const grid = document.getElementById('wallpaperGrid');
    let currentId = 'none';
    try { const saved = localStorage.getItem(WALLPAPER_KEY); if (saved) currentId = JSON.parse(saved).id || 'none'; } catch {}
    grid.innerHTML = wallpaperPresets.map(p => {
        const bg = p.value ? p.value : 'var(--bg-card)';
        return '<div class="wallpaper-thumb ' + (p.id === currentId ? 'selected' : '') + '" style="background:' + bg + ';' + (p.bgSize ? 'background-size:' + p.bgSize : '') + '" onclick="selectWallpaper(\'' + p.id + '\')"><div class="wallpaper-thumb-label">' + p.label + '</div></div>';
    }).join('');
}

window.selectWallpaper = function(id) {
    const preset = wallpaperPresets.find(p => p.id === id);
    if (!preset) return;
    const data = { id: preset.id, value: preset.value, bgSize: preset.bgSize || '' };
    if (preset.id === 'none') { localStorage.removeItem(WALLPAPER_KEY); applyWallpaper(null); }
    else { localStorage.setItem(WALLPAPER_KEY, JSON.stringify(data)); applyWallpaper(data); }
    renderWallpaperGrid();
    showToast(preset.id === 'none' ? 'Wallpaper removed' : 'Wallpaper set!', 'success');
};

window.handleWallpaperUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 512 * 1024) { showToast('Image must be under 500KB', 'error'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = { id: 'custom', value: 'url(' + e.target.result + ')', bgSize: 'cover' };
        localStorage.setItem(WALLPAPER_KEY, JSON.stringify(data));
        applyWallpaper(data);
        renderWallpaperGrid();
        showToast('Custom wallpaper set!', 'success');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
};

window.clearWallpaper = function() { localStorage.removeItem(WALLPAPER_KEY); applyWallpaper(null); renderWallpaperGrid(); showToast('Wallpaper removed', 'success'); };

// ═══════════════════════════════════════
// PAPER THEME
// ═══════════════════════════════════════
export function loadPaperTheme() {
    const saved = localStorage.getItem(PAPER_THEME_KEY);
    if (saved) setCurrentPaperTheme(saved);
    applyPaperTheme();
}

export function applyPaperTheme() {
    const editor = document.getElementById('entryContent');
    const paperOptions = document.querySelectorAll('.paper-theme-option');
    if (editor) {
        const themeClass = currentPaperTheme !== 'blank' ? ' paper-' + currentPaperTheme : '';
        editor.className = 'editor-content' + themeClass;
    }
    paperOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.paper === currentPaperTheme);
    });
    applyFont();
}

window.setPaperTheme = function(theme) {
    setCurrentPaperTheme(theme);
    localStorage.setItem(PAPER_THEME_KEY, theme);
    applyPaperTheme();
    showToast('Paper style: ' + theme.charAt(0).toUpperCase() + theme.slice(1), 'success');
};

window.togglePaperThemeDropdown = function() {
    navigateTo('new-entry');
};

// ═══════════════════════════════════════
// WRITING FONT PICKER
// ═══════════════════════════════════════
export let currentFont = 'default';
let reminderInterval = null;

export function loadFont() {
    const saved = localStorage.getItem(FONT_KEY);
    if (saved) currentFont = saved;
    applyFont();
}

export function applyFont() {
    const editor = document.getElementById('entryContent');
    const fontMap = {
        'default': "'Inter', sans-serif",
        'serif': "'Playfair Display', Georgia, serif",
        'handwriting': "'Caveat', cursive",
        'georgia': "'Georgia', 'Times New Roman', serif"
    };
    if (editor && currentFont !== 'default') {
        editor.style.fontFamily = fontMap[currentFont] || fontMap['default'];
    } else if (editor) {
        editor.style.fontFamily = '';
    }
    document.querySelectorAll('.font-picker-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.font === currentFont);
    });
}

window.setWritingFont = function(font) {
    currentFont = font;
    localStorage.setItem(FONT_KEY, font);
    applyFont();
    const labels = { 'default': 'Sans-serif', 'serif': 'Serif', 'handwriting': 'Handwriting', 'georgia': 'Georgia' };
    showToast('Font: ' + (labels[font] || font), 'success');
};

window.toggleFontPicker = function() {
    const panel = document.getElementById('fontPickerPanel');
    const isOpen = panel.classList.toggle('show');
    if (isOpen) panel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

// ═══════════════════════════════════════
// DAILY REMINDERS
// ═══════════════════════════════════════
export function loadReminder() {
    try {
        const r = JSON.parse(localStorage.getItem(REMINDER_KEY));
        return r || { enabled: false, time: '20:00', message: 'Time to write!' };
    } catch { return { enabled: false, time: '20:00', message: 'Time to write!' }; }
}

function saveReminder(r) { localStorage.setItem(REMINDER_KEY, JSON.stringify(r)); }

function reminderTimeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

let lastReminderFired = '';

function checkReminder() {
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

window.toggleReminderPanel = function() {
    const panel = document.getElementById('reminderPanel');
    const isOpen = panel.classList.toggle('show');
    if (isOpen) panel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

window.toggleReminder = function() {
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
};

window.updateReminderTime = function() {
    const reminder = loadReminder();
    reminder.time = document.getElementById('reminderTime').value || '20:00';
    saveReminder(reminder);
};

window.updateReminderMessage = function() {
    const reminder = loadReminder();
    reminder.message = document.getElementById('reminderMessage').value || 'Time to write!';
    saveReminder(reminder);
};

export function renderReminderUI() {
    const reminder = loadReminder();
    const sw = document.getElementById('reminderSwitch');
    const timeInput = document.getElementById('reminderTime');
    const msgInput = document.getElementById('reminderMessage');
    const statusEl = document.getElementById('reminderStatus');

    timeInput.value = reminder.time || '20:00';
    msgInput.value = reminder.message || 'Time to write!';

    if (reminder.enabled) {
        sw.classList.add('active');
        statusEl.innerHTML = '<div class="reminder-dot"></div><span>Active — daily at ' + reminder.time + '</span>';
    } else {
        sw.classList.remove('active');
        statusEl.innerHTML = '<div class="reminder-dot inactive"></div><span>Off — click to enable</span>';
    }
}
