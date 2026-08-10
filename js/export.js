// ═══════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════
window.toggleExportMenu = function() {
    const menu = document.getElementById('exportMenu');
    const isOpen = menu.classList.toggle('show');
    if (isOpen) menu.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

window.exportEntries = function(format) {
    if (entries.length === 0) { showToast('No entries to export', 'error'); return; }
    let content, filename, type;
    if (format === 'txt') {
        content = entries.map(e => {
            const d = new Date(e.date).toLocaleString();
            return '═'.repeat(50) + '\n' + (e.mood || '') + ' ' + e.title + '\nDate: ' + d + '\nTags: ' + (e.tags || []).map(t => '#' + t).join(' ') + '\nWord Count: ' + (e.wordCount || 0) + '\n' + '─'.repeat(50) + '\n\n' + stripHtml(e.content) + '\n';
        }).join('\n');
        filename = 'diary-export.txt'; type = 'text/plain';
    } else {
        content = JSON.stringify(entries.map(e => ({...e, images: (e.images || []).length + ' images attached', recordings: (e.recordings || []).length + ' audio notes'})), null, 2);
        filename = 'diary-export.json'; type = 'application/json';
    }
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    document.getElementById('exportMenu').classList.remove('show');
    showToast('Exported as ' + format.toUpperCase(), 'success');
};

// ═══════════════════════════════════════
// FULL BACKUP & RESTORE
// ═══════════════════════════════════════
window.exportFullBackup = function() {
    if (entries.length === 0 && trash.length === 0) { showToast('No data to backup', 'error'); return; }
    const backup = {
        format: 'index-diary-backup',
        version: 2,
        exportedAt: new Date().toISOString(),
        entries: entries.map(e => ({...e})),
        trash: trash.map(e => ({...e})),
        tasks: tasks.map(t => ({...t}))
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index-diary-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('exportMenu').classList.remove('show');
    showToast('Full backup downloaded', 'success');
};

window.importBackup = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data || data.format !== 'index-diary-backup' || !data.entries) {
                showToast('Invalid backup file', 'error');
                return;
            }
            const entryCount = data.entries.length;
            const trashCount = (data.trash || []).length;
            const taskCount = (data.tasks || []).length;
            showModal(
                'Import Backup?',
                'This will replace all ' + entries.length + ' current entries, ' + trash.length + ' trash items, and ' + tasks.length + ' tasks with ' + entryCount + ' entries, ' + trashCount + ' trash items, and ' + taskCount + ' tasks from the backup. This cannot be undone.',
                function() {
                    entries = data.entries;
                    trash = data.trash || [];
                    tasks = data.tasks || [];
                    saveEntries();
                    saveTrash();
                    saveTasks();
                    showToast('Backup imported! Reloading...', 'success');
                    setTimeout(function() { location.reload(); }, 1200);
                }
            );
        } catch (err) {
            showToast('Could not read backup file', 'error');
        }
    };
    reader.readAsText(file);
};

window.addEventListener('resize', function() {
    if (tutorialStep >= 0) renderTutorialStep();
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.export-dropdown')) document.getElementById('exportMenu').classList.remove('show');
    if (!e.target.closest('.font-picker-panel') && !e.target.closest('[onclick="toggleFontPicker()"]')) {
        document.getElementById('fontPickerPanel').classList.remove('show');
    }
    if (!e.target.closest('.reminder-panel') && !e.target.closest('[onclick="toggleReminderPanel()"]')) {
        document.getElementById('reminderPanel').classList.remove('show');
    }
});

