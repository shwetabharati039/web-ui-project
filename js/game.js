// ═══════════════════════════════════════
// ═══════════════════════════════════════
// INDEX CRAFT — VOXEL SANDBOX (RTX-STYLE PATH TRACER)
// A Minecraft-style voxel sandbox where the world is rendered
// with a CPU path tracer (accumulated progressive sampling).
// ═══════════════════════════════════════
// Game-wide state and settings.
const MC_SOUND_KEY = 'diary_game_sound';   // localStorage key for the sound toggle
export let gameInstance = null;             // the active game object (null when idle)
let gameRafId = null;                       // requestAnimationFrame id for the render loop
let gameAudio = null;                       // shared Web Audio API AudioContext
let mcSoundOn = false;                      // whether sound effects are enabled

// Block type ids stored in the WORLD byte array.
const BLK = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6, PLANKS: 7, WATER: 8, GLASS: 9, BRICK: 10, BEDROCK: 11 };
// The 9 selectable block types shown in the hotbar (keyboard keys 1-9).
const HOTBAR = [BLK.GRASS, BLK.DIRT, BLK.STONE, BLK.LOG, BLK.PLANKS, BLK.BRICK, BLK.GLASS, BLK.SAND, BLK.LEAVES];
const WATER_LEVEL = 12;                     // water fills the world up to this y height
const WORLD_SX = 64, WORLD_SY = 32, WORLD_SZ = 64;  // world dimensions in blocks (x, y, z)
const FOV = (75 * Math.PI) / 180;           // vertical field of view in radians
const tanF = Math.tan(FOV / 2);             // half-FOV tangent used when projecting rays

let WORLD = null;                           // flat Uint8Array holding every block id

// Direction of the sun; used for sunlight and shadows.
const SUN = norm3(0.5, 0.7, 0.4);
const sunX = SUN[0], sunY = SUN[1], sunZ = SUN[2];

// Normalizes a 3D vector to unit length.
function norm3(x, y, z) {
    const l = 1 / Math.hypot(x, y, z);
    return [x * l, y * l, z * l];
}

// Seeded pseudo-random number generator (returns values in [0, 1)).
// Deterministic per seed so frames are reproducible during accumulation.
function mulberry32(a) {
    return function() {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Deterministic integer hashes used to build value noise. 2D and 3D variants.
function hash2(ix, iz) {
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hash3(x, y, z) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2246822519)) | 0;
    h = (h ^ (h >>> 13)) | 0;
    h = Math.imul(h, 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// 2D value noise: smoothly interpolates random values at integer grid corners.
function vnoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Fractal Brownian Motion: sums several octaves of noise for natural-looking terrain.
function fbm(x, z) {
    return vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, z * 4.3) * 0.12 + vnoise(x * 8.6, z * 8.6) * 0.05;
}

// Maps a 3D block coordinate (x, y, z) to a flat array index.
function idx(x, y, z) { return (y * WORLD_SZ + z) * WORLD_SX + x; }

// Generates the entire voxel world: terrain heightfield, sand/grass/stone layers,
// water, and randomly scattered trees.
function buildWorld() {
    WORLD = new Uint8Array(WORLD_SX * WORLD_SY * WORLD_SZ);
    const trees = [];
    for (let x = 0; x < WORLD_SX; x++) {
        for (let z = 0; z < WORLD_SZ; z++) {
            const e = fbm(x * 0.08, z * 0.08);
            const m = fbm(x * 0.03 + 100, z * 0.03 + 100);
            let h = Math.floor(10 + e * 9 + m * 5);
            h = Math.max(3, Math.min(WORLD_SY - 8, h));
            for (let y = 0; y <= h; y++) {
                let b = BLK.STONE;
                if (y === 0) b = BLK.BEDROCK;
                else if (y >= h - 2) b = BLK.DIRT;
                if (y === h) b = (h <= WATER_LEVEL + 1) ? BLK.SAND : BLK.GRASS;
                WORLD[idx(x, y, z)] = b;
            }
            if (h <= WATER_LEVEL) WORLD[idx(x, h, z)] = BLK.SAND;
            for (let y = h + 1; y <= WATER_LEVEL; y++) WORLD[idx(x, y, z)] = BLK.WATER;
            if (h > WATER_LEVEL + 1 && hash2(x + 31, z + 17) > 0.985) trees.push([x, h, z]);
        }
    }
    for (let i = 0; i < trees.length; i++) {
        const t = trees[i];
        const th = 3 + Math.floor(hash2(t[0] * 7, t[2] * 13) * 3);
        for (let y = 1; y <= th; y++) WORLD[idx(t[0], t[1] + y, t[2])] = BLK.LOG;
        for (let dy = th - 1; dy <= th + 1; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    const bx = t[0] + dx, bz = t[2] + dz, by = t[1] + dy;
                    if (bx < 1 || bx >= WORLD_SX - 1 || bz < 1 || bz >= WORLD_SZ - 1 || by <= 0 || by >= WORLD_SY) continue;
                    const cur = WORLD[idx(bx, by, bz)];
                    if (cur === BLK.AIR || cur === BLK.LEAVES) {
                        if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy !== th + 1) continue;
                        WORLD[idx(bx, by, bz)] = BLK.LEAVES;
                    }
                }
            }
        }
    }
}

