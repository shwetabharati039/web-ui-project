// ═══════════════════════════════════════
// GAME RENDERER (RTX-STYLE CPU PATH TRACER)
// ═══════════════════════════════════════
import { BLK, tanF, sunX, sunY, sunZ } from './constants.js';
import { blockAt, blockBase, blockCol } from './world.js';

// DDA (Digital Differential Analyzer) voxel ray cast.
export function traceRay(ox, oy, oz, dx, dy, dz, maxDist, skipId) {
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

// Sky color gradient and sun halo.
export function skyCol(dx, dy, dz) {
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

export function skyAO(x, y, z) {
    const res = traceRay(x, y, z, 0, 1, 0, 6, 0);
    if (!res.hit) return 1;
    return 0.2 + 0.8 * Math.min(1, res.dist / 5);
}

export function sunShadow(x, y, z, nx, ny, nz) {
    const res = traceRay(x + nx * 0.01, y + ny * 0.01, z + nz * 0.01, sunX, sunY, sunZ, 80, 0);
    return res.hit ? 0.35 : 1;
}

export function giSample(px, py, pz, nx, ny, nz, rng) {
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

export function shadeRay(ox, oy, oz, dx, dy, dz, camInWater, depth, rng) {
    const skipId = camInWater ? BLK.WATER : BLK.AIR;
    const res = traceRay(ox, oy, oz, dx, dy, dz, 90, skipId);
    if (!res.hit) return skyCol(dx, dy, dz);
    return shadeBlock(res, dx, dy, dz, camInWater, depth, rng);
}

export function shadeBlock(res, dx, dy, dz, camInWater, depth, rng) {
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

export function shadeGlassRay(ox, oy, oz, dx, dy, dz, camInWater, depth, rng) {
    const res = traceRay(ox, oy, oz, dx, dy, dz, 90, BLK.GLASS);
    if (!res.hit) return skyCol(dx, dy, dz);
    return shadeBlock(res, dx, dy, dz, camInWater, depth, rng);
}

export function resizeRT(g) {
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

export function composite(g) {
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

export function renderWorld(g) {
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

