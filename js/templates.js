// ═══════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════
import { selectedMood, setSelectedMood } from './state.js';
import { resetForm, updateWordCount } from './navigation.js';
import { autoSaveDraft } from './storage.js';
import { showToast } from './ui.js';

export const templates = [
    {
        id: 'gratitude',
        label: 'Gratitude',
        icon: '🙏',
        desc: 'What you\'re thankful for',
        title: 'Gratitude Journal',
        mood: '😊',
        content: '<h3>Today I\'m grateful for...</h3><ul><li><br></li><li><br></li><li><br></li></ul><p><br></p><h3>Something that made me smile today:</h3><p><br></p><h3>Someone who made a difference:</h3><p><br></p>'
    },
    {
        id: 'reflection',
        label: 'Reflection',
        icon: '🤔',
        desc: 'Look back on your day',
        title: 'Daily Reflection',
        mood: '🤔',
        content: '<h3>What went well today?</h3><p><br></p><h3>What could I have done better?</h3><p><br></p><h3>What did I learn?</h3><p><br></p><h3>How am I feeling right now?</h3><p><br></p>'
    },
    {
        id: 'daily_log',
        label: 'Daily Log',
        icon: '📋',
        desc: 'Log your day\'s events',
        title: 'Daily Log',
        mood: '📝',
        content: '<h3>Morning</h3><p><br></p><h3>Afternoon</h3><p><br></p><h3>Evening</h3><p><br></p><h3>Today\'s Highlight</h3><p><br></p>'
    },
    {
        id: 'morning_pages',
        label: 'Morning Pages',
        icon: '🌅',
        desc: 'Free-write your morning',
        title: 'Morning Pages',
        mood: '😊',
        content: '<p><i>Free write without stopping or editing. Let your thoughts flow...</i></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p>'
    },
    {
        id: 'evening_review',
        label: 'Evening Review',
        icon: '🌙',
        desc: 'Wind down and reflect',
        title: 'Evening Review',
        mood: '😴',
        content: '<h3>Today\'s Wins</h3><p><br></p><h3>Challenges I Faced</h3><p><br></p><h3>What I\'m Looking Forward To Tomorrow</h3><p><br></p><h3>Gratitude of the Day</h3><p><br></p>'
    },
    {
        id: 'week_review',
        label: 'Week Review',
        icon: '📅',
        desc: 'Review your past week',
        title: 'Weekly Review',
        mood: '🤔',
        content: '<h3>Biggest Accomplishment This Week</h3><p><br></p><h3>What Challenged Me</h3><p><br></p><h3>Something I Learned</h3><p><br></p><h3>My Goal for Next Week</h3><p><br></p>'
    },
    {
        id: 'dream_journal',
        label: 'Dream Journal',
        icon: '💭',
        desc: 'Record your dreams',
        title: 'Dream Journal',
        mood: '😴',
        content: '<h3>Dream Summary</h3><p><br></p><h3>Key Symbols / Images</h3><ul><li><br></li><li><br></li><li><br></li></ul><h3>Emotions I Felt</h3><p><br></p>'
    },
    {
        id: 'goal_setting',
        label: 'Goal Setting',
        icon: '🎯',
        desc: 'Set and track goals',
        title: 'My Goals',
        mood: '😎',
        content: '<h3>Short-term Goals (This Month)</h3><ul><li><br></li><li><br></li><li><br></li></ul><h3>Long-term Goals (This Year)</h3><ul><li><br></li><li><br></li></ul><h3>Steps I\'ll Take Tomorrow</h3><p><br></p>'
    },
    {
        id: 'free_write',
        label: 'Free Writing',
        icon: '✍️',
        desc: 'Write without limits',
        title: 'Free Writing',
        mood: '📝',
        content: '<p><i>Write whatever comes to mind. No rules, no editing — just let it flow.</i></p><p><br></p><p><br></p><p><br></p><p><br></p>'
    }
];

// ═══════════════════════════════════════
// TEMPLATE RENDERER
// ═══════════════════════════════════════
export function renderTemplateGrid() {
    const grid = document.getElementById('templateGrid');
    if (!grid) return;
    grid.innerHTML = templates.map(t =>
        '<div class="template-card" onclick="applyTemplate(\'' + t.id + '\')">' +
            '<div class="template-card-icon">' + t.icon + '</div>' +
            '<div class="template-card-label">' + t.label + '</div>' +
            '<div class="template-card-desc">' + t.desc + '</div>' +
        '</div>'
    ).join('');
}

window.applyTemplate = function(id) {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;

    resetForm();

    document.getElementById('entryTitle').value = tpl.title;

    const editor = document.getElementById('entryContent');
    editor.innerHTML = tpl.content;

    if (tpl.mood) {
        setSelectedMood(tpl.mood);
        document.querySelectorAll('.mood-option').forEach(m => {
            m.classList.toggle('selected', m.dataset.mood === selectedMood);
        });
    }

    // Scroll to editor
    editor.focus();
    // Place cursor at first empty position
    const range = document.createRange();
    const sel = window.getSelection();
    const firstEmpty = editor.querySelector('br') || editor;
    range.setStart(firstEmpty, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    updateWordCount();
    autoSaveDraft();
    showToast('Template applied: ' + tpl.label, 'success');
};