// Returns the block id at a coordinate; out-of-bounds gives AIR/BEDROCK sentinels.
function blockAt(x, y, z) {
    if (x < 0 || x >= WORLD_SX || z < 0 || z >= WORLD_SZ) return BLK.AIR;
    if (y < 0) return BLK.BEDROCK;
    if (y >= WORLD_SY) return BLK.AIR;
    return WORLD[idx(x, y, z)];
}

// A block is solid if it blocks movement (everything except air and water).
function isSolid(id) { return id !== BLK.AIR && id !== BLK.WATER; }

// Axis-aligned box collision test for the player's bounding box (0.56 wide, 1.8 tall).
// Returns true if the box overlaps any solid block or leaves the world bounds.
function collides(g, x, y, z) {
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
                if (isSolid(WORLD[idx(cx, cy, cz)])) return true;
            }
        }
    }
    return false;
}

// DDA (Digital Differential Analyzer) voxel ray cast.
// Steps through the grid along the ray and returns the first solid block hit,
// the entry face normal (nx, ny, nz), and the travel distance. skipId lets rays
// pass through a particular block type (used for water/glass transparency).
function traceRay(ox, oy, oz, dx, dy, dz, maxDist, skipId) {
    let mx = Math.floor(ox), my = Math.floor(oy), mz = Math.floor(oz);
    const invX = dx === 0 ? Infinity : Math.abs(1 / dx);
    const invY = dy === 0 ? Infinity : Math.abs(1 / dy);
    const invZ = dz === 0 ? Infinity : Math.abs(1 / dz);
    const stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1, stepZ = dz < 0 ? -1 : 1;
    let tMaxX = dx === 0 ? Infinity : (dx > 0 ? (mx + 1 - ox) * invX : (ox - mx) * invX);
    let tMaxY = dy === 0 ? Infinity : (dy > 0 ? (my + 1 - oy) * invY : (oy - my) * invY);
    let tMaxZ = dz === 0 ? Infinity : (dz > 0 ? (mz + 1 - oz) * invZ : (oz - mz) * invZ);
    const dX = dx === 0 ? Infinity : invX;
    const dY = dy === 0 ? Infinity : invY;
    const dZ = dz === 0 ? Infinity : invZ;
    let t = 0, nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < 300; i++) {
        const b = blockAt(mx, my, mz);
        if (b !== BLK.AIR && b !== skipId) {
            return { hit: true, x: mx, y: my, z: mz, id: b, nx: nx, ny: ny, nz: nz, t: t, dist: t };
        }
        if (tMaxX < tMaxY && tMaxX < tMaxZ) {
            if (tMaxX > maxDist) break;
            mx += stepX; t = tMaxX; tMaxX += dX; nx = -stepX; ny = 0; nz = 0;
        } else if (tMaxY < tMaxZ) {
            if (tMaxY > maxDist) break;
            my += stepY; t = tMaxY; tMaxY += dY; nx = 0; ny = -stepY; nz = 0;
        } else {
            if (tMaxZ > maxDist) break;
            mz += stepZ; t = tMaxZ; tMaxZ += dZ; nx = 0; ny = 0; nz = -stepZ;
        }
    }
    return { hit: false, x: mx, y: my, z: mz, id: BLK.AIR, nx: nx, ny: ny, nz: nz, t: t, dist: t };
}

// Computes the sky color for a ray direction: a gradient that brightens toward
// the horizon, plus the sun disk and a warm halo when looking toward the sun.
function skyCol(dx, dy, dz) {
    const t = Math.max(0, Math.min(1, dy * 0.5 + 0.5));
    const tz = Math.pow(t, 1.5);
    let r = 0.28 + 0.5 * tz;
    let g = 0.5 + 0.35 * tz;
    let b = 0.75 + 0.25 * tz;
    const sd = dx * sunX + dy * sunY + dz * sunZ;
    if (sd > 0) {
        const disk = Math.pow(sd, 3000);
        r += disk * 2; g += disk * 2; b += disk * 1.6;
        const halo = Math.pow(sd, 40) * 0.3;
        r += halo; g += halo * 0.85; b += halo * 0.6;
    }
    return [r, g, b];
}

