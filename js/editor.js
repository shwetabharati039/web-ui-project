// ═══════════════════════════════════════
// RICH TEXT HELPERS
// ═══════════════════════════════════════
import { autoSaveDraft } from './storage.js';

window.formatDoc = function(command, value) {
    const editor = document.getElementById('entryContent');
    editor.focus();
    if (command === 'formatBlock') {
        document.execCommand(command, false, value || 'p');
    } else {
        document.execCommand(command, false, value || null);
    }
    autoSaveDraft();
    // Update toolbar button states
    updateToolbarState();
};

export function getEditorContent() {
    const editor = document.getElementById('entryContent');
    const html = editor.innerHTML;
    const stripped = stripHtml(html).trim();
    const isEmpty = !stripped && (/^(<br\s*\/?>|\s|&nbsp;)*$/.test(html) || html === '');
    editor.classList.toggle('editor-empty', isEmpty);
    return isEmpty ? '' : html;
}

export function setEditorContent(html) {
    const editor = document.getElementById('entryContent');
    editor.innerHTML = html || '';
    editor.classList.toggle('editor-empty', !html || /^(<br\s*\/?>|\s|&nbsp;)*$/.test(html));
}

export function sanitizeHtml(html) {
    if (!html) return '';
    const allowed = ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'pre'];
    const temp = document.createElement('div');
    temp.innerHTML = html;
    function clean(node) {
        if (node.nodeType === 3) return; // text node
        if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            if (!allowed.includes(tag)) {
                const parent = node.parentNode;
                while (node.firstChild) parent.insertBefore(node.firstChild, node);
                parent.removeChild(node);
                return;
            }
            // Remove all attributes except for specific allowed ones
            const allowedAttrs = [];
            Array.from(node.attributes).forEach(attr => {
                if (!allowedAttrs.includes(attr.name)) {
                    node.removeAttribute(attr.name);
                }
            });
            Array.from(node.childNodes).forEach(clean);
        }
    }
    Array.from(temp.childNodes).forEach(clean);
    return temp.innerHTML;
}

export function stripHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
}

function updateToolbarState() {
    // Could be extended to highlight active buttons based on current selection
}

// Ensure keyboard shortcuts like Ctrl+B work in the editor
document.addEventListener('keydown', function(e) {
    const editor = document.getElementById('entryContent');
    if (document.activeElement !== editor && !editor.contains(document.activeElement)) return;

    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            window.formatDoc('bold');
        } else if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            window.formatDoc('italic');
        } else if (e.key === 'u' || e.key === 'U') {
            e.preventDefault();
            window.formatDoc('underline');
        }
    }
});

// ═══════════════════════════════════════
// FORMAT TOOLBAR STATE TRACKING
// ═══════════════════════════════════════
document.addEventListener('mouseup', function(e) {
    const editor = document.getElementById('entryContent');
    if (document.activeElement === editor || editor.contains(document.activeElement)) {
        setTimeout(updateToolbarState, 10);
    }
});

// ═══════════════════════════════════════
// PASTE HANDLER — sanitize pasted HTML
// ═══════════════════════════════════════
(function bindPaste() {
    const editor = document.getElementById('entryContent');
    if (editor) {
        editor.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            if (text) {
                document.execCommand('insertText', false, text);
            }
        });
    }
})();
