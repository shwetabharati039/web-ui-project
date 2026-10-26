// ═══════════════════════════════════════
// INDEX CRAFT — VOXEL SANDBOX CONTROLLER
// ═══════════════════════════════════════
import { BLK, HOTBAR, WORLD_SX, WORLD_SY, WORLD_SZ, FOV, tanF } from './constants.js';
import { mulberry32 } from './math.js';
import { WORLD, buildWorld, blockAt, isSolid, blockBase, idx } from './world.js';
import { ensureGameAudio, playFx, gameAudioEnabled, toggleGameSound, isSoundOn } from './audio.js';
import { resizeRT, renderWorld, traceRay } from './renderer.js';
import { updatePlayer } from './physics.js';

export { gameAudioEnabled, toggleGameSound };

export let gameInstance = null;
let gameRafId = null;

function getGameCanvas() {
    return document.getElementById('gameCanvas');
}

function setGameOverlay(state) {
    const overlay = document.getElementById('gameOverlay');
    const title = document.getElementById('gameOverlayTitle');
    const text = document.getElementById('gameOverlayText');
    const btn = document.getElementById('gameOverlayBtn');
    if (!overlay) return;

    if (state === 'hidden') {
        overlay.style.display = 'none';
        return;
    }
    overlay.style.display = 'flex';
    if (state === 'menu') {
        if (title) title.textContent = 'Index Craft';
        if (text) text.innerHTML = 'A blocky voxel world rendered with real-time path tracing. Mine and build anything.<br><strong>WASD</strong> move · <strong>Mouse</strong> look · <strong>Left click</strong> break · <strong>Right click</strong> place · <strong>Space</strong> jump · <strong>1-9</strong> select block';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> Enter World';
    } else if (state === 'paused') {
        if (title) title.textContent = 'Paused';
        if (text) text.innerHTML = 'Mission on hold. The world is still there waiting for you.';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
    }
}

function createGame(menuMode) {
    const canvas = getGameCanvas();
    if (!canvas) return null;
    const wrap = canvas.parentElement;
    canvas.width = Math.max(360, wrap.clientWidth);
    canvas.height = 520;

    const cam = menuMode
        ? { x: WORLD_SX * 0.5, y: 27, z: WORLD_SZ * 0.82, yaw: -2.3, pitch: -0.13 }
        : { x: WORLD_SX * 0.5, y: 22, z: WORLD_SZ * 0.5, yaw: 0.7, pitch: -0.05 };

    const g = {
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        scale: 3,
        cam: cam,
        prevCam: null,
        velY: 0,
        onGround: false,
        keys: {},
        sens: 0.0026,
        fov: FOV,
        reach: 5,
        held: 0,
        hotbar: HOTBAR.slice(),
        breakHeld: false,
        placeCd: 0,
        breakCd: 0,
        particles: [],
        state: 'menu',
        running: false,
        sampleN: 0,
        dirty: true,
        rng: null,
        frameCount: 0,
        dtSum: 0,
        dtCount: 0
    };
    resizeRT(g);
    return g;
}

function updateCameraForRender(g) {
    const c = g.cam;
    const pc = g.prevCam;
    if (!pc) {
        g.prevCam = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch };
        g.dirty = true;
        return;
    }
    if (Math.abs(pc.x - c.x) > 1e-4 || Math.abs(pc.y - c.y) > 1e-4 || Math.abs(pc.z - c.z) > 1e-4 ||
        Math.abs(pc.yaw - c.yaw) > 1e-4 || Math.abs(pc.pitch - c.pitch) > 1e-4) {
        g.dirty = true;
        pc.x = c.x; pc.y = c.y; pc.z = c.z; pc.yaw = c.yaw; pc.pitch = c.pitch;
    }
}

function resetAcc(g) {
    g.acc.fill(0);
    g.sampleN = 0;
    g.dirty = false;
}

function proj(g, wx, wy, wz) {
    const c = g.cam;
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    const fx = cy * cp, fy = sp, fz = sy * cp;
    const rx = -sy, ry = 0, rz = cy;
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
    const dx = wx - c.x, dy = wy - c.y, dz = wz - c.z;
    const depth = dx * fx + dy * fy + dz * fz;
    if (depth < 0.1) return null;
    const xs = dx * rx + dy * ry + dz * rz;
    const ys = dx * ux + dy * uy + dz * uz;
    const sc = (g.canvas.height * 0.5) / (tanF * depth);
    return { x: g.canvas.width / 2 + xs * sc, y: g.canvas.height / 2 - ys * sc, d: depth };
}

