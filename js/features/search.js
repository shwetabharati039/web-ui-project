// ═══════════════════════════════════════
// SEARCH, FILTER & SORT
// ═══════════════════════════════════════
import { entries, moodOrder, currentSort, setCurrentSort } from '../core/state.js';
import { saveSort } from '../core/storage.js';
import { stripHtml } from '../core/dom.js';

let onFilterChangeCallback = null;

export function setFilterChangeCallback(fn) {
    onFilterChangeCallback = fn;
}

export function handleSearch() {
    if (onFilterChangeCallback) onFilterChangeCallback();
}

export function handleSort() {
    const select = document.getElementById('sortSelect');
    if (select) {
        setCurrentSort(select.value);
        saveSort(currentSort);
    }
    if (onFilterChangeCallback) onFilterChangeCallback();
}

export function sortEntries(arr) {
    const sorted = [...arr];
    switch (currentSort) {
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'words-asc':
            sorted.sort((a, b) => (a.wordCount || 0) - (b.wordCount || 0));
            break;
        case 'words-desc':
            sorted.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0));
            break;
        case 'mood':
            sorted.sort((a, b) => (moodOrder[a.mood] ?? 10) - (moodOrder[b.mood] ?? 10));
            break;
    }
    return sorted;
}

export function getFilteredEntries() {
    let result = [...entries];
    const searchInput = document.getElementById('searchInput');
    const tagSelect = document.getElementById('tagFilter');
    const dateFromEl = document.getElementById('dateFrom');
    const dateToEl = document.getElementById('dateTo');

    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const tagFilter = tagSelect ? tagSelect.value : '';
    const dateFrom = dateFromEl ? dateFromEl.value : '';
    const dateTo = dateToEl ? dateToEl.value : '';

    if (query) {
        result = result.filter(e =>
            (e.title && e.title.toLowerCase().includes(query)) ||
            (e.content && stripHtml(e.content).toLowerCase().includes(query))
        );
    }
    if (tagFilter) {
        result = result.filter(e => (e.tags || []).includes(tagFilter));
    }
    if (dateFrom) {
        result = result.filter(e => e.date >= dateFrom);
    }
    if (dateTo) {
        result = result.filter(e => e.date <= dateTo + 'T23:59');
    }
    return sortEntries(result);
}

export function updateTagFilter() {
    const allTags = new Set();
    entries.forEach(e => (e.tags || []).forEach(t => allTags.add(t)));
    const select = document.getElementById('tagFilter');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">All Tags</option>';
    [...allTags].sort().forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = '#' + t;
        if (t === current) opt.selected = true;
        select.appendChild(opt);
    });
}

export function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    const tagSelect = document.getElementById('tagFilter');
    const dateFromEl = document.getElementById('dateFrom');
    const dateToEl = document.getElementById('dateTo');
    const sortSelect = document.getElementById('sortSelect');

    if (searchInput) searchInput.value = '';
    if (tagSelect) tagSelect.value = '';
    if (dateFromEl) dateFromEl.value = '';
    if (dateToEl) dateToEl.value = '';
    if (sortSelect) sortSelect.value = 'date-desc';

    setCurrentSort('date-desc');
    saveSort(currentSort);

    if (onFilterChangeCallback) onFilterChangeCallback();
}

