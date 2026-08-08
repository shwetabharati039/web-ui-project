// ═══════════════════════════════════════
// SEARCH & FILTER
// ═══════════════════════════════════════
window.handleSearch = function() { renderDashboard(); };

window.handleSort = function() {
    currentSort = document.getElementById('sortSelect').value;
    saveSort(currentSort);
    renderDashboard();
};

function sortEntries(arr) {
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

function getFilteredEntries() {
    let result = [...entries];
    const query = document.getElementById('searchInput').value.toLowerCase();
    const tagFilter = document.getElementById('tagFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    if (query) result = result.filter(e => e.title.toLowerCase().includes(query) || stripHtml(e.content).toLowerCase().includes(query));
    if (tagFilter) result = result.filter(e => (e.tags || []).includes(tagFilter));
    if (dateFrom) result = result.filter(e => e.date >= dateFrom);
    if (dateTo) result = result.filter(e => e.date <= dateTo + 'T23:59');
    return sortEntries(result);
}

function updateTagFilter() {
    const allTags = new Set();
    entries.forEach(e => (e.tags || []).forEach(t => allTags.add(t)));
    const select = document.getElementById('tagFilter');
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

window.clearFilters = function() {
    document.getElementById('searchInput').value = '';
    document.getElementById('tagFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('sortSelect').value = 'date-desc';
    currentSort = 'date-desc';
    saveSort(currentSort);
    renderDashboard();
};

// ═══════════════════════════════════════
// STREAK
// ═══════════════════════════════════════
function calculateStreak() {
    if (entries.length === 0) { document.getElementById('streakCount').textContent = '0'; return; }
    const dates = [...new Set(entries.map(e => new Date(e.date).toLocaleDateString()))].sort((a, b) => new Date(b) - new Date(a));
    let streak = 0;
    let checkDate = new Date(); checkDate.setHours(0, 0, 0, 0);
    const today = checkDate.toLocaleDateString();
    const yesterday = new Date(checkDate - 86400000).toLocaleDateString();
    if (dates[0] !== today && dates[0] !== yesterday) { document.getElementById('streakCount').textContent = '0'; return; }
    for (let i = 0; i < dates.length; i++) {
        const expected = new Date(checkDate - i * 86400000).toLocaleDateString();
        if (dates.includes(expected)) streak++; else break;
    }
    document.getElementById('streakCount').textContent = streak;
}

