
// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
function init() {
    loadTheme();
    loadWallpaper();
    loadPaperTheme();
    loadFont();
    setupGameCanvasEvents();
    gameAudioEnabled();
    currentSort = loadSort();
    document.getElementById('sortSelect').value = currentSort;
    setDefaultDate();
    loadDraft();
    renderDashboard();
    renderPromptBanner();
    renderWritingTip();
    calculateStreak();
    updateTrashBadge();
    updateBookmarkBadge();
    renderTasks();
    updateTaskBadge();
    checkTutorial();
    renderReminderUI();
    const reminder = loadReminder();
    if (reminder.enabled) startReminderCheck();
    startTaskReminderCheck();
    window.addEventListener('hashchange', handleHash);
    handleHash();
}

init();
