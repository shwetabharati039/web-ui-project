// ═══════════════════════════════════════
// CALENDAR VIEW
// ═══════════════════════════════════════
import { entries, calendarYear, calendarMonth, setCalendar } from '../core/state.js';
import { navigateTo } from '../core/router.js';
import { escapeHtml } from '../core/dom.js';

export function renderCalendar() {
    if (!calendarYear) {
        const now = new Date();
        setCalendar(now.getFullYear(), now.getMonth());
    }
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const labelEl = document.getElementById('calendarMonthLabel');
    if (labelEl) labelEl.textContent = months[calendarMonth] + ' ' + calendarYear;

    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html = dayNames.map(d => '<div class="calendar-day-header">' + d + '</div>').join('');

    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrev = new Date(calendarYear, calendarMonth, 0).getDate();
    const today = new Date();

    // Entry map for this month
    const entryMap = {};
    entries.forEach(e => {
        const d = new Date(e.date);
        if (d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
            const day = d.getDate();
            if (!entryMap[day]) entryMap[day] = [];
            entryMap[day].push(e);
        }
    });

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        html += '<div class="calendar-day other-month"><span class="calendar-day-num">' + (daysInPrev - i) + '</span></div>';
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = d === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
        const dayEntries = entryMap[d] || [];
        const hasEntries = dayEntries.length > 0;
        const mood = hasEntries ? dayEntries[0].mood : '';
        const dateKey = calendarYear + '-' + String(calendarMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');

        html += '<div class="calendar-day' + (isToday ? ' today' : '') + (hasEntries ? ' has-entry' : '') + '" onclick="showCalendarDay(\'' + dateKey + '\')">' +
            '<span class="calendar-day-num">' + d + '</span>' +
            (hasEntries ? '<span class="calendar-day-mood">' + mood + '</span>' : '') +
            '</div>';
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= remaining; d++) {
        html += '<div class="calendar-day other-month"><span class="calendar-day-num">' + d + '</span></div>';
    }

    grid.innerHTML = html;
    const dayPanel = document.getElementById('calendarDayPanel');
    if (dayPanel) dayPanel.classList.remove('show');
}

export function changeMonth(dir) {
    let m = calendarMonth + dir;
    let y = calendarYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setCalendar(y, m);
    renderCalendar();
}

export function showCalendarDay(dateKey) {
    const dayEntries = entries.filter(e => e.date.startsWith(dateKey));
    const panel = document.getElementById('calendarDayPanel');
    const titleEl = document.getElementById('calendarDayTitle');
    const entriesEl = document.getElementById('calendarDayEntries');

    if (!panel || !titleEl || !entriesEl) return;

    const d = new Date(dateKey + 'T12:00:00');
    titleEl.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    if (dayEntries.length === 0) {
        entriesEl.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No entries for this day.</p>';
    } else {
        entriesEl.innerHTML = dayEntries.map(e =>
            '<div class="calendar-entry-mini" onclick="navigateTo(\'detail\', \'' + e.id + '\')">' +
                '<span class="calendar-entry-mini-mood">' + (e.mood || '📝') + '</span>' +
                '<span class="calendar-entry-mini-title">' + escapeHtml(e.title) + '</span>' +
                '<span class="calendar-entry-mini-time">' + new Date(e.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + '</span>' +
            '</div>'
        ).join('');
    }

    panel.classList.add('show');
}

