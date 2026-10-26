// ═══════════════════════════════════════
// GAME CONSTANTS
// ═══════════════════════════════════════
import { norm3 } from './math.js';

export const MC_SOUND_KEY = 'diary_game_sound';

// Block type IDs stored in the WORLD byte array.
export const BLK = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    LOG: 5,
    LEAVES: 6,
    PLANKS: 7,
    WATER: 8,
    GLASS: 9,
    BRICK: 10,
    BEDROCK: 11
};

// The 9 selectable block types shown in the hotbar (keyboard keys 1-9).
export const HOTBAR = [
    BLK.GRASS,
    BLK.DIRT,
    BLK.STONE,
    BLK.LOG,
    BLK.PLANKS,
    BLK.BRICK,
    BLK.GLASS,
    BLK.SAND,
    BLK.LEAVES
];

export const WATER_LEVEL = 12;
export const WORLD_SX = 64;
export const WORLD_SY = 32;
export const WORLD_SZ = 64;

export const FOV = (75 * Math.PI) / 180;
export const tanF = Math.tan(FOV / 2);

// Direction of the sun; used for sunlight and shadows.
export const SUN = norm3(0.5, 0.7, 0.4);
export const sunX = SUN[0];
export const sunY = SUN[1];
export const sunZ = SUN[2];

