// ═══════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════
window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
};

// ═══════════════════════════════════════
// MODALS
// ═══════════════════════════════════════
function showModal(title, message, confirmFn) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('show');
    modalConfirmFn = confirmFn;
}

window.closeModal = function() { document.getElementById('confirmModal').classList.remove('show'); modalConfirmFn = null; };
window.modalConfirmAction = function() { if (modalConfirmFn) modalConfirmFn(); closeModal(); };

// ═══════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════
window.openShortcutsModal = function() { document.getElementById('shortcutsModal').classList.add('show'); };
window.closeShortcutsModal = function() { document.getElementById('shortcutsModal').classList.remove('show'); };

document.addEventListener('keydown', function(e) {
    const tag = e.target.tagName.toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
    const isContentEditable = e.target.isContentEditable;

    if (e.key === 'Escape') {
        if (tutorialStep >= 0) { endTutorial(); return; }
        if (document.getElementById('lightbox').classList.contains('show')) { closeLightbox(); return; }
        if (document.getElementById('shortcutsModal').classList.contains('show')) { closeShortcutsModal(); return; }
        if (document.getElementById('confirmModal').classList.contains('show')) { closeModal(); return; }
        if (document.getElementById('wallpaperModal').classList.contains('show')) { closeWallpaperModal(); return; }
        const g = gameInstance;
        if (g && g.running && document.getElementById('page-game').classList.contains('active')) { pauseGame(); return; }
        const activePage = document.querySelector('.page.active');
        if (activePage && activePage.id !== 'page-dashboard') { navigateTo('dashboard'); return; }
    }

    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); navigateTo('new-entry'); }
        else if (e.key === 'k' || e.key === 'K') { e.preventDefault(); if (!isInput) document.getElementById('searchInput').focus(); }
        else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); navigateTo('dashboard'); }
        else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); navigateTo('calendar'); }
        else if (e.key === 't' || e.key === 'T') { e.preventDefault(); navigateTo('tasks'); }
        else if ((e.key === 'a' || e.key === 'A') && !isInput && !isContentEditable) { e.preventDefault(); navigateTo('analytics'); }
        else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); toggleTheme(); }
    }
});

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.innerHTML = '<i class="fa-solid fa-' + (type === 'error' ? 'exclamation-circle' : 'check-circle') + '" style="color:var(--' + (type === 'error' ? 'danger' : 'success') + ')"></i> ' + message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

