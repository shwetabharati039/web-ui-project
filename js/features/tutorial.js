// ═══════════════════════════════════════
// TUTORIAL / ONBOARDING TOUR
// ═══════════════════════════════════════
import { TUTORIAL_KEY } from '../core/constants.js';

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
    const overlay = document.getElementById('tutorialOverlay');
    const welcome = document.getElementById('tutorialWelcome');
    if (overlay) overlay.classList.add('active');
    if (welcome) welcome.classList.add('visible');
}

export function startTutorial() {
    const welcome = document.getElementById('tutorialWelcome');
    if (welcome) welcome.classList.remove('visible');
    tutorialStep = 0;
    renderTutorialStep();
}

export function skipTutorial() {
    endTutorial();
}

export function nextTutorialStep() {
    tutorialStep++;
    if (tutorialStep >= tutorialSteps.length) {
        endTutorial();
        return;
    }
    renderTutorialStep();
}

export function renderTutorialStep() {
    const step = tutorialSteps[tutorialStep];
    if (!step) { endTutorial(); return; }

    const overlay = document.getElementById('tutorialOverlay');
    const highlight = document.getElementById('tutorialHighlight');
    const tooltip = document.getElementById('tutorialTooltip');

    if (overlay) overlay.classList.add('active');
    if (highlight) highlight.style.display = 'block';
    if (tooltip) tooltip.style.display = 'block';

    const iconEl = document.getElementById('tutorialIcon');
    const titleEl = document.getElementById('tutorialTitle');
    const descEl = document.getElementById('tutorialDesc');
    const nextBtn = document.getElementById('tutorialNextBtn');
    const dots = document.getElementById('tutorialDots');

    if (iconEl) iconEl.textContent = step.icon;
    if (titleEl) titleEl.textContent = step.title;
    if (descEl) descEl.innerHTML = step.desc;
    if (nextBtn) nextBtn.textContent = tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next';

    if (dots) {
        dots.innerHTML = tutorialSteps.map((_, i) =>
            '<div class="tutorial-dot' + (i === tutorialStep ? ' active' : '') + '"></div>'
        ).join('');
    }

    const target = document.querySelector(step.selector);
    if (target && highlight && tooltip) {
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        highlight.style.top = (rect.top + scrollTop - 4) + 'px';
        highlight.style.left = (rect.left + scrollLeft - 4) + 'px';
        highlight.style.width = (rect.width + 8) + 'px';
        highlight.style.height = (rect.height + 8) + 'px';

        let tooltipTop;
        const tooltipWidth = 360;

        if (rect.bottom + 200 > window.innerHeight) {
            tooltipTop = rect.top + scrollTop - 10;
            tooltip.className = 'tutorial-tooltip arrow-bottom';
        } else {
            tooltipTop = rect.bottom + scrollTop + 16;
            tooltip.className = 'tutorial-tooltip arrow-top';
        }

        let tooltipLeft = rect.left + scrollLeft;
        if (tooltipLeft + tooltipWidth > window.innerWidth - 20) {
            tooltipLeft = window.innerWidth - tooltipWidth - 20;
        }
        if (tooltipLeft < 20) tooltipLeft = 20;

        tooltip.style.top = tooltipTop + 'px';
        tooltip.style.left = tooltipLeft + 'px';

        requestAnimationFrame(() => {
            tooltip.classList.add('visible');
            if (rect.bottom + 200 > window.innerHeight) {
                tooltip.style.top = (tooltipTop - tooltip.offsetHeight - 8) + 'px';
            }
        });
    }
}

export function endTutorial() {
    try {
        localStorage.setItem(TUTORIAL_KEY, 'done');
    } catch {}
    const overlay = document.getElementById('tutorialOverlay');
    const welcome = document.getElementById('tutorialWelcome');
    const highlight = document.getElementById('tutorialHighlight');
    const tooltip = document.getElementById('tutorialTooltip');

    if (overlay) overlay.classList.remove('active');
    if (welcome) welcome.classList.remove('visible');
    if (highlight) highlight.style.display = 'none';
    if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.classList.remove('visible');
    }
    tutorialStep = -1;
}

export function checkTutorial() {
    try {
        if (!localStorage.getItem(TUTORIAL_KEY)) {
            setTimeout(showTutorialWelcome, 800);
        }
    } catch {}
}

export function replayTutorial() {
    try {
        localStorage.removeItem(TUTORIAL_KEY);
    } catch {}
    tutorialStep = -1;
    showTutorialWelcome();
}

// Window resize handler for active tutorial
window.addEventListener('resize', function() {
    if (tutorialStep >= 0) renderTutorialStep();
});