// Base RGB albedo of each block type (used by GI bounces and particles).
function blockBase(id) {
    if (id === BLK.GRASS) return [0.49, 0.74, 0.29];
    if (id === BLK.DIRT) return [0.45, 0.34, 0.23];
    if (id === BLK.STONE) return [0.4, 0.4, 0.42];
    if (id === BLK.SAND) return [0.86, 0.75, 0.5];
    if (id === BLK.LOG) return [0.35, 0.24, 0.15];
    if (id === BLK.LEAVES) return [0.21, 0.41, 0.15];
    if (id === BLK.PLANKS) return [0.55, 0.44, 0.3];
    if (id === BLK.WATER) return [0.16, 0.36, 0.68];
    if (id === BLK.GLASS) return [0.55, 0.75, 0.95];
    if (id === BLK.BRICK) return [0.49, 0.28, 0.21];
    return [0.3, 0.3, 0.32];
}

// Per-face block color: adds deterministic per-block variation plus simple
// procedural textures (log rings, plank stripes, brick mortar, etc.).
// face: 1 = side, 2 = top, 3 = bottom. u/v are the in-cell texture coordinates.
function blockCol(id, face, bx, by, bz, u, v) {
    let r, g, b;
    const h = hash3(bx, by, bz);
    if (id === BLK.GRASS) {
        if (face === 2) { r = 124; g = 189; b = 75; }
        else if (face === 3) { r = 112; g = 84; b = 56; }
        else { r = 112; g = 84; b = 56; if (v > 0.8) { r = 124; g = 189; b = 75; } }
        const j = h * 22 - 11;
        r += j; g += j; b += j;
    } else if (id === BLK.DIRT) {
        r = 108 + h * 20 - 10; g = 78 + h * 16 - 8; b = 52 + h * 12 - 6;
    } else if (id === BLK.STONE) {
        const n2 = h * 40 - 20;
        r = 92 + n2; g = 94 + n2; b = 100 + n2;
    } else if (id === BLK.SAND) {
        const n2 = h * 30 - 15;
        r = 220 + n2; g = 204 + n2; b = 158 + n2;
    } else if (id === BLK.LOG) {
        if (face === 2 || face === 3) {
            const ring = Math.max(Math.abs(u - 0.5) * 2, Math.abs(v - 0.5) * 2);
            r = 148; g = 116; b = 70;
            if (ring > 0.62) { r = 100; g = 74; b = 45; }
        } else {
            r = 86 + h * 30; g = 60 + h * 10; b = 34;
            if (Math.floor(u * 4) % 2) { r += 12; g += 10; b += 7; }
        }
    } else if (id === BLK.LEAVES) {
        const j = h * 30 - 15;
        r = 54 + j; g = 106 + j; b = 44 + j;
    } else if (id === BLK.PLANKS) {
        const stripe = Math.floor(v * 4) % 2;
        r = 138 + stripe * 12; g = 107 + stripe * 10; b = 73 + stripe * 7;
    } else if (id === BLK.WATER) {
        r = 60; g = 110; b = 220;
    } else if (id === BLK.GLASS) {
        r = 205; g = 230; b = 255;
    } else if (id === BLK.BRICK) {
        const row = Math.floor(v * 4) % 2;
        const mortar = u < 0.06 || u > 0.94;
        if (mortar) { r = 176; g = 174; b = 166; }
        else { r = 126 + h * 20 - 10; g = 70 + h * 12 - 6; b = 52 + h * 10 - 5; }
    } else {
        r = 100; g = 100; b = 100;
    }
    return [r, g, b];
}

// Ambient occlusion: casts a short ray straight up and dims the surface
// based on how soon that ray hits an overhanging block.
function skyAO(x, y, z) {
    const res = traceRay(x, y, z, 0, 1, 0, 6, 0);
    if (!res.hit) return 1;
    return 0.2 + 0.8 * Math.min(1, res.dist / 5);
}

// Sun shadow: traces a long ray toward the sun; if it hits anything,
// the point falls in shadow and is dimmed to 35% brightness.
function sunShadow(x, y, z, nx, ny, nz) {
    const res = traceRay(x + nx * 0.01, y + ny * 0.01, z + nz * 0.01, sunX, sunY, sunZ, 80, 0);
    return res.hit ? 0.35 : 1;
}

