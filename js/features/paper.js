// ═══════════════════════════════════════
// PAPER STYLES
// ═══════════════════════════════════════
import { PAPER_THEME_KEY } from '../core/constants.js';
import { currentPaperTheme, setCurrentPaperTheme } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { navigateTo } from '../core/router.js';
import { applyFont } from './font.js';

export function loadPaperTheme() {
    try {
        const saved = localStorage.getItem(PAPER_THEME_KEY);
        if (saved) setCurrentPaperTheme(saved);
    } catch {}
    applyPaperTheme();
}

export function applyPaperTheme() {
    const editor = document.getElementById('entryContent');
    const paperOptions = document.querySelectorAll('.paper-theme-option');
    if (editor) {
        const themeClass = currentPaperTheme !== 'blank' ? ' paper-' + currentPaperTheme : '';
        editor.className = 'editor-content' + themeClass;
    }
    paperOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.paper === currentPaperTheme);
    });
    applyFont();
}

export function setPaperTheme(theme) {
    setCurrentPaperTheme(theme);
    try {
        localStorage.setItem(PAPER_THEME_KEY, theme);
    } catch {}
    applyPaperTheme();
    showToast('Paper style: ' + theme.charAt(0).toUpperCase() + theme.slice(1), 'success');
}

export function togglePaperThemeDropdown() {
    navigateTo('new-entry');
}