function getTarget(g) {
    const c = g.cam;
    const dx = Math.cos(c.yaw) * Math.cos(c.pitch), dy = Math.sin(c.pitch), dz = Math.sin(c.yaw) * Math.cos(c.pitch);
    const res = traceRay(c.x, c.y, c.z, dx, dy, dz, g.reach, 0);
    if (!res.hit) return null;
    return { hit: { x: res.x, y: res.y, z: res.z }, place: { x: res.x + res.nx, y: res.y + res.ny, z: res.z + res.nz } };
}

function spawnBreakParticles(g, cell, id) {
    const col = blockBase(id);
    const colStr = 'rgb(' + Math.round(col[0] * 255) + ',' + Math.round(col[1] * 255) + ',' + Math.round(col[2] * 255) + ')';
    for (let i = 0; i < 12; i++) {
        g.particles.push({
            x: cell.x + 0.2 + Math.random() * 0.6,
            y: cell.y + 0.2 + Math.random() * 0.6,
            z: cell.z + 0.2 + Math.random() * 0.6,
            vx: (Math.random() - 0.5) * 0.4,
            vy: Math.random() * 0.5,
            vz: (Math.random() - 0.5) * 0.4,
            life: 0.6 + Math.random() * 0.4,
            maxLife: 1,
            color: colStr
        });
    }
}

function breakBlock(g) {
    const tgt = getTarget(g);
    if (!tgt) return;
    const id = blockAt(tgt.hit.x, tgt.hit.y, tgt.hit.z);
    if (id === BLK.AIR || id === BLK.BEDROCK) return;
    WORLD[idx(tgt.hit.x, tgt.hit.y, tgt.hit.z)] = BLK.AIR;
    g.dirty = true;
    playFx('break');
    spawnBreakParticles(g, tgt.hit, id);
}

function placeBlock(g) {
    const tgt = getTarget(g);
    if (!tgt) return;
    const p = tgt.place;
    if (p.y < 0 || p.y >= WORLD_SY) return;
    const c = g.cam;
    if (Math.abs(p.x + 0.5 - c.x) < 0.6 && Math.abs(p.z + 0.5 - c.z) < 0.6 && p.y + 1 > c.y && p.y < c.y + 1.8) return;
    const id = g.hotbar[g.held];
    if (!id || id === BLK.AIR) return;
    const cur = blockAt(p.x, p.y, p.z);
    if (cur !== BLK.AIR && cur !== BLK.WATER) return;
    WORLD[idx(p.x, p.y, p.z)] = id;
    g.dirty = true;
    playFx('place');
}

function updateGame(g, dt) {
    updatePlayer(g, dt);
    g.breakCd -= dt;
    g.placeCd -= dt;
    if (g.breakHeld && g.breakCd <= 0) {
        g.breakCd = 0.22;
        breakBlock(g);
    }
    for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.vy -= 0.02 * dt * 60;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.z += p.vz * dt * 60;
        p.life -= dt;
        if (p.life <= 0 || p.y < 0) g.particles.splice(i, 1);
    }
}

function drawBlockOutline(g, cell, color) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
        const p = proj(g, cell.x + (i & 1), cell.y + ((i >> 1) & 1), cell.z + ((i >> 2) & 1));
        pts.push(p);
    }
    for (let i = 0; i < 8; i++) if (!pts[i]) return;
    const ctx = g.ctx;
    const edges = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let e = 0; e < edges.length; e++) {
        const a = pts[edges[e][0]], b = pts[edges[e][1]];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
}

function drawHotbar(g) {
    const ctx = g.ctx, W = g.canvas.width, H = g.canvas.height;
    const slots = 9, sw = 44, sh = 44, gap = 4;
    const total = slots * sw + (slots - 1) * gap;
    let x = (W - total) / 2, y = H - sh - 14;

    for (let i = 0; i < slots; i++) {
        const id = g.hotbar[i];
        ctx.fillStyle = i === g.held ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)';
        ctx.fillRect(x - 2, y - 2, sw + 4, sh + 4);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, sw, sh);
        const col = blockBase(id);
        ctx.fillStyle = 'rgb(' + Math.round(col[0] * 255) + ',' + Math.round(col[1] * 255) + ',' + Math.round(col[2] * 255) + ')';
        ctx.fillRect(x + 7, y + 7, sw - 14, sh - 14);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(i + 1, x + 4, y + 12);
    }
    ctx.textAlign = 'left';
}