// Single indirect-light (GI) sample: picks a random direction on the
// hemisphere above the surface, traces it, and returns the bounced light
// color (sky light or the color of whatever block was hit).
function giSample(px, py, pz, nx, ny, nz, rng) {
    const r1 = rng(), r2 = rng();
    const a = 2 * Math.PI * r1;
    const rr = Math.sqrt(r2);
    let tx, ty, tz;
    if (Math.abs(ny) < 0.999) { tx = -nz; ty = 0; tz = nx; } else { tx = 1; ty = 0; tz = 0; }
    const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
    const bx2 = ny * tz - nz * ty, by2 = nz * tx - nx * tz, bz2 = nx * ty - ny * tx;
    const lx = tx * Math.cos(a) * rr + bx2 * Math.sin(a) * rr + nx * Math.sqrt(1 - r2);
    const ly = ty * Math.cos(a) * rr + by2 * Math.sin(a) * rr + ny * Math.sqrt(1 - r2);
    const lz = tz * Math.cos(a) * rr + bz2 * Math.sin(a) * rr + nz * Math.sqrt(1 - r2);
    const res = traceRay(px + nx * 0.01, py + ny * 0.01, pz + nz * 0.01, lx, ly, lz, 14, 0);
    if (!res.hit) {
        const sk = skyCol(lx, ly, lz);
        return [sk[0] * 0.28, sk[1] * 0.28, sk[2] * 0.28];
    }
    const c = blockBase(res.id);
    return [c[0] * 0.12, c[1] * 0.12, c[2] * 0.12];
}

// Entry point for shading a primary ray: traces it through the world and
// returns the final color. Water is skipped when the camera is inside water.
function shadeRay(ox, oy, oz, dx, dy, dz, camInWater, depth, rng) {
    const skipId = camInWater ? BLK.WATER : BLK.AIR;
    const res = traceRay(ox, oy, oz, dx, dy, dz, 90, skipId);
    if (!res.hit) return skyCol(dx, dy, dz);
    return shadeBlock(res, dx, dy, dz, camInWater, depth, rng);
}

// Shades a ray that hit a block. Handles water refraction/absorption,
// glass reflection + transmission (recursive), and opaque surfaces lit by
// diffuse sunlight, sky ambient occlusion, and bounced GI, then applies fog.
function shadeBlock(res, dx, dy, dz, camInWater, depth, rng) {
    if (res.id === BLK.WATER) {
        const ndot = dx * res.nx + dy * res.ny + dz * res.nz;
        const rdx = dx - 2 * ndot * res.nx, rdy = dy - 2 * ndot * res.ny, rdz = dz - 2 * ndot * res.nz;
        const rCol = skyCol(rdx, rdy, rdz);
        const f = 0.02 + 0.98 * Math.pow(1 + ndot, 5);
        const blue = [0.16, 0.36, 0.68];
        let r = blue[0] * (1 - f) + rCol[0] * f;
        let g = blue[1] * (1 - f) + rCol[1] * f;
        let b = blue[2] * (1 - f) + rCol[2] * f;
        if (camInWater) {
            r = 0.05; g = 0.12; b = 0.35;
        }
        return [r, g, b];
    }
    if (res.id === BLK.GLASS && depth < 3) {
        const ndot = dx * res.nx + dy * res.ny + dz * res.nz;
        const rdx = dx - 2 * ndot * res.nx, rdy = dy - 2 * ndot * res.ny, rdz = dz - 2 * ndot * res.nz;
        const f = 0.04 + 0.96 * Math.pow(1 + ndot, 5);
        const rx = res.x + res.nx * 0.51, ry = res.y + res.ny * 0.51, rz = res.z + res.nz * 0.51;
        const rCol = shadeRay(rx, ry, rz, rdx, rdy, rdz, camInWater, depth + 1, rng);
        const tx = res.x - res.nx * 0.51, ty = res.y - res.ny * 0.51, tz = res.z - res.nz * 0.51;
        const tCol = shadeGlassRay(tx, ty, tz, dx, dy, dz, camInWater, depth + 1, rng);
        let r = (0.5 + 0.5 * f) * (tCol[0] * 0.6 + rCol[0] * f);
        let g = (0.5 + 0.5 * f) * (tCol[1] * 0.65 + rCol[1] * f);
        let b = (0.5 + 0.5 * f) * (tCol[2] * 0.8 + rCol[2] * f);
        return [r, g, b];
    }
    const bx = res.x, by = res.y, bz = res.z;
    const sx = bx + res.nx * 0.51, sy = by + res.ny * 0.51, sz = bz + res.nz * 0.51;
    let u, v;
    if (res.nx !== 0) { u = sz - Math.floor(sz); v = sy - Math.floor(sy); }
    else if (res.ny !== 0) { u = sx - Math.floor(sx); v = sz - Math.floor(sz); }
    else { u = sx - Math.floor(sx); v = sy - Math.floor(sy); }
    const face = res.ny === 1 ? 2 : (res.ny === -1 ? 3 : 1);
    const base = blockCol(res.id, face, bx, by, bz, u, v);
    const ndl = Math.max(0, res.nx * sunX + res.ny * sunY + res.nz * sunZ);
    const ao = skyAO(sx, sy, sz);
    const sh = sunShadow(sx, sy, sz, res.nx, res.ny, res.nz);
    const lit = 0.14 + 0.9 * sh * ndl + 0.42 * (0.3 + 0.6 * Math.max(0, res.ny)) * ao;
    let r = base[0] * lit;
    let g = base[1] * lit;
    let b = base[2] * lit;
    if (depth < 2 && res.dist < 30 && ao > 0.2) {
        const gi = giSample(sx, sy, sz, res.nx, res.ny, res.nz, rng);
        r += base[0] * gi[0];
        g += base[1] * gi[1];
        b += base[2] * gi[2];
    }
    const fogT = 1 - Math.exp(-res.dist * 0.018);
    const hz = skyCol(0, 0.05, 1);
    r += (hz[0] - r) * fogT;
    g += (hz[1] - g) * fogT;
    b += (hz[2] - b) * fogT;
    if (camInWater) {
        const wt = 1 - Math.exp(-res.dist * 0.09);
        r += (0.05 - r) * wt;
        g += (0.12 - g) * wt;
        b += (0.35 - b) * wt;
    }
    return [r, g, b];
}

