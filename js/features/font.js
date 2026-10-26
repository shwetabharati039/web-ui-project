// ═══════════════════════════════════════
// WRITING FONT PICKER
// ═══════════════════════════════════════
import { FONT_KEY } from '../core/constants.js';
import { showToast } from '../ui/toast.js';

export let currentFont = 'default';

export function loadFont() {
    try {
        const saved = localStorage.getItem(FONT_KEY);
        if (saved) currentFont = saved;
    } catch {}
    applyFont();
}

export function applyFont() {
    const editor = document.getElementById('entryContent');
    const fontMap = {
        'default': "'Inter', sans-serif",
        'serif': "'Playfair Display', Georgia, serif",
        'handwriting': "'Caveat', cursive",
        'georgia': "'Georgia', 'Times New Roman', serif"
    };
    if (editor && currentFont !== 'default') {
        editor.style.fontFamily = fontMap[currentFont] || fontMap['default'];
    } else if (editor) {
        editor.style.fontFamily = '';
    }
    document.querySelectorAll('.font-picker-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.font === currentFont);
    });
}

export function setWritingFont(font) {
    currentFont = font;
    try {
        localStorage.setItem(FONT_KEY, font);
    } catch {}
    applyFont();
    const labels = { 'default': 'Sans-serif', 'serif': 'Serif', 'handwriting': 'Handwriting', 'georgia': 'Georgia' };
    showToast('Font: ' + (labels[font] || font), 'success');
}

export function toggleFontPicker() {
    const panel = document.getElementById('fontPickerPanel');
    if (!panel) return;
    const isOpen = panel.classList.toggle('show');
    if (isOpen) panel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

