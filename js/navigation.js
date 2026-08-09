// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
window.navigateTo = function(page, param) {
    if (recordingActive && typeof stopRecording === 'function') stopRecording();
    if (page !== 'game') leaveGamePage();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    const navBtn = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (navBtn) navBtn.classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');

    if (page === 'dashboard') {
        renderDashboard();
        renderPromptBanner();
        renderWritingTip();
        calculateStreak();
        window.location.hash = '';
    } else if (page === 'bookmarks') {
        renderBookmarks();
        window.location.hash = 'bookmarks';
    } else if (page === 'new-entry') {
        if (!editingEntryId && !param) resetForm();
        renderTemplateGrid();
        setTimeout(applyPaperTheme, 10);
        window.location.hash = 'new';
    } else if (page === 'detail' && param) {
        renderDetail(param);
        window.location.hash = 'entry/' + param;
    } else if (page === 'calendar') {
        renderCalendar();
        window.location.hash = 'calendar';
    } else if (page === 'tasks') {
        renderTasks();
        window.location.hash = 'tasks';
    } else if (page === 'game') {
        openGamePage();
        window.location.hash = 'game';
    } else if (page === 'analytics') {
        renderAnalytics();
        window.location.hash = 'analytics';
    } else if (page === 'trash') {
        renderTrash();
        window.location.hash = 'trash';
    }
};

function handleHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) { navigateTo('dashboard'); return; }
    if (hash === 'bookmarks') { navigateTo('bookmarks'); return; }
    if (hash === 'new') { navigateTo('new-entry'); return; }
    if (hash === 'calendar') { navigateTo('calendar'); return; }
    if (hash === 'tasks') { navigateTo('tasks'); return; }
    if (hash === 'game') { navigateTo('game'); return; }
    if (hash === 'analytics') { navigateTo('analytics'); return; }
    if (hash === 'trash') { navigateTo('trash'); return; }
    const match = hash.match(/^entry\/(.+)$/);
    if (match) { navigateTo('detail', match[1]); return; }
}

// ═══════════════════════════════════════
// FORM
// ═══════════════════════════════════════
function setDefaultDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    document.getElementById('entryDate').value = local.toISOString().slice(0, 16);
}

function resetForm() {
    document.getElementById('entryTitle').value = '';
    setEditorContent('');
    document.getElementById('editEntryId').value = '';
    selectedMood = '';
    currentTags = [];
    currentImages = [];
    currentRecordings = [];
    editingEntryId = null;
    document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
    renderTags();
    renderImagePreviews();
    renderRecordingList();
    if (typeof stopPreviewAudio === 'function') stopPreviewAudio();
    setDefaultDate();
    updateWordCount();
    setTimeout(applyPaperTheme, 10);
}

window.selectMood = function(el) {
    document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
    selectedMood = el.dataset.mood;
    autoSaveDraft();
};

window.handleTagInput = function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = e.target.value.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
        if (val && !currentTags.includes(val)) {
            currentTags.push(val);
            renderTags();
            autoSaveDraft();
        }
        e.target.value = '';
    }
};

function renderTags() {
    const wrap = document.getElementById('tagsInputWrap');
    const input = document.getElementById('tagInput');
    wrap.querySelectorAll('.tag-item').forEach(t => t.remove());
    currentTags.forEach((tag, i) => {
        const el = document.createElement('span');
        el.className = 'tag-item';
        el.innerHTML = '#' + tag + ' <span class="tag-remove" onclick="removeTag(' + i + ')">&times;</span>';
        wrap.insertBefore(el, input);
    });
}

window.removeTag = function(index) {
    currentTags.splice(index, 1);
    renderTags();
    autoSaveDraft();
};

function updateWordCount() {
    const editor = document.getElementById('entryContent');
    const text = stripHtml(editor.innerHTML);
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    document.getElementById('wordCount').textContent = words + ' word' + (words !== 1 ? 's' : '');
    document.getElementById('charCount').textContent = chars + ' character' + (chars !== 1 ? 's' : '');
}
