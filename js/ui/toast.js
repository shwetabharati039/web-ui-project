// ═══════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════

export function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    const iconName = type === 'error' ? 'exclamation-circle' : 'check-circle';
    const colorVar = type === 'error' ? 'danger' : 'success';

    toast.innerHTML = '<i class="fa-solid fa-' + iconName + '" style="color:var(--' + colorVar + ')"></i> ' + message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

