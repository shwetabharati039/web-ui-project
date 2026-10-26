// ═══════════════════════════════════════
// ROUTER & PAGE NAVIGATION
// ═══════════════════════════════════════
import { recordingActive } from './state.js';

const routeHandlers = {};
let onBeforeNavigateCallback = null;

export function setBeforeNavigate(fn) {
    onBeforeNavigateCallback = fn;
}

export function registerRoute(pageName, handler) {
    routeHandlers[pageName] = handler;
}

export function navigateTo(page, param) {
    if (onBeforeNavigateCallback) {
        onBeforeNavigateCallback(page, param);
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    const navBtn = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (navBtn) navBtn.classList.add('active');

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');

    // Update URL hash
    if (page === 'dashboard') {
        window.location.hash = '';
    } else if (page === 'new-entry') {
        window.location.hash = 'new';
    } else if (page === 'detail' && param) {
        window.location.hash = 'entry/' + param;
    } else {
        window.location.hash = page;
    }

    // Execute route handler if registered
    if (typeof routeHandlers[page] === 'function') {
        routeHandlers[page](param);
    }
}

export function handleHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) { navigateTo('dashboard'); return; }
    if (hash === 'bookmarks') { navigateTo('bookmarks'); return; }
    if (hash === 'new') { navigateTo('new-entry'); return; }
    if (hash === 'calendar') { navigateTo('calendar'); return; }
    if (hash === 'tasks') { navigateTo('tasks'); return; }
    if (hash === 'game') { navigateTo('game'); return; }
    if (hash === 'analytics') { navigateTo('analytics'); return; }
    if (hash === 'trash') { navigateTo('trash'); return; }

    const match = hash.match(/^entry\/(.+)$/);
    if (match) {
        navigateTo('detail', match[1]);
        return;
    }
}

