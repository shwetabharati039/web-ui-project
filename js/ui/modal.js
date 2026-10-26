// ═══════════════════════════════════════
// MODAL DIALOGS
// ═══════════════════════════════════════
import { setModalConfirmFn, modalConfirmFn } from '../core/state.js';

export function showModal(title, message, confirmFn) {
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');
    const modalEl = document.getElementById('confirmModal');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (modalEl) modalEl.classList.add('show');
    setModalConfirmFn(confirmFn);
}

export function closeModal() {
    const modalEl = document.getElementById('confirmModal');
    if (modalEl) modalEl.classList.remove('show');
    setModalConfirmFn(null);
}

export function modalConfirmAction() {
    if (modalConfirmFn) modalConfirmFn();
    closeModal();
}

export function openShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.add('show');
}

export function closeShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.remove('show');
}

