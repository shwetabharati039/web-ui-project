// ═══════════════════════════════════════
// CENTRAL APPLICATION STATE
// ═══════════════════════════════════════
import { loadEntries, loadTrash, loadTasks, loadSort } from './storage.js';
import { moodOrder } from './constants.js';

export { moodOrder };

// Persistent State initialized from storage
export let entries = loadEntries();
export let trash = loadTrash();
export let tasks = loadTasks();
export let currentSort = loadSort();

// Transient UI & Form State
export let currentTags = [];
export let currentImages = [];
export let currentRecordings = [];
export let currentPaperTheme = 'lined';
export let autoSaveTimer = null;
export let modalConfirmFn = null;
export let editingEntryId = null;
export let selectedMood = '';

// Calendar State
export let calendarYear = null;
export let calendarMonth = null;

// Prompt State
export let currentPromptCategory = 'all';

// Audio Recording State
export let mediaRecorder = null;
export let mediaChunks = [];
export let recordingStartTime = 0;
export let recordingTimer = null;
export let recordingActive = false;

// State Setters
export function setEntries(v) { entries = v; }
export function setTrash(v) { trash = v; }
export function setTasks(v) { tasks = v; }
export function setCurrentSort(v) { currentSort = v; }
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

