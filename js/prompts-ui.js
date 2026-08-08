function getPromptSeed() {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function renderPromptBanner() {
    const categories = Object.keys(prompts);
    const catRow = document.getElementById('promptCategories');
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
    document.getElementById('promptText').textContent = pool[idx] || "Write about whatever comes to mind today.";
}

window.setPromptCategory = function(cat) {
    currentPromptCategory = cat;
    renderPromptBanner();
};

window.usePrompt = function() {
    const prompt = document.getElementById('promptText').textContent;
    resetForm();
    document.getElementById('entryTitle').value = prompt;
    navigateTo('new-entry');
    autoSaveDraft();
};

window.refreshPrompt = function() {
    const seed = getPromptSeed() + Date.now();
    let pool;
    if (currentPromptCategory === 'all') {
        pool = Object.keys(prompts).reduce((acc, c) => acc.concat(prompts[c]), []);
    } else {
        pool = prompts[currentPromptCategory] || [];
    }
    const idx = Math.floor(seededRandom(seed) * pool.length);
    document.getElementById('promptText').textContent = pool[idx];
};

function renderWritingTip() {
    const seed = getPromptSeed();
    const idx = Math.floor(seededRandom(seed + 7) * writingTips.length);
    document.getElementById('writingTipText').innerHTML = '<strong>Writing Tip:</strong> ' + writingTips[idx];
}
