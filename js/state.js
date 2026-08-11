import { loadEntries, loadTrash, loadTasks } from './storage.js';

export const STORAGE_KEY = 'diary_entries';
export const DRAFT_KEY = 'diary_draft';
export const THEME_KEY = 'diary_theme';
export const SCHEDULE_KEY = 'diary_theme_schedule';
export const WALLPAPER_KEY = 'diary_wallpaper';
export const TRASH_KEY = 'diary_trash';
export const PIN_KEY = 'diary_pins';
export const IMAGES_KEY = 'diary_images';
export const PAPER_THEME_KEY = 'diary_paper_theme';
export const FONT_KEY = 'diary_writing_font';
export const REMINDER_KEY = 'diary_reminder';
export const SORT_KEY = 'diary_sort';
export const TASKS_KEY = 'diary_tasks';
export const TASK_REMINDER_KEY = 'diary_task_reminders';

export let entries = loadEntries();
export let trash = loadTrash();
export let tasks = loadTasks();
export let currentTags = [];
export let currentImages = [];
export let currentRecordings = [];
export let currentPaperTheme = 'lined';
export let autoSaveTimer = null;
export let modalConfirmFn = null;
export let editingEntryId = null;
export let selectedMood = '';
export let calendarYear, calendarMonth;
export let currentPromptCategory = 'all';
export let mediaRecorder = null;
export let mediaChunks = [];
export let recordingStartTime = 0;
export let recordingTimer = null;
export let recordingActive = false;

export const moodOrder = {
    '🥰': 0, '😊': 1, '😎': 2, '🎉': 3,
    '😐': 4, '🤔': 5, '😴': 6,
    '😢': 7, '😤': 8, '💔': 9, '📝': 10
};

export let currentSort = 'date-desc';

export function setEntries(v) { entries = v; }
export function setTrash(v) { trash = v; }
export function setTasks(v) { tasks = v; }
export function setCurrentTags(v) { currentTags = v; }
export function setCurrentImages(v) { currentImages = v; }
export function setCurrentRecordings(v) { currentRecordings = v; }
export function setCurrentPaperTheme(v) { currentPaperTheme = v; }
export function setAutoSaveTimer(v) { autoSaveTimer = v; }
export function setModalConfirmFn(v) { modalConfirmFn = v; }
export function setEditingEntryId(v) { editingEntryId = v; }
export function setSelectedMood(v) { selectedMood = v; }
export function setCalendar(y, m) { calendarYear = y; calendarMonth = m; }
export function setPromptCategoryState(v) { currentPromptCategory = v; }
export function setMediaRecorder(v) { mediaRecorder = v; }
export function setMediaChunks(v) { mediaChunks = v; }
export function setRecordingStartTime(v) { recordingStartTime = v; }
export function setRecordingTimer(v) { recordingTimer = v; }
export function setRecordingActive(v) { recordingActive = v; }
export function setCurrentSort(v) { currentSort = v; }
