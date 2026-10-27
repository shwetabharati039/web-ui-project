// ═══════════════════════════════════════
// SIDEBAR & GLOBAL SHORTCUTS
// ═══════════════════════════════════════
import { closeModal, closeShortcutsModal } from './modal.js';
import { navigateTo } from '../core/router.js';

let escapeHandlers = [];

export function registerEscapeHandler(fn) {
    escapeHandlers.push(fn);
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    if (!sidebar) return;

    const isOpen = sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show', isOpen);
    if (hamburger) {
        hamburger.classList.toggle('is-active', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        hamburger.title = isOpen ? 'Close navigation' : 'Open navigation';
    }
    document.body.classList.toggle('sidebar-open', isOpen);
}

export function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    if (hamburger) {
        hamburger.classList.remove('is-active');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.title = 'Open navigation';
    }
    document.body.classList.remove('sidebar-open');
}

export function setupKeyboardShortcuts(options = {}) {
    document.addEventListener('keydown', function(e) {
        const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
        const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
        const isContentEditable = e.target.isContentEditable;

        if (e.key === 'Escape') {
            // Check registered escape handlers first (tutorial, lightbox, wallpaper, game)
            for (const handler of escapeHandlers) {
                if (handler()) return;
            }

            const lightbox = document.getElementById('lightbox');
            if (lightbox && lightbox.classList.contains('show')) {
                if (options.closeLightbox) { options.closeLightbox(); return; }
                lightbox.classList.remove('show');
                return;
            }

            const shortcutsModal = document.getElementById('shortcutsModal');
            if (shortcutsModal && shortcutsModal.classList.contains('show')) {
                closeShortcutsModal();
                return;
            }

            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal && confirmModal.classList.contains('show')) {
                closeModal();
                return;
            }

            const wallpaperModal = document.getElementById('wallpaperModal');
            if (wallpaperModal && wallpaperModal.classList.contains('show')) {
                if (options.closeWallpaperModal) { options.closeWallpaperModal(); return; }
                wallpaperModal.classList.remove('show');
                return;
            }

            if (options.handleGameEscape && options.handleGameEscape()) {
                return;
            }

            const activePage = document.querySelector('.page.active');
            if (activePage && activePage.id !== 'page-dashboard') {
                navigateTo('dashboard');
                return;
            }
        }

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                navigateTo('new-entry');
            } else if (e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput && !isInput) searchInput.focus();
            } else if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                navigateTo('dashboard');
            } else if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                navigateTo('calendar');
            } else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                navigateTo('tasks');
            } else if ((e.key === 'a' || e.key === 'A') && !isInput && !isContentEditable) {
                e.preventDefault();
                navigateTo('analytics');
            } else if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                if (options.toggleTheme) options.toggleTheme();
            }
        }
    });
}

