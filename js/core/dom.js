// ═══════════════════════════════════════
// DOM UTILITIES & SANITIZATION
// ═══════════════════════════════════════

export function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function stripHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
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
            // Remove all attributes except for safe style / class if needed
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

