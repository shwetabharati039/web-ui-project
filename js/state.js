const STORAGE_KEY = 'diary_entries';
const DRAFT_KEY = 'diary_draft';
const THEME_KEY = 'diary_theme';
const SCHEDULE_KEY = 'diary_theme_schedule';
const WALLPAPER_KEY = 'diary_wallpaper';
const TRASH_KEY = 'diary_trash';
const PIN_KEY = 'diary_pins';
const IMAGES_KEY = 'diary_images';
const PAPER_THEME_KEY = 'diary_paper_theme';
const FONT_KEY = 'diary_writing_font';
const REMINDER_KEY = 'diary_reminder';
const SORT_KEY = 'diary_sort';
const TASKS_KEY = 'diary_tasks';
const TASK_REMINDER_KEY = 'diary_task_reminders';

let entries = loadEntries();
let trash = loadTrash();
let tasks = loadTasks();
let currentTags = [];
let currentImages = [];
let currentPaperTheme = 'lined';
let autoSaveTimer = null;
let modalConfirmFn = null;
let editingEntryId = null;
let selectedMood = '';
let calendarYear, calendarMonth;
let currentPromptCategory = 'all';

const moodOrder = {
    '🥰': 0, '😊': 1, '😎': 2, '🎉': 3,
    '😐': 4, '🤔': 5, '😴': 6,
    '😢': 7, '😤': 8, '💔': 9, '📝': 10
};

let currentSort = 'date-desc';
