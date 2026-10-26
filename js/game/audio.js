// ═══════════════════════════════════════
// GAME AUDIO SYNTHESIZER
// ═══════════════════════════════════════
import { MC_SOUND_KEY } from './constants.js';

let gameAudio = null;
let mcSoundOn = false;

export function gameAudioEnabled() {
    try {
        mcSoundOn = localStorage.getItem(MC_SOUND_KEY) === '1';
    } catch {
        mcSoundOn = false;
    }
}

export function isSoundOn() {
    return mcSoundOn;
}

export function ensureGameAudio() {
    try {
        if (!gameAudio) {
            gameAudio = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (gameAudio.state === 'suspended') {
            gameAudio.resume();
        }
    } catch {}
}

export function playFx(kind) {
    if (!mcSoundOn || !gameAudio) return;
    const ac = gameAudio;
    const t = ac.currentTime;

    const osc = (freq, dur, type, vol, endFreq) => {
        try {
            const o = ac.createOscillator();
            const gn = ac.createGain();
            o.type = type;
            o.frequency.setValueAtTime(freq, t);
            if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
            gn.gain.setValueAtTime(vol, t);
            gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(gn);
            gn.connect(ac.destination);
            o.start(t);
            o.stop(t + dur + 0.02);
        } catch {}
    };

    const noise = (dur, vol, freq, q) => {
        try {
            const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
            const dd = buf.getChannelData(0);
            for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / dd.length);
            const src = ac.createBufferSource();
            src.buffer = buf;
            const fl = ac.createBiquadFilter();
            fl.type = 'lowpass';
            fl.frequency.value = freq;
            fl.Q.value = q || 1;
            const gn = ac.createGain();
            gn.gain.setValueAtTime(vol, t);
            gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(fl);
            fl.connect(gn);
            gn.connect(ac.destination);
            src.start(t);
            src.stop(t + dur);
        } catch {}
    };

    if (kind === 'break') {
        noise(0.08, 0.18, 900, 1);
        osc(240, 0.08, 'square', 0.08, 160);
    } else if (kind === 'place') {
        noise(0.04, 0.1, 1500, 0.8);
        osc(300, 0.06, 'square', 0.07, 220);
    } else if (kind === 'jump') {
        osc(260, 0.09, 'square', 0.06, 520);
    } else if (kind === 'click') {
        osc(500, 0.04, 'square', 0.06);
    }
}

export function toggleGameSound() {
    mcSoundOn = !mcSoundOn;
    try {
        localStorage.setItem(MC_SOUND_KEY, mcSoundOn ? '1' : '0');
    } catch {}
    const btn = document.getElementById('gameSoundBtn');
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-' + (mcSoundOn ? 'volume-high' : 'volume-xmark') + '"></i>';
    }
    if (mcSoundOn) {
        ensureGameAudio();
        playFx('click');
    }
    return mcSoundOn;
}

