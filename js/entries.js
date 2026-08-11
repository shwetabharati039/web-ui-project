// ═══════════════════════════════════════
// SAVE / EDIT / DELETE (with images & trash)
// ═══════════════════════════════════════
import {
    entries, trash, selectedMood, currentTags, currentImages, currentRecordings,
    editingEntryId, currentPaperTheme, DRAFT_KEY,
    setEditingEntryId, setSelectedMood, setCurrentTags, setCurrentImages, setCurrentRecordings
} from './state.js';
import { getEditorContent, setEditorContent, sanitizeHtml, stripHtml } from './editor.js';
import { saveEntries, saveTrash } from './storage.js';
import { navigateTo, updateWordCount, renderTags } from './navigation.js';
import { renderImagePreviews, openLightbox } from './images.js';
import { renderRecordingList, formatTime, playSavedRecording } from './voice.js';
import { showToast, showModal, escapeHtml } from './ui.js';
import { getFilteredEntries, updateTagFilter } from './search.js';
import { currentFont } from './theme.js';
import { updateTrashBadge } from './trash.js';

window.saveEntry = function() {
    const title = document.getElementById('entryTitle').value.trim();
    const content = sanitizeHtml(getEditorContent()).trim();
    const date = document.getElementById('entryDate').value;
    if (!title && !content) { showToast('Write something before saving!', 'error'); return; }

    const entryData = {
        id: editingEntryId || Date.now().toString(),
        title: title || 'Untitled', content: content,
        date: date || new Date().toISOString(),
        mood: selectedMood || '📝',
        tags: [...currentTags],
        images: [...currentImages],
        recordings: [...currentRecordings],
        pinned: editingEntryId ? (entries.find(e => e.id === editingEntryId)?.pinned || false) : false,
        bookmarked: editingEntryId ? (entries.find(e => e.id === editingEntryId)?.bookmarked || false) : false,
        wordCount: stripHtml(content).trim() ? stripHtml(content).trim().split(/\s+/).length : 0,
        createdAt: editingEntryId ? (entries.find(e => e.id === editingEntryId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingEntryId) {
        const idx = entries.findIndex(e => e.id === editingEntryId);
        if (idx !== -1) entries[idx] = entryData;
        showToast('Entry updated!', 'success');
    } else {
        entries.unshift(entryData);
        showToast('Entry saved!', 'success');
    }

    saveEntries();
    localStorage.removeItem(DRAFT_KEY);
    setEditingEntryId(null);
    navigateTo('dashboard');
};

window.editEntry = function(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    setEditingEntryId(id);
    document.getElementById('entryTitle').value = entry.title === 'Untitled' ? '' : entry.title;
    setEditorContent(entry.content);
    document.getElementById('entryDate').value = entry.date.slice(0, 16);
    setSelectedMood(entry.mood);
    setCurrentTags([...(entry.tags || [])]);
    setCurrentImages([...(entry.images || [])]);
    setCurrentRecordings([...(entry.recordings || [])]);
    renderRecordingList();
    document.querySelectorAll('.mood-option').forEach(m => {
        m.classList.toggle('selected', m.dataset.mood === selectedMood);
    });
    renderTags();
    renderImagePreviews();
    updateWordCount();
    navigateTo('new-entry');
};

window.deleteEntry = function(id) {
    showModal('Move to Trash?', 'This entry will be moved to trash. You can restore it within 30 days.', () => {
        const idx = entries.findIndex(e => e.id === id);
        if (idx !== -1) {
            const removed = entries.splice(idx, 1)[0];
            removed.deletedAt = new Date().toISOString();
            trash.unshift(removed);
            saveEntries();
            saveTrash();
            updateTrashBadge();
            showToast('Moved to trash', 'success');
            navigateTo('dashboard');
        }
    });
};

// ═══════════════════════════════════════
// PIN ENTRIES
// ═══════════════════════════════════════
window.togglePin = function(id, e) {
    e.stopPropagation();
    const entry = entries.find(en => en.id === id);
    if (entry) {
        entry.pinned = !entry.pinned;
        saveEntries();
        renderDashboard();
        showToast(entry.pinned ? 'Entry pinned' : 'Entry unpinned', 'success');
    }
};

// ═══════════════════════════════════════
// BOOKMARK ENTRIES
// ═══════════════════════════════════════
window.toggleBookmark = function(id, e) {
    if (e) e.stopPropagation();
    const entry = entries.find(en => en.id === id);
    if (entry) {
        entry.bookmarked = !entry.bookmarked;
        saveEntries();
        const activePage = document.querySelector('.page.active');
        if (activePage && activePage.id === 'page-bookmarks') {
            renderBookmarks();
        } else if (activePage && activePage.id === 'page-detail') {
            renderDetail(id);
        } else {
            renderDashboard();
        }
        updateBookmarkBadge();
        showToast(entry.bookmarked ? 'Entry bookmarked' : 'Bookmark removed', 'success');
    }
};

export function updateBookmarkBadge() {
    const badge = document.getElementById('bookmarkBadge');
    const count = entries.filter(e => e.bookmarked).length;
    if (count > 0) {
        badge.style.display = 'inline';
        badge.textContent = count;
    } else {
        badge.style.display = 'none';
    }
}

// ═══════════════════════════════════════
// RENDER DASHBOARD (with pinning)
// ═══════════════════════════════════════
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

export function renderDashboard() {
    const filtered = getFilteredEntries();
    const container = document.getElementById('entriesContainer');
    document.getElementById('entryCount').textContent = entries.length + ' entr' + (entries.length !== 1 ? 'ies' : 'y');
    updateTagFilter();

    const greeting = getGreeting();
    document.getElementById('welcomeGreeting').textContent = entries.length > 0
        ? greeting + '! 👋'
        : greeting + '! 📖';
    document.getElementById('welcomeSub').textContent = entries.length > 0
        ? 'You have ' + entries.length + ' entr' + (entries.length !== 1 ? 'ies' : 'y') + ' saved. Keep the momentum going!'
        : 'Your diary is waiting. Start writing today!';

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-feather-pointed"></i><h3>' + (entries.length === 0 ? 'Start Your Journey' : 'No entries found') + '</h3><p>' + (entries.length === 0 ? 'Write your first diary entry and capture your thoughts.' : 'Try adjusting your search or filters.') + '</p>' + (entries.length === 0 ? '<button class="btn btn-primary" onclick="navigateTo(\'new-entry\')"><i class="fa-solid fa-plus"></i> Write First Entry</button>' : '') + '</div>';
        return;
    }

    const pinned = filtered.filter(e => e.pinned);
    const unpinned = filtered.filter(e => !e.pinned);

    let html = '';

    if (pinned.length > 0) {
        html += '<div class="pinned-section-label"><i class="fa-solid fa-thumbtack"></i> Pinned</div>';
        html += '<div class="entries-grid">' + pinned.map(entry => renderEntryCard(entry)).join('') + '</div>';
        if (unpinned.length > 0) html += '<hr class="pinned-divider"><div class="pinned-section-label"><i class="fa-solid fa-book"></i> All Entries</div>';
    }

    if (unpinned.length > 0) {
        html += '<div class="entries-grid">' + unpinned.map(entry => renderEntryCard(entry)).join('') + '</div>';
    }

    container.innerHTML = html;
}

export function renderEntryCard(entry) {
    const date = new Date(entry.date);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const tags = (entry.tags || []).map(t => '<span class="tag">#' + t + '</span>').join('');
    const images = (entry.images || []).length > 0 ?
        '<div class="entry-card-images">' + entry.images.map(src => '<img src="' + src + '" alt="entry image">').join('') + '</div>' : '';
    const readMin = Math.max(1, Math.ceil((entry.wordCount || 0) / 200));
    const lockIcon = entry.locked ? ' <i class="fa-solid fa-lock" style="font-size:11px;color:var(--text-muted);"></i>' : '';
    const voiceIcon = (entry.recordings || []).length > 0 ? ' <i class="fa-solid fa-microphone voice-card-icon" title="' + entry.recordings.length + ' voice note' + (entry.recordings.length !== 1 ? 's' : '') + '"></i>' : '';

    return '<div class="entry-card" onclick="navigateTo(\'detail\', \'' + entry.id + '\')">' +
        '<div class="entry-card-header">' +
            '<span class="entry-card-mood">' + (entry.mood || '📝') + '</span>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
                '<button class="pin-btn ' + (entry.bookmarked ? 'bookmarked' : '') + '" onclick="toggleBookmark(\'' + entry.id + '\', event)" title="' + (entry.bookmarked ? 'Remove bookmark' : 'Bookmark') + '"><i class="fa-solid fa-bookmark"></i></button>' +
                '<button class="pin-btn ' + (entry.pinned ? 'pinned' : '') + '" onclick="togglePin(\'' + entry.id + '\', event)" title="' + (entry.pinned ? 'Unpin' : 'Pin') + '"><i class="fa-solid fa-thumbtack"></i></button>' +
                '<span class="entry-card-date">' + dateStr + '</span>' +
            '</div>' +
        '</div>' +
        images +
        '<div class="entry-card-title">' + escapeHtml(entry.title) + lockIcon + voiceIcon + '</div>' +
        '<div class="entry-card-preview">' + escapeHtml(stripHtml(entry.content)) + '</div>' +
        '<div class="entry-card-footer">' +
            '<div class="entry-card-tags">' + tags + '</div>' +
            '<span class="entry-card-wordcount">' + (entry.wordCount || 0) + ' words · ' + readMin + ' min read</span>' +
        '</div></div>';
}

// ═══════════════════════════════════════
// RENDER BOOKMARKS
// ═══════════════════════════════════════
export function renderBookmarks() {
    const bookmarked = entries.filter(e => e.bookmarked);
    const container = document.getElementById('bookmarksContainer');
    document.getElementById('bookmarksSubtitle').textContent = bookmarked.length + ' saved entr' + (bookmarked.length !== 1 ? 'ies' : 'y') + ' for quick access';
    updateBookmarkBadge();

    if (bookmarked.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bookmark"></i><h3>No bookmarks yet</h3><p>Click the bookmark icon on any entry to save it here for quick access.</p><button class="btn btn-primary" onclick="navigateTo(\'dashboard\')"><i class="fa-solid fa-house"></i> Browse Entries</button></div>';
        return;
    }

    container.innerHTML = '<div class="entries-grid">' + bookmarked.map(entry => renderEntryCard(entry)).join('') + '</div>';
}

// ═══════════════════════════════════════
// RENDER DETAIL (with images)
// ═══════════════════════════════════════
export function renderDetail(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) { navigateTo('dashboard'); return; }

    const date = new Date(entry.date);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const tags = (entry.tags || []).map(t => '<span class="tag">#' + t + '</span>').join('');
    const readMin = Math.max(1, Math.ceil((entry.wordCount || 0) / 200));
    const images = (entry.images || []).length > 0 ?
        '<div class="detail-images">' + entry.images.map(src => '<img src="' + src + '" alt="entry image" onclick="openLightbox(\'' + src.substring(0, 50) + '\')">').join('') + '</div>' : '';
    const recordings = (entry.recordings || []).length > 0 ?
        '<div class="detail-recordings">' +
            '<div class="detail-section-label"><i class="fa-solid fa-microphone"></i> Voice Notes</div>' +
            entry.recordings.map((r, i) =>
                '<div class="detail-recording-item">' +
                    '<button class="voice-play-btn" onclick="playSavedRecording(this, \'' + entry.id + '\', ' + i + ')" title="Play"><i class="fa-solid fa-play"></i></button>' +
                    '<span class="detail-recording-name">Voice Note ' + (i + 1) + '</span>' +
                    '<span class="detail-recording-duration">' + formatTime(Math.round(r.duration || 0)) + '</span>' +
                '</div>'
            ).join('') +
        '</div>' : '';

        const fontMap = {
            'default': "'Inter', sans-serif",
            'serif': "'Playfair Display', Georgia, serif",
            'handwriting': "'Caveat', cursive",
            'georgia': "'Georgia', 'Times New Roman', serif"
        };
        const detailFontStyle = currentFont !== 'default' ? ' font-family:' + fontMap[currentFont] + ';' : '';
        document.getElementById('detailContent').innerHTML =
        '<div style="margin-bottom:8px;"><span class="detail-mood">' + (entry.mood || '📝') + '</span></div>' +
        '<h1 class="detail-title">' + escapeHtml(entry.title) + '</h1>' +
        '<div class="detail-meta">' +
            '<span class="detail-meta-item"><i class="fa-regular fa-calendar"></i> ' + dateStr + '</span>' +
            '<span class="detail-meta-item"><i class="fa-regular fa-clock"></i> ' + timeStr + '</span>' +
            '<span class="detail-meta-item"><i class="fa-solid fa-font"></i> ' + (entry.wordCount || 0) + ' words</span>' +
            '<span class="detail-meta-item"><i class="fa-solid fa-stopwatch"></i> ~' + readMin + ' min read</span>' +
        '</div>' +
        images +
        recordings +
        '<div class="detail-content detail-paper-wrap paper-' + currentPaperTheme + '" style="margin-top:28px;' + detailFontStyle + '">' + sanitizeHtml(entry.content) + '</div>' +
        (tags ? '<div class="detail-tags">' + tags + '</div>' : '') +
        '<div class="detail-actions">' +
            '<button class="btn btn-secondary" onclick="editEntry(\'' + entry.id + '\')"><i class="fa-solid fa-pen"></i> Edit</button>' +
            '<button class="btn ' + (entry.bookmarked ? 'btn-primary' : 'btn-secondary') + '" onclick="toggleBookmark(\'' + entry.id + '\')"><i class="fa-solid fa-bookmark"></i> ' + (entry.bookmarked ? 'Bookmarked' : 'Bookmark') + '</button>' +
            '<button class="btn btn-danger" onclick="deleteEntry(\'' + entry.id + '\')"><i class="fa-solid fa-trash-can"></i> Delete</button>' +
        '</div>';

    // Fix lightbox for images
    setTimeout(() => {
        document.querySelectorAll('.detail-images img').forEach(img => {
            img.onclick = function() { openLightbox(this.src); };
        });
    }, 50);
}
