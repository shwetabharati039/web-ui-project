// ═══════════════════════════════════════
// GAME PHYSICS & COLLISION
// ═══════════════════════════════════════
import { BLK, WORLD_SX, WORLD_SY, WORLD_SZ } from './constants.js';
import { WORLD, idx, isSolid, blockAt } from './world.js';
import { playFx } from './audio.js';

// Axis-aligned box collision test for player bounding box (0.56 wide, 1.8 tall).
export function collides(g, x, y, z) {
    if (x < 0.5 || x >= WORLD_SX - 0.5 || z < 0.5 || z >= WORLD_SZ - 0.5) return true;
    if (y < 0) return true;
    const r = 0.28;
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
    const y0 = Math.floor(y), y1 = Math.floor(y + 1.8);
    const z0 = Math.floor(z - r), z1 = Math.floor(z + r);

    for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
            for (let cz = z0; cz <= z1; cz++) {
                if (cy < 0 || cy >= WORLD_SY) continue;
                if (cx < 0 || cx >= WORLD_SX || cz < 0 || cz >= WORLD_SZ) continue;
                if (WORLD && isSolid(WORLD[idx(cx, cy, cz)])) return true;
            }
        }
    }
    return false;
}

// Moves player one axis at a time for wall/floor sliding.
export function movePlayer(g, vx, vy, vz, dt) {
    const cam = g.cam;
    const nx = cam.x + vx * dt, ny = cam.y + vy * dt, nz = cam.z + vz * dt;

    if (!collides(g, nx, cam.y, cam.z)) cam.x = nx;

    if (!collides(g, cam.x, ny, cam.z)) {
        cam.y = ny;
        if (vy < 0) g.onGround = false;
    } else {
        if (vy < 0) g.onGround = true;
        g.velY = 0;
    }

    if (!collides(g, cam.x, cam.y, nz)) cam.z = nz;
}

// Applies player physics each tick: WASD/arrows movement, gravity, jumping.
export function updatePlayer(g, dt) {
    const k = g.keys, c = g.cam;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    let mx = 0, mz = 0;

    if (k['w'] || k['W'] || k['ArrowUp']) { mx += cy; mz += sy; }
    if (k['s'] || k['S'] || k['ArrowDown']) { mx -= cy; mz -= sy; }
    if (k['a'] || k['A'] || k['ArrowLeft']) { mx += -sy; mz += cy; }
    if (k['d'] || k['D'] || k['ArrowRight']) { mx += sy; mz += -cy; }

    const nm = Math.hypot(mx, mz);
    if (nm > 0) { mx /= nm; mz /= nm; }

    const speed = k['Shift'] ? 0.05 : 0.12;
    const feetInWater = blockAt(Math.floor(c.x), Math.floor(c.y + 0.3), Math.floor(c.z)) === BLK.WATER;

    g.velY -= 0.3 * dt * (feetInWater ? 0.3 : 1);
    g.velY = Math.max(g.velY, -0.42);

    if (g.onGround && (k[' '] || k['Space'])) {
        g.velY = 0.24;
        g.onGround = false;
        playFx('jump');
    } else if (feetInWater && (k[' '] || k['Space'])) {
        g.velY = 0.14;
    }

    const drag = feetInWater ? 0.4 : 1;
    movePlayer(g, mx * speed * drag, g.velY, mz * speed * drag, dt);
}

