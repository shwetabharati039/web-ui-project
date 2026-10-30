// ═══════════════════════════════════════
// TUTORIAL / ONBOARDING
// ═══════════════════════════════════════
const TUTORIAL_KEY = 'diary_tutorial_done';
export let tutorialStep = -1;

const tutorialSteps = [
    {
        icon: '🏠',
        title: 'Dashboard',
        selector: '.nav-item[data-page="dashboard"]',
        desc: 'Your <strong>home base</strong>. See all diary entries, writing prompts, and daily streaks at a glance.'
    },
    {
        icon: '✏️',
        title: 'New Entry',
        selector: '.nav-item[data-page="new-entry"]',
        desc: 'Write a new diary entry with <strong>titles, moods, tags, images</strong> and more. Auto-save keeps your draft safe.'
    },
    {
        icon: '📅',
        title: 'Calendar',
        selector: '.nav-item[data-page="calendar"]',
        desc: 'Browse your diary entries by <strong>date</strong>. Click any day to see what you wrote.'
    },
    {
        icon: '📊',
        title: 'Analytics',
        selector: '.nav-item[data-page="analytics"]',
        desc: 'Track your <strong>mood patterns, word counts, top tags</strong> and writing activity over time.'
    },
    {
        icon: '🗑️',
        title: 'Trash',
        selector: '.nav-item[data-page="trash"]',
        desc: 'Deleted entries are kept here for <strong>30 days</strong>. Restore or permanently delete them anytime.'
    },
    {
        icon: '🔥',
        title: 'Writing Streak',
        selector: '.streak-card',
        desc: 'Your <strong>consecutive writing days</strong> count. Keep the streak alive by writing every day!'
    },
    {
        icon: '📥',
        title: 'Export',
        selector: '.export-dropdown .nav-item',
        desc: 'Download all your entries as <strong>TXT or JSON</strong> files. Your data, your control.'
    },
    {
        icon: '🖼️',
        title: 'Wallpaper',
        selector: '.nav-item[onclick="openWallpaperModal()"]',
        desc: 'Personalize your diary with <strong>beautiful wallpapers</strong> or upload your own custom image.'
    },
    {
        icon: '🌙',
        title: 'Dark Mode',
        selector: '.theme-toggle',
        desc: 'Switch between <strong>light and dark themes</strong> for comfortable reading at any time of day.'
    },
    {
        icon: '⏰',
        title: 'Auto Schedule',
        selector: '.auto-schedule-wrap',
        desc: 'Set <strong>automatic dark/light switching</strong> by time. Enable it and choose when each mode activates — perfect for day & night use!'
    },
    {
        icon: '⌨️',
        title: 'Keyboard Shortcuts',
        selector: '.nav-item[onclick="openShortcutsModal()"]',
        desc: 'Speed up your workflow with <strong>keyboard shortcuts</strong> like Ctrl+N for new entry or Ctrl+D for dark mode.'
    },
    {
        icon: '🎯',
        title: 'Writing Prompts',
        selector: '#promptBanner',
        desc: 'Stuck on what to write? Get daily <strong>inspiring prompts</strong> across categories like gratitude, reflection, creativity and more.'
    }
];

function showTutorialWelcome() {
    document.getElementById('tutorialOverlay').classList.add('active');
    document.getElementById('tutorialWelcome').classList.add('visible');
}

window.startTutorial = function() {
    document.getElementById('tutorialWelcome').classList.remove('visible');
    tutorialStep = 0;
    renderTutorialStep();
};

window.skipTutorial = function() {
    endTutorial();
};

window.nextTutorialStep = function() {
    tutorialStep++;
    if (tutorialStep >= tutorialSteps.length) {
        endTutorial();
        return;
    }
    renderTutorialStep();
};

export function renderTutorialStep() {
    const step = tutorialSteps[tutorialStep];
    if (!step) { endTutorial(); return; }

    const overlay = document.getElementById('tutorialOverlay');
    const highlight = document.getElementById('tutorialHighlight');
    const tooltip = document.getElementById('tutorialTooltip');

    overlay.classList.add('active');
    highlight.style.display = 'block';
    tooltip.style.display = 'block';

    document.getElementById('tutorialIcon').textContent = step.icon;
    document.getElementById('tutorialTitle').textContent = step.title;
    document.getElementById('tutorialDesc').innerHTML = step.desc;

    const nextBtn = document.getElementById('tutorialNextBtn');
    nextBtn.textContent = tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next';

    const dots = document.getElementById('tutorialDots');
    dots.innerHTML = tutorialSteps.map((_, i) =>
        '<div class="tutorial-dot' + (i === tutorialStep ? ' active' : '') + '"></div>'
    ).join('');

    const target = document.querySelector(step.selector);
    if (target) {
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        highlight.style.top = (rect.top + scrollTop - 4) + 'px';
        highlight.style.left = (rect.left + scrollLeft - 4) + 'px';
        highlight.style.width = (rect.width + 8) + 'px';
        highlight.style.height = (rect.height + 8) + 'px';

        let tooltipTop, tooltipLeft;
        const tooltipWidth = Math.min(360, window.innerWidth - 32);
        tooltip.style.width = tooltipWidth + 'px';
        const tooltipHeight = tooltip.offsetHeight;
        const placeAbove = rect.bottom + tooltipHeight + 24 > window.innerHeight
            && rect.top > tooltipHeight + 24;

        if (placeAbove) {
            tooltipTop = rect.top + scrollTop - tooltipHeight - 16;
            tooltip.className = 'tutorial-tooltip arrow-bottom';
        } else {
            tooltipTop = rect.bottom + scrollTop + 16;
            tooltip.className = 'tutorial-tooltip arrow-top';
        }

        tooltipLeft = Math.min(
            Math.max(rect.left + scrollLeft, scrollLeft + 16),
            scrollLeft + window.innerWidth - tooltipWidth - 16
        );
        tooltipTop = Math.min(
            Math.max(tooltipTop, scrollTop + 16),
            scrollTop + window.innerHeight - tooltipHeight - 16
        );

        tooltip.style.top = tooltipTop + 'px';
        tooltip.style.left = tooltipLeft + 'px';

        requestAnimationFrame(() => {
            tooltip.classList.add('visible');
        });
    }
};

export function endTutorial() {
    localStorage.setItem(TUTORIAL_KEY, 'done');
    document.getElementById('tutorialOverlay').classList.remove('active');
    document.getElementById('tutorialWelcome').classList.remove('visible');
    document.getElementById('tutorialHighlight').style.display = 'none';
    document.getElementById('tutorialTooltip').style.display = 'none';
    document.getElementById('tutorialTooltip').classList.remove('visible');
    tutorialStep = -1;
}

export function checkTutorial() {
    if (!localStorage.getItem(TUTORIAL_KEY)) {
        setTimeout(showTutorialWelcome, 800);
    }
}

window.addEventListener('resize', function() {
    if (tutorialStep >= 0) renderTutorialStep();
});

window.replayTutorial = function() {
    localStorage.removeItem(TUTORIAL_KEY);
    tutorialStep = -1;
    showTutorialWelcome();
};
