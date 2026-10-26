// ═══════════════════════════════════════
// PROMPTS & TIPS UI
// ═══════════════════════════════════════
import { prompts, writingTips } from './prompts.js';
import { currentPromptCategory, setPromptCategoryState } from '../core/state.js';
import { resetForm, autoSaveDraft } from './form.js';
import { navigateTo } from '../core/router.js';

function getPromptSeed() {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

export function renderPromptBanner() {
    const categories = Object.keys(prompts);
    const catRow = document.getElementById('promptCategories');
    if (!catRow) return;

    catRow.innerHTML = '<button class="prompt-chip ' + (currentPromptCategory === 'all' ? 'active' : '') + '" onclick="setPromptCategory(\'all\')">All</button>' +
        categories.map(c => '<button class="prompt-chip ' + (currentPromptCategory === c ? 'active' : '') + '" onclick="setPromptCategory(\'' + c + '\')">' + c.charAt(0).toUpperCase() + c.slice(1) + '</button>').join('');

    let pool;
    if (currentPromptCategory === 'all') {
        pool = categories.reduce((acc, c) => acc.concat(prompts[c]), []);
    } else {
        pool = prompts[currentPromptCategory] || [];
    }

    const seed = getPromptSeed() + currentPromptCategory.length;
    const idx = Math.floor(seededRandom(seed) * pool.length);
    const promptEl = document.getElementById('promptText');
    if (promptEl) promptEl.textContent = pool[idx] || "Write about whatever comes to mind today.";
}

export function setPromptCategory(cat) {
    setPromptCategoryState(cat);
    renderPromptBanner();
}

export function usePrompt() {
    const promptEl = document.getElementById('promptText');
    const prompt = promptEl ? promptEl.textContent : '';
    resetForm();
    const titleEl = document.getElementById('entryTitle');
    if (titleEl) titleEl.value = prompt;
    navigateTo('new-entry');
    autoSaveDraft();
}

export function refreshPrompt() {
    const seed = getPromptSeed() + Date.now();
    let pool;
    if (currentPromptCategory === 'all') {
        pool = Object.keys(prompts).reduce((acc, c) => acc.concat(prompts[c]), []);
    } else {
        pool = prompts[currentPromptCategory] || [];
    }
    const idx = Math.floor(seededRandom(seed) * pool.length);
    const promptEl = document.getElementById('promptText');
    if (promptEl) promptEl.textContent = pool[idx];
}

export function renderWritingTip() {
    const seed = getPromptSeed();
    const idx = Math.floor(seededRandom(seed + 7) * writingTips.length);
    const tipEl = document.getElementById('writingTipText');
    if (tipEl) tipEl.innerHTML = '<strong>Writing Tip:</strong> ' + writingTips[idx];
}