// Traces the transmitted ray through a glass block (skipping glass) for refraction.
function shadeGlassRay(ox, oy, oz, dx, dy, dz, camInWater, depth, rng) {
    const res = traceRay(ox, oy, oz, dx, dy, dz, 90, BLK.GLASS);
    if (!res.hit) return skyCol(dx, dy, dz);
    return shadeBlock(res, dx, dy, dz, camInWater, depth, rng);
}

// (Re)sizes the low-resolution render target and resets the accumulated buffer.
// The scene renders at 1/scale resolution, then gets upscaled to the canvas.
function resizeRT(g) {
    const rw = Math.max(96, Math.round(g.canvas.width / g.scale));
    const rh = Math.max(54, Math.round(g.canvas.height / g.scale));
    if (!g.rtCanvas) g.rtCanvas = document.createElement('canvas');
    g.rtCanvas.width = rw;
    g.rtCanvas.height = rh;
    g.rtCtx = g.rtCanvas.getContext('2d');
    g.rw = rw; g.rh = rh;
    g.acc = new Float32Array(rw * rh * 3);
    g.img = g.rtCtx.createImageData(rw, rh);
    g.sampleN = 0;
    g.dirty = true;
}

// Converts the accumulated (linear, un-clamped) samples into a displayable image:
// averages over sampleN, applies gamma correction, clamps highlights, and blits up.
function composite(g) {
    const data = g.img.data;
    const acc = g.acc, n = g.sampleN || 1;
    const rw = g.rw, rh = g.rh;
    for (let i = 0; i < rw * rh; i++) {
        const k = i * 3;
        let r = Math.pow(acc[k] / n, 1 / 2.2);
        let g2 = Math.pow(acc[k + 1] / n, 1 / 2.2);
        let b = Math.pow(acc[k + 2] / n, 1 / 2.2);
        const m = Math.max(r, g2, b);
        if (m > 1) { r /= m; g2 /= m; b /= m; }
        const o = i * 4;
        data[o] = r * 255; data[o + 1] = g2 * 255; data[o + 2] = b * 255; data[o + 3] = 255;
    }
    g.rtCtx.putImageData(g.img, 0, 0);
    g.ctx.imageSmoothingEnabled = true;
    g.ctx.drawImage(g.rtCanvas, 0, 0, rw, rh, 0, 0, g.canvas.width, g.canvas.height);
}

