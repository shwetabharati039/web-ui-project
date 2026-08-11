// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
import { loadTheme, loadWallpaper, loadPaperTheme, loadFont, loadReminder, startReminderCheck, renderReminderUI } from './theme.js';
import { setupGameCanvasEvents, gameAudioEnabled } from './game.js';
import { loadSort, loadDraft } from './storage.js';
import { setDefaultDate, handleHash } from './navigation.js';
import { renderDashboard, updateBookmarkBadge } from './entries.js';
import { renderPromptBanner, renderWritingTip } from './prompts-ui.js';
import { calculateStreak } from './search.js';
import { updateTrashBadge } from './trash.js';
import { renderTasks, updateTaskBadge, startTaskReminderCheck } from './tasks.js';
import { checkTutorial } from './tutorial.js';
import { setCurrentSort, currentSort } from './state.js';
import './export.js';

function init() {
    loadTheme();
    loadWallpaper();
    loadPaperTheme();
    loadFont();
    setupGameCanvasEvents();
    gameAudioEnabled();
    setCurrentSort(loadSort());
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
