// ═══════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════
import {
    STORAGE_KEY, DRAFT_KEY, SORT_KEY, TRASH_KEY, TASKS_KEY,
    entries, trash, tasks, currentTags, currentImages, currentRecordings,
    selectedMood, editingEntryId, autoSaveTimer,
    setCurrentTags, setCurrentImages, setCurrentRecordings,
    setSelectedMood, setEditingEntryId, setAutoSaveTimer
} from './state.js';
import { getEditorContent, setEditorContent, stripHtml } from './editor.js';
import { renderTags, setDefaultDate, updateWordCount } from './navigation.js';
import { renderImagePreviews } from './images.js';
import { renderRecordingList } from './voice.js';
import { showToast } from './ui.js';

export function loadEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}

export function saveEntries() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
    catch (e) { showToast('Storage full — entry could not be saved', 'error'); }
}

export function loadSort() {
    const saved = localStorage.getItem(SORT_KEY);
    return saved || 'date-desc';
}

export function saveSort(sort) { localStorage.setItem(SORT_KEY, sort); }

export function loadTrash() {
    try { return JSON.parse(localStorage.getItem(TRASH_KEY)) || []; }
    catch { return []; }
}

export function saveTrash() { localStorage.setItem(TRASH_KEY, JSON.stringify(trash)); }

export function loadTasks() {
    try { return JSON.parse(localStorage.getItem(TASKS_KEY)) || []; }
    catch { return []; }
}

export function saveTasks() { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }

export function loadDraft() {
    try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
        if (draft) {
            document.getElementById('entryTitle').value = draft.title || '';
            setEditorContent(draft.content || '');
            if (draft.mood) {
                setSelectedMood(draft.mood);
                const opt = document.querySelector('.mood-option[data-mood="' + draft.mood + '"]');
                if (opt) opt.classList.add('selected');
            }
            if (draft.tags && draft.tags.length) {
                setCurrentTags([...draft.tags]);
                renderTags();
            }
            if (draft.images && draft.images.length) {
                setCurrentImages([...draft.images]);
                renderImagePreviews();
            }
            if (draft.recordings && draft.recordings.length) {
                setCurrentRecordings([...draft.recordings]);
                renderRecordingList();
            }
            if (draft.date) document.getElementById('entryDate').value = draft.date;
        }
    } catch {}
}

export function saveDraft() {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
            title: document.getElementById('entryTitle').value,
            content: getEditorContent(),
            mood: selectedMood, tags: currentTags,
            images: currentImages,
            recordings: currentRecordings,
            date: document.getElementById('entryDate').value
        }));
    } catch (e) {
        showToast('Draft too large to save — storage is full', 'error');
    }
}

export function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    document.getElementById('entryTitle').value = '';
    setEditorContent('');
    document.getElementById('editEntryId').value = '';
    setSelectedMood('');
    setCurrentTags([]);
    setCurrentImages([]);
    setCurrentRecordings([]);
    setEditingEntryId(null);
    document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
    renderTags();
    renderImagePreviews();
    renderRecordingList();
    setDefaultDate();
    updateWordCount();
    showToast('Draft cleared', 'success');
}
window.clearDraft = clearDraft;

// ═══════════════════════════════════════
// AUTO-SAVE
// ═══════════════════════════════════════
export function autoSaveDraft() {
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
    setAutoSaveTimer(setTimeout(() => {
        saveDraft();
        dot.classList.remove('saving');
        text.textContent = 'Draft saved';
    }, 1000));
}
window.autoSaveDraft = autoSaveDraft;