// Renders one full frame of the scene into the accumulation buffer.
// For each output pixel it builds a camera ray (yaw/pitch basis) and shades it,
// progressively accumulating samples so the image converges over time.
function renderWorld(g) {
    const rw = g.rw, rh = g.rh;
    const cam = g.cam;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const fx = cy * cp, fy = sp, fz = sy * cp;
    const rx = -sy, ry = 0, rz = cy;
    const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
    const aspect = rw / rh;
    const ox = cam.x, oy = cam.y, oz = cam.z;
    const camInWater = blockAt(Math.floor(ox), Math.floor(oy), Math.floor(oz)) === BLK.WATER;
    const acc = g.acc;
    for (let py = 0; py < rh; py++) {
        const fy2 = 1 - (py / (rh - 1)) * 2;
        for (let px = 0; px < rw; px++) {
            const fx2 = (px / (rw - 1)) * 2 - 1;
            const dxx = fx + rx * fx2 * tanF * aspect + ux * fy2 * tanF;
            const dyy = fy + ry * fx2 * tanF * aspect + uy * fy2 * tanF;
            const dzz = fz + rz * fx2 * tanF * aspect + uz * fy2 * tanF;
            const il = 1 / Math.hypot(dxx, dyy, dzz);
            const c = shadeRay(ox, oy, oz, dxx * il, dyy * il, dzz * il, camInWater, 0, g.rng);
            const k = (py * rw + px) * 3;
            acc[k] += c[0]; acc[k + 1] += c[1]; acc[k + 2] += c[2];
        }
    }
    g.sampleN++;
    composite(g);
}

// Returns the game canvas element.
function getGameCanvas() { return document.getElementById('gameCanvas'); }

// Reads the persisted sound preference from localStorage.
export function gameAudioEnabled() {
    try { mcSoundOn = localStorage.getItem(MC_SOUND_KEY) === '1'; } catch (e) { mcSoundOn = false; }
}

// Lazily creates and resumes the shared AudioContext (browsers require a
// user gesture before audio can start, so this is called on first interaction).
function ensureGameAudio() {
    try {
        if (!gameAudio) gameAudio = new (window.AudioContext || window.webkitAudioContext)();
        if (gameAudio.state === 'suspended') gameAudio.resume();
    } catch (e) {}
}

// Plays a short synthesized sound effect using oscillators and noise buffers.
// Supported kinds: 'break', 'place', 'jump', 'click'.
function playFx(kind) {
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
            o.connect(gn); gn.connect(ac.destination);
            o.start(t); o.stop(t + dur + 0.02);
        } catch (e) {}
    };
    const noise = (dur, vol, freq, q) => {
        try {
            const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
            const dd = buf.getChannelData(0);
            for (let i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / dd.length);
            const src = ac.createBufferSource();
            src.buffer = buf;
            const fl = ac.createBiquadFilter();
            fl.type = 'lowpass'; fl.frequency.value = freq; fl.Q.value = q || 1;
            const gn = ac.createGain();
            gn.gain.setValueAtTime(vol, t);
            gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(fl); fl.connect(gn); gn.connect(ac.destination);
            src.start(t); src.stop(t + dur);
        } catch (e) {}
    };
    if (kind === 'break') { noise(0.08, 0.18, 900, 1); osc(240, 0.08, 'square', 0.08, 160); }
    else if (kind === 'place') { noise(0.04, 0.1, 1500, 0.8); osc(300, 0.06, 'square', 0.07, 220); }
    else if (kind === 'jump') { osc(260, 0.09, 'square', 0.06, 520); }
    else if (kind === 'click') { osc(500, 0.04, 'square', 0.06); }
}

// Global sound toggle exposed to the UI button; persists and updates the icon.
window.toggleGameSound = function() {
    mcSoundOn = !mcSoundOn;
    try { localStorage.setItem(MC_SOUND_KEY, mcSoundOn ? '1' : '0'); } catch (e) {}
    const btn = document.getElementById('gameSoundBtn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-' + (mcSoundOn ? 'volume-high' : 'volume-xmark') + '"></i>';
    if (mcSoundOn) { ensureGameAudio(); playFx('click'); }
};

// Shows/hides the center overlay card. state is 'hidden', 'menu', or 'paused'.
function setGameOverlay(state) {
    const overlay = document.getElementById('gameOverlay');
    const title = document.getElementById('gameOverlayTitle');
    const text = document.getElementById('gameOverlayText');
    const btn = document.getElementById('gameOverlayBtn');
    if (state === 'hidden') { overlay.style.display = 'none'; return; }
    overlay.style.display = 'flex';
    if (state === 'menu') {
        title.textContent = 'Index Craft';
        text.innerHTML = 'A blocky voxel world rendered with real-time path tracing. Mine and build anything.<br><strong>WASD</strong> move · <strong>Mouse</strong> look · <strong>Left click</strong> break · <strong>Right click</strong> place · <strong>Space</strong> jump · <strong>1-9</strong> select block';
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Enter World';
    } else if (state === 'paused') {
        title.textContent = 'Paused';
        text.innerHTML = 'Mission on hold. The world is still there waiting for you.';
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
    }
}

// Creates a new game object: sizes the canvas, sets the camera (menu mode
// uses a scenic overview camera, play mode starts at the default spawn),
// and initializes player/input/render state.
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
        velY: 0, onGround: false,
        keys: {}, sens: 0.0026, fov: FOV, reach: 5,
        held: 0, hotbar: HOTBAR.slice(),
        breakHeld: false, placeCd: 0, breakCd: 0,
        particles: [],
        state: 'menu', running: false,
        sampleN: 0, dirty: true,
        rng: null, frameCount: 0,
        dtSum: 0, dtCount: 0
    };
    resizeRT(g);
    return g;
}

