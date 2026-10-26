// ═══════════════════════════════════════
// WALLPAPER MANAGER
// ═══════════════════════════════════════
import { WALLPAPER_KEY } from '../core/constants.js';
import { showToast } from '../ui/toast.js';

export const wallpaperPresets = [
    { id: 'none', label: 'None', value: '' },
    { id: 'sunset', label: 'Sunset', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fdfcfb 100%)' },
    { id: 'ocean', label: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'forest', label: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    { id: 'lavender', label: 'Lavender', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
    { id: 'midnight', label: 'Midnight', value: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)' },
    { id: 'peach', label: 'Peach', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
    { id: 'aurora', label: 'Aurora', value: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 30%, #7c3aed 70%, #f43f5e 100%)' },
    { id: 'paper', label: 'Paper', value: 'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.03) 24px, rgba(0,0,0,0.03) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,0,0,0.02) 24px, rgba(0,0,0,0.02) 25px)' },
    { id: 'dots', label: 'Dots', value: 'radial-gradient(circle, var(--border) 1px, transparent 1px)', bgSize: '20px 20px' },
    { id: 'waves', label: 'Waves', value: 'radial-gradient(ellipse at 10% 90%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(102,126,234,0.08) 0%, transparent 50%)' }
];

export function applyWallpaper(data) {
    const main = document.querySelector('.main-content');
    if (!main) return;
    if (!data || !data.value) {
        main.style.backgroundImage = '';
        main.style.backgroundSize = '';
        return;
    }
    main.style.backgroundImage = data.value;
    main.style.backgroundSize = data.bgSize || '';
}

export function loadWallpaper() {
    try {
        const saved = localStorage.getItem(WALLPAPER_KEY);
        if (saved) applyWallpaper(JSON.parse(saved));
    } catch {}
}

export function openWallpaperModal() {
    renderWallpaperGrid();
    const modal = document.getElementById('wallpaperModal');
    if (modal) modal.classList.add('show');
}

export function closeWallpaperModal() {
    const modal = document.getElementById('wallpaperModal');
    if (modal) modal.classList.remove('show');
}

export function renderWallpaperGrid() {
    const grid = document.getElementById('wallpaperGrid');
    if (!grid) return;
    let currentId = 'none';
    try {
        const saved = localStorage.getItem(WALLPAPER_KEY);
        if (saved) currentId = JSON.parse(saved).id || 'none';
    } catch {}

    grid.innerHTML = wallpaperPresets.map(p => {
        const bg = p.value ? p.value : 'var(--bg-card)';
        return '<div class="wallpaper-thumb ' + (p.id === currentId ? 'selected' : '') + '" style="background:' + bg + ';' + (p.bgSize ? 'background-size:' + p.bgSize : '') + '" onclick="selectWallpaper(\'' + p.id + '\')"><div class="wallpaper-thumb-label">' + p.label + '</div></div>';
    }).join('');
}

export function selectWallpaper(id) {
    const preset = wallpaperPresets.find(p => p.id === id);
    if (!preset) return;
    const data = { id: preset.id, value: preset.value, bgSize: preset.bgSize || '' };
    if (preset.id === 'none') {
        localStorage.removeItem(WALLPAPER_KEY);
        applyWallpaper(null);
    } else {
        localStorage.setItem(WALLPAPER_KEY, JSON.stringify(data));
        applyWallpaper(data);
    }
    renderWallpaperGrid();
    showToast(preset.id === 'none' ? 'Wallpaper removed' : 'Wallpaper set!', 'success');
}

export function handleWallpaperUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
        showToast('Image must be under 500KB', 'error');
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = { id: 'custom', value: 'url(' + e.target.result + ')', bgSize: 'cover' };
        localStorage.setItem(WALLPAPER_KEY, JSON.stringify(data));
        applyWallpaper(data);
        renderWallpaperGrid();
        showToast('Custom wallpaper set!', 'success');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

export function clearWallpaper() {
    localStorage.removeItem(WALLPAPER_KEY);
    applyWallpaper(null);
    renderWallpaperGrid();
    showToast('Wallpaper removed', 'success');
}

