export const getFPS = () =>
    new Promise<number>(resolve => {
        requestAnimationFrame(t1 => {
            requestAnimationFrame(t2 => {
                const fps = Math.round(1000 / (t2 - t1));
                resolve(fps);
            });
        });
    });

export let FRAMES_PER_SECOND = 0;
export let PLAYER_SPEED = 0;

getFPS().then(fps => {
    FRAMES_PER_SECOND = fps;
    PLAYER_SPEED = 14 * 60 / FRAMES_PER_SECOND;
});

export const SCREEN_WIDTH = 1280;
export const SCREEN_HEIGHT = 720;
export const PLAYER_WIDTH = 600;
export const SCREEN_SWITCH_THRESHOLD = PLAYER_WIDTH / 4;
export const FOOTSTEP_COOLDOWN = 500;
export const COMBAT_RANGE = 300;
export const INTERACTION_RANGE = 150;
export const ANIMATION_SPEED = 64;

export const SELL_RATIO = 0.8;

// [STATS]
export const HEALTH_PER_STR = 10;
export const MANA_PER_INT = 10;
export const MANA_REGEN_PER_INT = 1;
export const DMG_PER_STR = 2;
export const DMG_PER_AGI = .5;
export const CRIT_CHANCE_PER_AGI = 0.005;
export const CRIT_MULT_INITIAL = 0.5;
export const CRIT_MULT_PER_AGI = 0.1;
export const EVASION_INITIAL = 0.05 - 0.01;
export const EVASION_PER_AGI = 0.001;
export const ACCURACY_INITIAL = 1.0 - 0.01;
export const ACCURACY_PER_AGI = 0.001;
export const PHYSICAL_RESISTANCE_INITIAL = 0;
export const MAGIC_RESISTANCE_INITIAL = 0;