// Marks the frame dirty (requires a fresh accumulation pass) whenever the
// camera position or orientation changes since the previous frame.
function updateCameraForRender(g) {
    const c = g.cam;
    const pc = g.prevCam;
    if (!pc) { g.prevCam = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch }; g.dirty = true; return; }
    if (Math.abs(pc.x - c.x) > 1e-4 || Math.abs(pc.y - c.y) > 1e-4 || Math.abs(pc.z - c.z) > 1e-4 ||
        Math.abs(pc.yaw - c.yaw) > 1e-4 || Math.abs(pc.pitch - c.pitch) > 1e-4) {
        g.dirty = true;
        pc.x = c.x; pc.y = c.y; pc.z = c.z; pc.yaw = c.yaw; pc.pitch = c.pitch;
    }
}

// Clears the accumulation buffer so path tracing restarts from a clean frame.
function resetAcc(g) {
    g.acc.fill(0);
    g.sampleN = 0;
    g.dirty = false;
}

// Projects a world-space point onto the canvas using the current camera
// (forward/right/up basis). Returns null if the point is behind the camera.
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

// Ray-casts from the camera along the look direction up to reach distance.
// Returns the targeted block cell plus the empty cell to place into (face-normal offset).
function getTarget(g) {
    const c = g.cam;
    const dx = Math.cos(c.yaw) * Math.cos(c.pitch), dy = Math.sin(c.pitch), dz = Math.sin(c.yaw) * Math.cos(c.pitch);
    const res = traceRay(c.x, c.y, c.z, dx, dy, dz, g.reach, 0);
    if (!res.hit) return null;
    return { hit: { x: res.x, y: res.y, z: res.z }, place: { x: res.x + res.nx, y: res.y + res.ny, z: res.z + res.nz } };
}

// Breaks the targeted block (sets it to air) and spawns debris particles.
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

// Places the currently selected hotbar block into the empty cell in front of
// the targeted face, unless it would overlap the player's body.
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

// Creates a burst of small colored debris particles when a block is broken.
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

