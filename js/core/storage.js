// ═══════════════════════════════════════
// PURE STORAGE (PERSISTENCE LAYER)
// ═══════════════════════════════════════
import { STORAGE_KEY, DRAFT_KEY, SORT_KEY, TRASH_KEY, TASKS_KEY } from './constants.js';

export function getStorageItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item !== null ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
}

export function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

export function removeStorageItem(key) {
    try {
        localStorage.removeItem(key);
    } catch {}
}

export function loadEntries() {
    return getStorageItem(STORAGE_KEY, []);
}

export function saveEntries(entries) {
    return setStorageItem(STORAGE_KEY, entries);
}

export function loadTrash() {
    return getStorageItem(TRASH_KEY, []);
}

export function saveTrash(trash) {
    return setStorageItem(TRASH_KEY, trash);
}

export function loadTasks() {
    return getStorageItem(TASKS_KEY, []);
}

export function saveTasks(tasks) {
    return setStorageItem(TASKS_KEY, tasks);
}

export function loadSort() {
    try {
        return localStorage.getItem(SORT_KEY) || 'date-desc';
    } catch {
        return 'date-desc';
    }
}

export function saveSort(sort) {
    try {
        localStorage.setItem(SORT_KEY, sort);
    } catch {}
}

export function loadDraftData() {
    return getStorageItem(DRAFT_KEY, null);
}

export function saveDraftData(draft) {
    return setStorageItem(DRAFT_KEY, draft);
}

export function clearDraftData() {
    removeStorageItem(DRAFT_KEY);
}

