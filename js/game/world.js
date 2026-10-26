// ═══════════════════════════════════════
// GAME VOXEL WORLD GENERATION & BLOCKS
// ═══════════════════════════════════════
import { BLK, WATER_LEVEL, WORLD_SX, WORLD_SY, WORLD_SZ } from './constants.js';
import { fbm, hash2, hash3 } from './math.js';

export let WORLD = null;

export function setWorld(w) {
    WORLD = w;
}

export function idx(x, y, z) {
    return (y * WORLD_SZ + z) * WORLD_SX + x;
}

export function buildWorld() {
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

export function blockAt(x, y, z) {
    if (!WORLD) return BLK.AIR;
    if (x < 0 || x >= WORLD_SX || z < 0 || z >= WORLD_SZ) return BLK.AIR;
    if (y < 0) return BLK.BEDROCK;
    if (y >= WORLD_SY) return BLK.AIR;
    return WORLD[idx(x, y, z)];
}

export function setBlock(x, y, z, id) {
    if (!WORLD) return;
    if (x < 0 || x >= WORLD_SX || z < 0 || z >= WORLD_SZ || y < 0 || y >= WORLD_SY) return;
    WORLD[idx(x, y, z)] = id;
}

export function isSolid(id) {
    return id !== BLK.AIR && id !== BLK.WATER;
}

export function blockBase(id) {
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

export function blockCol(id, face, bx, by, bz, u, v) {
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
        const mortar = u < 0.06 || u > 0.94;
        if (mortar) { r = 176; g = 174; b = 166; }
        else { r = 126 + h * 20 - 10; g = 70 + h * 12 - 6; b = 52 + h * 10 - 5; }
    } else {
        r = 100; g = 100; b = 100;
    }
    return [r, g, b];
}

