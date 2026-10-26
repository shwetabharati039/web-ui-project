// ═══════════════════════════════════════
// TRASH & ENTRY RETENTION
// ═══════════════════════════════════════
import { trash, entries, setTrash, setEntries } from '../core/state.js';
import { saveTrash, saveEntries } from '../core/storage.js';
import { showToast } from '../ui/toast.js';
import { showModal } from '../ui/modal.js';
import { escapeHtml } from '../core/dom.js';

export function updateTrashBadge() {
    const badge = document.getElementById('trashBadge');
    if (!badge) return;
    if (trash.length > 0) {
        badge.style.display = 'inline';
        badge.textContent = trash.length;
    } else {
        badge.style.display = 'none';
    }
}

export function renderTrash() {
    // Auto-expire old trash (30 days)
    const now = Date.now();
    setTrash(trash.filter(e => {
        if (!e.deletedAt) return true;
        return (now - new Date(e.deletedAt).getTime()) < 30 * 86400000;
    }));
    saveTrash(trash);
    updateTrashBadge();

    const container = document.getElementById('trashContainer');
    const subtitle = document.getElementById('trashSubtitle');
    if (subtitle) {
        subtitle.textContent = trash.length + ' deleted entr' + (trash.length !== 1 ? 'ies' : 'y') + ' (kept for 30 days)';
    }

    if (!container) return;

    if (trash.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-trash-can"></i><h3>Trash is empty</h3><p>Deleted entries will appear here.</p></div>';
        return;
    }

    container.innerHTML = trash.map(e => {
        const date = new Date(e.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const daysLeft = e.deletedAt ? Math.max(0, 30 - Math.floor((Date.now() - new Date(e.deletedAt).getTime()) / 86400000)) : 30;
        return '<div class="trash-entry-card">' +
            '<span class="trash-entry-mood">' + (e.mood || '📝') + '</span>' +
            '<div class="trash-entry-info"><div class="trash-entry-title">' + escapeHtml(e.title) + '</div><div class="trash-entry-date">' + dateStr + ' · ' + (e.wordCount || 0) + ' words · expires in ' + daysLeft + ' days</div></div>' +
            '<div class="trash-entry-actions">' +
                '<button class="btn btn-secondary" onclick="restoreEntry(\'' + e.id + '\')"><i class="fa-solid fa-rotate-left"></i> Restore</button>' +
                '<button class="btn btn-danger" onclick="permanentDelete(\'' + e.id + '\')"><i class="fa-solid fa-xmark"></i></button>' +
            '</div></div>';
    }).join('');
}

export function restoreEntry(id) {
    const idx = trash.findIndex(e => e.id === id);
    if (idx !== -1) {
        const entry = trash.splice(idx, 1)[0];
        delete entry.deletedAt;
        entries.unshift(entry);
        saveEntries(entries);
        saveTrash(trash);
        updateTrashBadge();
        renderTrash();
        showToast('Entry restored', 'success');
    }
}

export function permanentDelete(id) {
    showModal('Permanently Delete?', 'This cannot be undone.', () => {
        setTrash(trash.filter(e => e.id !== id));
        saveTrash(trash);
        updateTrashBadge();
        renderTrash();
        showToast('Permanently deleted', 'success');
    });
}

export function emptyTrash() {
    if (trash.length === 0) {
        showToast('Trash is already empty', 'error');
        return;
    }
    showModal('Empty Trash?', 'All ' + trash.length + ' entries will be permanently deleted.', () => {
        setTrash([]);
        saveTrash(trash);
        updateTrashBadge();
        renderTrash();
        showToast('Trash emptied', 'success');
    });
}

