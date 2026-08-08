// ═══════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════
function loadEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}

function saveEntries() { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }

function loadSort() {
    const saved = localStorage.getItem(SORT_KEY);
    return saved || 'date-desc';
}

function saveSort(sort) { localStorage.setItem(SORT_KEY, sort); }

function loadTrash() {
    try { return JSON.parse(localStorage.getItem(TRASH_KEY)) || []; }
    catch { return []; }
}

function saveTrash() { localStorage.setItem(TRASH_KEY, JSON.stringify(trash)); }

function loadTasks() {
    try { return JSON.parse(localStorage.getItem(TASKS_KEY)) || []; }
    catch { return []; }
}

function saveTasks() { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }

function loadDraft() {
    try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
        if (draft) {
            document.getElementById('entryTitle').value = draft.title || '';
            setEditorContent(draft.content || '');
            if (draft.mood) {
                selectedMood = draft.mood;
                const opt = document.querySelector('.mood-option[data-mood="' + draft.mood + '"]');
                if (opt) opt.classList.add('selected');
            }
            if (draft.tags && draft.tags.length) {
                currentTags = [...draft.tags];
                renderTags();
            }
            if (draft.images && draft.images.length) {
                currentImages = [...draft.images];
                renderImagePreviews();
            }
            if (draft.date) document.getElementById('entryDate').value = draft.date;
        }
    } catch {}
}

function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
        title: document.getElementById('entryTitle').value,
        content: getEditorContent(),
        mood: selectedMood, tags: currentTags,
        images: currentImages,
        date: document.getElementById('entryDate').value
    }));
}

function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    document.getElementById('entryTitle').value = '';
    setEditorContent('');
    document.getElementById('editEntryId').value = '';
    selectedMood = '';
    currentTags = [];
    currentImages = [];
    editingEntryId = null;
    document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
    renderTags();
    renderImagePreviews();
    setDefaultDate();
    updateWordCount();
    showToast('Draft cleared', 'success');
}

// ═══════════════════════════════════════
// AUTO-SAVE
// ═══════════════════════════════════════
window.autoSaveDraft = function() {
    const editor = document.getElementById('entryContent');
    const html = editor.innerHTML;
    editor.classList.toggle('editor-empty', !stripHtml(html).trim() && (/^(<br\s*\/?>|\s|&nbsp;)*$/.test(html) || html === ''));
    updateWordCount();
    const indicator = document.getElementById('autosaveIndicator');
    const dot = document.getElementById('autosaveDot');
    const text = document.getElementById('autosaveText');
    indicator.style.display = 'flex';
    dot.classList.add('saving');
    text.textContent = 'Saving...';
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveDraft();
        dot.classList.remove('saving');
        text.textContent = 'Draft saved';
    }, 1000);
};