function drawParticles(g) {
    const ctx = g.ctx;
    for (let i = 0; i < g.particles.length; i++) {
        const p = g.particles[i];
        const pr = proj(g, p.x, p.y, p.z);
        if (!pr) continue;
        const s = Math.max(2, 26 / pr.d);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.fillStyle = p.color;
        ctx.fillRect(pr.x - s / 2, pr.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
}

function drawOverlays(g) {
    const ctx = g.ctx, W = g.canvas.width, H = g.canvas.height;
    const cx = W / 2, cy = H / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy); ctx.lineTo(cx - 2, cy);
    ctx.moveTo(cx + 2, cy); ctx.lineTo(cx + 7, cy);
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy - 2);
    ctx.moveTo(cx, cy + 2); ctx.lineTo(cx, cy + 7);
    ctx.stroke();
    if (g.state === 'playing') {
        const tgt = getTarget(g);
        if (tgt) drawBlockOutline(g, tgt.hit, 'rgba(0,0,0,0.6)');
    }
    drawParticles(g);
    if (g.state === 'playing') drawHotbar(g);
}

function loop(t) {
    const g = gameInstance;
    if (!g || !g.running) return;
    if (!g.lastTime) g.lastTime = t;
    let dt = (t - g.lastTime) / 1000;
    g.lastTime = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0.0167;
    g.frameCount++;
    g.dtSum += dt;
    g.dtCount++;

    if (g.dtCount >= 30) {
        const avg = g.dtSum / g.dtCount;
        g.dtSum = 0; g.dtCount = 0;
        let want = g.scale;
        if (avg > 0.045 && g.scale < 6) want = g.scale + 0.5;
        else if (avg < 0.022 && g.scale > 2) want = g.scale - 0.5;
        if (want !== g.scale) { g.scale = want; resizeRT(g); }
    }

    if (g.state === 'playing') updateGame(g, dt);
    g.rng = mulberry32(g.frameCount * 2654435761);
    updateCameraForRender(g);
    if (g.dirty) resetAcc(g);
    renderWorld(g);
    drawOverlays(g);
    gameRafId = requestAnimationFrame(loop);
}

function requestPointerLock() {
    const c = getGameCanvas();
    if (c && c.requestPointerLock) {
        try { c.requestPointerLock(); } catch {}
    }
}

export function startGame() {
    const g = createGame(false);
    if (!g) return;
    gameInstance = g;
    ensureGameAudio();
    const sx = WORLD_SX / 2, sz = WORLD_SZ / 2;
    let sy = WORLD_SY - 1;
    while (sy > 0 && !isSolid(blockAt(Math.floor(sx), sy, Math.floor(sz)))) sy--;
    g.cam.x = sx + 0.5;
    g.cam.y = sy + 1.02;
    g.cam.z = sz + 0.5;
    g.cam.yaw = 0.7;
    g.cam.pitch = -0.05;
    g.state = 'playing';
    g.running = true;
    g.dirty = true;
    setGameOverlay('hidden');
    requestPointerLock();
    if (gameRafId) cancelAnimationFrame(gameRafId);
    g.lastTime = 0;
    gameRafId = requestAnimationFrame(loop);
}

export function pauseGame() {
    const g = gameInstance;
    if (!g || g.state !== 'playing') return;
    g.state = 'paused';
    g.breakHeld = false;
    if (document.pointerLockElement) document.exitPointerLock();
    setGameOverlay('paused');
}

export function resumeGame() {
    const g = gameInstance;
    if (!g || g.state !== 'paused') return;
    g.state = 'playing';
    setGameOverlay('hidden');
    requestPointerLock();
}

export function togglePause() {
    const g = gameInstance;
    if (!g) return;
    if (g.state === 'playing') pauseGame();
    else if (g.state === 'paused') resumeGame();
}

export function gameOverlayAction() {
    const g = gameInstance;
    if (g && g.state === 'paused') resumeGame();
    else startGame();
}

export function leaveGamePage() {
    const g = gameInstance;
    if (!g) return;
    if (g.state === 'playing') g.state = 'paused';
    g.running = false;
    g.breakHeld = false;
    if (document.pointerLockElement) document.exitPointerLock();
    if (gameRafId) cancelAnimationFrame(gameRafId);
    gameRafId = null;
}

export function openGamePage() {
    gameAudioEnabled();
    const canvas = getGameCanvas();
    if (!canvas) return;
    const wrap = canvas.parentElement;
    canvas.width = Math.max(360, wrap.clientWidth);
    canvas.height = 520;

    if (!WORLD) buildWorld();

    const fb = document.getElementById('fpsFireBtn');
    if (fb) fb.style.display = ('ontouchstart' in window) ? 'block' : 'none';
    const sbtn = document.getElementById('gameSoundBtn');
    if (sbtn) sbtn.innerHTML = '<i class="fa-solid fa-' + (isSoundOn() ? 'volume-high' : 'volume-xmark') + '"></i>';

    const g = gameInstance;
    if (g && g.state === 'paused') {
        setGameOverlay('paused');
        if (!g.running) {
            g.running = true;
            g.lastTime = 0;
            if (gameRafId) cancelAnimationFrame(gameRafId);
            gameRafId = requestAnimationFrame(loop);
        }
        return;
    }

    if (gameRafId) cancelAnimationFrame(gameRafId);
    gameRafId = null;
    gameInstance = null;
    const idle = createGame(true);
    gameInstance = idle;
    idle.running = true;
    idle.lastTime = 0;
    idle.state = 'menu';
    setGameOverlay('menu');
    gameRafId = requestAnimationFrame(loop);
}

