// ═══════════════════════════════════════
// VOICE RECORDING
// ═══════════════════════════════════════
const MAX_RECORDINGS = 3;
const MAX_RECORDING_SECONDS = 120;
const VOICE_QUOTA_LIMIT = 4.5 * 1024 * 1024;

let playingAudio = null;
let playingIndex = -1;
let recordingMimeType = 'audio/webm';

window.toggleRecording = function() {
    if (recordingActive) {
        stopRecording();
    } else {
        startRecording();
    }
};

async function startRecording() {
    if (currentRecordings.length >= MAX_RECORDINGS) {
        showToast('Maximum ' + MAX_RECORDINGS + ' recordings per entry', 'error');
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Voice recording is not supported in this browser', 'error');
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = pickMimeType();
        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recordingMimeType = mediaRecorder.mimeType || 'audio/webm';
        mediaChunks = [];
        mediaRecorder.ondataavailable = function(e) {
            if (e.data && e.data.size > 0) mediaChunks.push(e.data);
        };
        mediaRecorder.onstop = function() {
            stream.getTracks().forEach(function(t) { t.stop(); });
            finalizeRecording();
        };
        mediaRecorder.start(250);
        recordingActive = true;
        recordingStartTime = Date.now();
        updateRecordingUI();
        recordingTimer = setInterval(updateRecordingTimer, 250);
        showToast('Recording started — click Stop when done', 'success');
    } catch (err) {
        showToast('Microphone access denied or unavailable', 'error');
    }
}

function pickMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (let i = 0; i < types.length; i++) {
        if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return '';
}

window.stopRecording = function() {
    if (!recordingActive || !mediaRecorder) return;
    clearInterval(recordingTimer);
    if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    recordingActive = false;
    resetRecordingUI();
};

function finalizeRecording() {
    const blob = new Blob(mediaChunks, { type: recordingMimeType });
    if (blob.size === 0) {
        showToast('Recording failed — nothing captured', 'error');
        resetRecordingUI();
        return;
    }
    const approxSize = blob.size * 1.4;
    const usage = (localStorage.getItem(STORAGE_KEY) || '').length + (localStorage.getItem(DRAFT_KEY) || '').length;
    if (usage + approxSize > VOICE_QUOTA_LIMIT) {
        showToast('Recording too large to store — try a shorter clip', 'error');
        resetRecordingUI();
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        currentRecordings.push({
            dataUrl: e.target.result,
            duration: (Date.now() - recordingStartTime) / 1000,
            createdAt: Date.now()
        });
        renderRecordingList();
        autoSaveDraft();
    };
    reader.readAsDataURL(blob);
}

function updateRecordingTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const timer = document.getElementById('voiceTimer');
    if (timer) timer.textContent = formatTime(elapsed);
    if (elapsed >= MAX_RECORDING_SECONDS) {
        showToast('Reached the ' + MAX_RECORDING_SECONDS + ' second limit', 'success');
        stopRecording();
    }
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function updateRecordingUI() {
    const btn = document.getElementById('voiceRecordBtn');
    const timer = document.getElementById('voiceTimer');
    const status = document.getElementById('voiceStatus');
    const dot = document.getElementById('voiceStatusDot');
    const text = document.getElementById('voiceStatusText');
    if (!btn) return;
    if (recordingActive) {
        btn.classList.add('recording');
        btn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
        timer.style.display = 'block';
        timer.textContent = '0:00';
        status.classList.add('recording');
        dot.classList.add('active');
        text.textContent = 'Recording...';
    } else {
        resetRecordingUI();
    }
}

function resetRecordingUI() {
    const btn = document.getElementById('voiceRecordBtn');
    const timer = document.getElementById('voiceTimer');
    const status = document.getElementById('voiceStatus');
    const dot = document.getElementById('voiceStatusDot');
    const text = document.getElementById('voiceStatusText');
    if (!btn) return;
    btn.classList.remove('recording');
    btn.innerHTML = '<i class="fa-solid fa-microphone"></i> Record';
    timer.style.display = 'none';
    status.classList.remove('recording');
    dot.classList.remove('active');
    text.textContent = 'Click record to capture your thoughts';
}

function renderRecordingList() {
    const list = document.getElementById('voiceRecordingList');
    if (!list) { list.innerHTML = ''; return; }
    if (currentRecordings.length === 0) {
        list.innerHTML = '';
        return;
    }
    list.innerHTML = currentRecordings.map((r, i) =>
        '<div class="voice-recording-item">' +
            '<button class="voice-play-btn" onclick="playRecording(' + i + ')" title="Play"><i class="fa-solid fa-play"></i></button>' +
            '<div class="voice-recording-info">' +
                '<span class="voice-recording-name">Recording ' + (i + 1) + '</span>' +
                '<span class="voice-recording-duration">' + formatTime(Math.round(r.duration || 0)) + '</span>' +
            '</div>' +
            '<button class="voice-remove-btn" onclick="removeRecording(' + i + ')" title="Remove"><i class="fa-solid fa-trash-can"></i></button>' +
        '</div>'
    ).join('');
}

window.playRecording = function(index) {
    const r = currentRecordings[index];
    if (!r) return;
    if (playingAudio && playingIndex === index) {
        playingAudio.pause();
        playingAudio = null;
        updatePlayBtn(index, false);
        return;
    }
    if (playingAudio) {
        playingAudio.pause();
        updatePlayBtn(playingIndex, false);
    }
    const audio = new Audio(r.dataUrl);
    playingAudio = audio;
    playingIndex = index;
    updatePlayBtn(index, true);
    audio.onended = function() {
        playingAudio = null;
        playingIndex = -1;
        updatePlayBtn(index, false);
    };
    audio.play();
};

function updatePlayBtn(index, playing) {
    const btns = document.querySelectorAll('.voice-play-btn');
    if (btns[index]) {
        btns[index].innerHTML = playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    }
}

window.removeRecording = function(index) {
    if (playingAudio && playingIndex === index) {
        playingAudio.pause();
        playingAudio = null;
        playingIndex = -1;
    }
    currentRecordings.splice(index, 1);
    renderRecordingList();
    autoSaveDraft();
};

function stopPreviewAudio() {
    if (playingAudio) {
        playingAudio.pause();
        playingAudio = null;
        playingIndex = -1;
    }
    document.querySelectorAll('.voice-play-btn').forEach(function(b) {
        b.innerHTML = '<i class="fa-solid fa-play"></i>';
    });
}

// Play a saved recording from the entry detail view
window.playSavedRecording = function(btn, entryId, index) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry || !entry.recordings || !entry.recordings[index]) return;
    const rec = entry.recordings[index];
    let audio = btn._audio;
    if (audio && !audio.paused) {
        audio.pause();
        btn.innerHTML = '<i class="fa-solid fa-play"></i>';
        return;
    }
    if (!audio) {
        audio = new Audio(rec.dataUrl);
        btn._audio = audio;
        audio.onended = function() { btn.innerHTML = '<i class="fa-solid fa-play"></i>'; };
    }
    btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    audio.play();
};