// Moves the player one axis at a time, resolving collisions per axis so the
// player can slide along walls and floors instead of getting stuck.
function movePlayer(g, vx, vy, vz, dt) {
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

// Applies player physics each tick: reads WASD/arrow keys for horizontal
// movement (relative to yaw), gravity with water drag, and jumping.
function updatePlayer(g, dt) {
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
    if (g.onGround && (k[' '] || k['Space'])) { g.velY = 0.24; g.onGround = false; playFx('jump'); }
    else if (feetInWater && (k[' '] || k['Space'])) g.velY = 0.14;
    const drag = feetInWater ? 0.4 : 1;
    movePlayer(g, mx * speed * drag, g.velY, mz * speed * drag, dt);
}

// Per-tick game logic: player physics, block-breaking repeat, and particle animation.
function updateGame(g, dt) {
    updatePlayer(g, dt);
    g.breakCd -= dt;
    g.placeCd -= dt;
    if (g.breakHeld && g.breakCd <= 0) { g.breakCd = 0.22; breakBlock(g); }
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

// Draws a wireframe box around a block cell using its 8 projected corners.
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

// Draws the 9-slot hotbar along the bottom, highlighting the selected slot
// and showing a swatch of each block type's color.
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

// Draws block-debris particles as fading squares scaled by depth.
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

// Draws 2D UI on top of the rendered scene: crosshair, targeted-block outline,
// debris particles, and the hotbar while playing.
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

// Main render loop. Tracks frame time, adaptively adjusts the render scale to
// hold the target framerate, updates the game, then renders and draws the UI.
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

// Requests browser pointer-lock so the mouse drives camera look.
function requestPointerLock() {
    const c = getGameCanvas();
    if (c && c.requestPointerLock) {
        try { c.requestPointerLock(); } catch (e) {}
    }
}

// Starts a fresh play session: creates the game, drops the player on the
// highest solid block at world center, and begins the render loop.
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
window.startGame = startGame;

// Pauses an active game, releases the pointer lock, and shows the pause overlay.
export function pauseGame() {
    const g = gameInstance;
    if (!g || g.state !== 'playing') return;
    g.state = 'paused';
    g.breakHeld = false;
    if (document.pointerLockElement) document.exitPointerLock();
    setGameOverlay('paused');
}
window.pauseGame = pauseGame;

// Resumes a paused game and re-locks the pointer.
export function resumeGame() {
    const g = gameInstance;
    if (!g || g.state !== 'paused') return;
    g.state = 'playing';
    setGameOverlay('hidden');
    requestPointerLock();
}
window.resumeGame = resumeGame;

// Toggles between playing and paused (triggered by the P key / Esc).
export function togglePause() {
    const g = gameInstance;
    if (!g) return;
    if (g.state === 'playing') pauseGame();
    else if (g.state === 'paused') resumeGame();
}
window.togglePause = togglePause;

// Overlay button action: resumes if paused, otherwise starts a new game.
window.gameOverlayAction = function() {
    const g = gameInstance;
    if (g && g.state === 'paused') resumeGame();
    else startGame();
};

// Tears down the game when the user navigates away from the game page:
// pauses, stops the loop, releases pointer lock, and cancels the RAF.
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

// Prepares the game page when navigated to: sizes the canvas, builds the world
// on first visit, resumes a paused session, or shows the scenic menu backdrop.
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
    if (sbtn) sbtn.innerHTML = '<i class="fa-solid fa-' + (mcSoundOn ? 'volume-high' : 'volume-xmark') + '"></i>';
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

// Auto-pauses whenever the browser releases the pointer lock while playing.
document.addEventListener('pointerlockchange', function() {
    const g = gameInstance;
    if (!g) return;
    const locked = document.pointerLockElement === getGameCanvas();
    if (!locked && g.state === 'playing' && g.running) pauseGame();
});

// Wires up all mouse / wheel / touch handlers for camera look, breaking,
// placing, and hotbar scrolling on the game canvas.
export function setupGameCanvasEvents() {
    const canvas = getGameCanvas();
    if (!canvas) return;

    // Mouse look: uses raw movement deltas while pointer-locked, otherwise
    // drag-look from the last pointer position.
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

    // Left click holds to break blocks; right click places a block.
    // Without pointer lock, the drag starts a drag-look.
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

    // Stops block-breaking when the left button is released anywhere.
    window.addEventListener('mouseup', function(e) {
        const g = gameInstance;
        if (!g) return;
        if (e.button === 0) g.breakHeld = false;
    });

    // Prevents the browser context menu on right-click within the game.
    canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    // Scroll wheel cycles the selected hotbar slot.
    canvas.addEventListener('wheel', function(e) {
        const g = gameInstance;
        if (!g || !g.running || g.state !== 'playing') return;
        g.held = (g.held + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
        e.preventDefault();
    }, { passive: false });

    // Touch start: begin drag-look and remember the start position.
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

    // Touch move: drag to look around.
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

    // Touch end: if it was a quick tap (no dragging), place a block at target.
    canvas.addEventListener('touchend', function(e) {
        const g = gameInstance;
        if (!g) return;
        g.dragLook = false;
        if (g.state === 'playing' && Math.abs(e.changedTouches[0].clientX - g.touchStartX) < 10 && Math.abs(e.changedTouches[0].clientY - g.touchStartY) < 10) {
            placeBlock(g);
            g.placeCd = 0.28;
        }
    });

    // Mobile "fire" button: hold to break, release to stop.
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
}

// Keyboard down: P toggles pause, 1-9 selects a hotbar slot, and WASD /
// arrows / space are recorded for movement. Prevents page scroll on game keys.
function gameKeyDown(e) {
    const g = gameInstance;
    if (!g || !g.running) return;
    if (g.state === 'menu') return;
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if (e.key >= '1' && e.key <= '9') { g.held = e.key.charCodeAt(0) - 49; return; }
    g.keys[e.key] = true;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1) e.preventDefault();
}

// Clears the pressed state of a released key.
function gameKeyUp(e) {
    const g = gameInstance;
    if (!g) return;
    g.keys[e.key] = false;
}

window.addEventListener('keydown', gameKeyDown);
window.addEventListener('keyup', gameKeyUp);
