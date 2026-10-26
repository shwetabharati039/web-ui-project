// ═══════════════════════════════════════
// ENTRY FORM & DRAFT MANAGEMENT
// ═══════════════════════════════════════
import {
    selectedMood, currentTags, currentImages, currentRecordings, editingEntryId, autoSaveTimer,
    setSelectedMood, setCurrentTags, setCurrentImages, setCurrentRecordings, setEditingEntryId, setAutoSaveTimer
} from '../core/state.js';
import { loadDraftData, saveDraftData, clearDraftData } from '../core/storage.js';
import { stripHtml } from '../core/dom.js';
import { getEditorContent, setEditorContent, setEditorChangeCallback } from './editor.js';
import { renderImagePreviews } from './images.js';
import { renderRecordingList, stopPreviewAudio } from './voice.js';
import { applyPaperTheme } from './paper.js';
import { showToast } from '../ui/toast.js';

export function setDefaultDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    const dateInput = document.getElementById('entryDate');
    if (dateInput) dateInput.value = local.toISOString().slice(0, 16);
}

export function updateWordCount() {
    const editor = document.getElementById('entryContent');
    if (!editor) return;
    const text = stripHtml(editor.innerHTML);
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;

    const wordEl = document.getElementById('wordCount');
    const charEl = document.getElementById('charCount');
    if (wordEl) wordEl.textContent = words + ' word' + (words !== 1 ? 's' : '');
    if (charEl) charEl.textContent = chars + ' character' + (chars !== 1 ? 's' : '');
}

export function renderTags() {
    const wrap = document.getElementById('tagsInputWrap');
    const input = document.getElementById('tagInput');
    if (!wrap || !input) return;

    wrap.querySelectorAll('.tag-item').forEach(t => t.remove());
    currentTags.forEach((tag, i) => {
        const el = document.createElement('span');
        el.className = 'tag-item';
        el.innerHTML = '#' + tag + ' <span class="tag-remove" onclick="removeTag(' + i + ')">&times;</span>';
        wrap.insertBefore(el, input);
    });
}

export function removeTag(index) {
    currentTags.splice(index, 1);
    renderTags();
    autoSaveDraft();
}

export function handleTagInput(e) {
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
}

export function selectMood(el) {
    document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
    setSelectedMood(el.dataset.mood);
    autoSaveDraft();
}

export function saveDraft() {
    const titleEl = document.getElementById('entryTitle');
    const dateEl = document.getElementById('entryDate');
    const draft = {
        title: titleEl ? titleEl.value : '',
        content: getEditorContent(),
        mood: selectedMood,
        tags: currentTags,
        images: currentImages,
        recordings: currentRecordings,
        date: dateEl ? dateEl.value : ''
    };
    const success = saveDraftData(draft);
    if (!success) {
        showToast('Draft too large to save — storage is full', 'error');
    }
}

export function autoSaveDraft() {
    const editor = document.getElementById('entryContent');
    if (editor) {
        const html = editor.innerHTML;
        editor.classList.toggle('editor-empty', !stripHtml(html).trim() && (/^(<br\s*\/?>|\s|&nbsp;)*$/.test(html) || html === ''));
    }
    updateWordCount();

    const indicator = document.getElementById('autosaveIndicator');
    const dot = document.getElementById('autosaveDot');
    const text = document.getElementById('autosaveText');

    if (indicator) indicator.style.display = 'flex';
    if (dot) dot.classList.add('saving');
    if (text) text.textContent = 'Saving...';

    clearTimeout(autoSaveTimer);
    setAutoSaveTimer(setTimeout(() => {
        saveDraft();
        if (dot) dot.classList.remove('saving');
        if (text) text.textContent = 'Draft saved';
    }, 1000));
}

export function loadDraft() {
    const draft = loadDraftData();
    if (!draft) return;

    const titleEl = document.getElementById('entryTitle');
    const dateEl = document.getElementById('entryDate');

    if (titleEl) titleEl.value = draft.title || '';
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
    if (draft.date && dateEl) {
        dateEl.value = draft.date;
    }
}

export function clearDraft() {
    clearDraftData();
    const titleEl = document.getElementById('entryTitle');
    const editIdEl = document.getElementById('editEntryId');

    if (titleEl) titleEl.value = '';
    setEditorContent('');
    if (editIdEl) editIdEl.value = '';

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

export function resetForm() {
    const titleEl = document.getElementById('entryTitle');
    const editIdEl = document.getElementById('editEntryId');

    if (titleEl) titleEl.value = '';
    setEditorContent('');
    if (editIdEl) editIdEl.value = '';

    setSelectedMood('');
    setCurrentTags([]);
    setCurrentImages([]);
    setCurrentRecordings([]);
    setEditingEntryId(null);

    document.querySelectorAll('.mood-option').forEach(m => m.classList.remove('selected'));
    renderTags();
    renderImagePreviews();
    renderRecordingList();
    if (typeof stopPreviewAudio === 'function') stopPreviewAudio();
    setDefaultDate();
    updateWordCount();
    setTimeout(applyPaperTheme, 10);
}

// Connect editor changes to autosave
setEditorChangeCallback(autoSaveDraft);

