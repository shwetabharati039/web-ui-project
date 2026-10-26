// ═══════════════════════════════════════
// RICH TEXT EDITOR
// ═══════════════════════════════════════
import { stripHtml } from '../core/dom.js';

let onChangeCallback = null;

export function setEditorChangeCallback(fn) {
    onChangeCallback = fn;
}

export function formatDoc(command, value) {
    const editor = document.getElementById('entryContent');
    if (!editor) return;
    editor.focus();
    if (command === 'formatBlock') {
        document.execCommand(command, false, value || 'p');
    } else {
        document.execCommand(command, false, value || null);
    }
    if (onChangeCallback) {
        onChangeCallback();
    }
    updateToolbarState();
}

export function getEditorContent() {
    const editor = document.getElementById('entryContent');
    if (!editor) return '';
    const html = editor.innerHTML;
    const stripped = stripHtml(html).trim();
    const isEmpty = !stripped && (/^(<br\s*\/?>|\s|&nbsp;)*$/.test(html) || html === '');
    editor.classList.toggle('editor-empty', isEmpty);
    return isEmpty ? '' : html;
}

export function setEditorContent(html) {
    const editor = document.getElementById('entryContent');
    if (!editor) return;
    editor.innerHTML = html || '';
    editor.classList.toggle('editor-empty', !html || /^(<br\s*\/?>|\s|&nbsp;)*$/.test(html));
}

function updateToolbarState() {
    // Toolbar state update placeholder
}

export function setupEditorShortcuts() {
    document.addEventListener('keydown', function(e) {
        const editor = document.getElementById('entryContent');
        if (!editor) return;
        if (document.activeElement !== editor && !editor.contains(document.activeElement)) return;

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                formatDoc('bold');
            } else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                formatDoc('italic');
            } else if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                formatDoc('underline');
            }
        }
    });

    document.addEventListener('mouseup', function() {
        const editor = document.getElementById('entryContent');
        if (editor && (document.activeElement === editor || editor.contains(document.activeElement))) {
            setTimeout(updateToolbarState, 10);
        }
    });
}