export function setupGameCanvasEvents() {
    const canvas = getGameCanvas();
    if (!canvas) return;

    document.addEventListener('pointerlockchange', function() {
        const g = gameInstance;
        if (!g) return;
        const locked = document.pointerLockElement === getGameCanvas();
        if (!locked && g.state === 'playing' && g.running) pauseGame();
    });

    canvas.addEventListener('mousemove', function(e) {
        const g = gameInstance;
        if (!g || !g.running) return;
        if (document.pointerLockElement === canvas) {
            g.cam.yaw += e.movementX * g.sens;
            g.cam.pitch -= e.movementY * g.sens * 0.8;
            if (g.cam.pitch > 1.4) g.cam.pitch = 1.4;
            if (g.cam.pitch < -1.4) g.cam.pitch = -1.4;
        } else if (g.dragLook) {
            g.cam.yaw += (e.clientX - g.lastPX) * g.sens * 2;
            g.cam.pitch -= (e.clientY - g.lastPY) * g.sens * 1.6;
            if (g.cam.pitch > 1.4) g.cam.pitch = 1.4;
            if (g.cam.pitch < -1.4) g.cam.pitch = -1.4;
            g.lastPX = e.clientX;
            g.lastPY = e.clientY;
        }
    });

    canvas.addEventListener('mousedown', function(e) {
        const g = gameInstance;
        if (!g || !g.running || g.state !== 'playing') return;
        if (document.pointerLockElement === canvas) {
            if (e.button === 0) g.breakHeld = true;
            else if (e.button === 2) { placeBlock(g); g.placeCd = 0.28; }
        } else {
            g.dragLook = true;
            g.lastPX = e.clientX;
            g.lastPY = e.clientY;
        }
        e.preventDefault();
    });

    window.addEventListener('mouseup', function(e) {
        const g = gameInstance;
        if (!g) return;
        if (e.button === 0) g.breakHeld = false;
    });

    canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    canvas.addEventListener('wheel', function(e) {
        const g = gameInstance;
        if (!g || !g.running || g.state !== 'playing') return;
        g.held = (g.held + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchstart', function(e) {
        const g = gameInstance;
        if (!g || !g.running || g.state !== 'playing') return;
        const t = e.touches[0];
        g.dragLook = true;
        g.lastPX = t.clientX;
        g.lastPY = t.clientY;
        g.touchStartX = t.clientX;
        g.touchStartY = t.clientY;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
        const g = gameInstance;
        if (!g || !g.dragLook) return;
        const t = e.touches[0];
        g.cam.yaw += (t.clientX - g.lastPX) * g.sens * 2;
        g.cam.pitch -= (t.clientY - g.lastPY) * g.sens * 1.6;
        if (g.cam.pitch > 1.4) g.cam.pitch = 1.4;
        if (g.cam.pitch < -1.4) g.cam.pitch = -1.4;
        g.lastPX = t.clientX;
        g.lastPY = t.clientY;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
        const g = gameInstance;
        if (!g) return;
        g.dragLook = false;
        if (g.state === 'playing' && Math.abs(e.changedTouches[0].clientX - g.touchStartX) < 10 && Math.abs(e.changedTouches[0].clientY - g.touchStartY) < 10) {
            placeBlock(g);
            g.placeCd = 0.28;
        }
    });

    const fb = document.getElementById('fpsFireBtn');
    if (fb) {
        fb.addEventListener('pointerdown', function(e) {
            const g = gameInstance;
            if (g) g.breakHeld = true;
            e.preventDefault();
        });
        fb.addEventListener('pointerup', function() {
            const g = gameInstance;
            if (g) g.breakHeld = false;
        });
        fb.addEventListener('pointerleave', function() {
            const g = gameInstance;
            if (g) g.breakHeld = false;
        });
    }

    window.addEventListener('keydown', function(e) {
        const g = gameInstance;
        if (!g || !g.running) return;
        if (g.state === 'menu') return;
        if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
        if (e.key >= '1' && e.key <= '9') { g.held = e.key.charCodeAt(0) - 49; return; }
        g.keys[e.key] = true;
        if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) e.preventDefault();
    });

    window.addEventListener('keyup', function(e) {
        const g = gameInstance;
        if (!g) return;
        g.keys[e.key] = false;
    });
}

