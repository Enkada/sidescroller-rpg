import { ref, watch } from "vue";
import type { Sprite } from "./types/Sprite";
import type { DialogueOption } from "./types/Script";
import type { Container, LootTable } from "./types/Item";
import type { CombatEntity, Player } from "./types/CombatEntity";
import changelogData from './changelog.json';

// FPS Management
export const FRAMES_PER_SECOND = ref(0);

export const getFPS = () =>
    new Promise<number>(resolve => {
        requestAnimationFrame(t1 => {
            requestAnimationFrame(t2 => {
                const fps = Math.min(Math.round(1000 / (t2 - t1)), 165);
                resolve(fps);
            });
        });
    });

export const updateFPS = async () => {
    const fps = await getFPS();
    FRAMES_PER_SECOND.value = fps;
    return fps;
};

export enum Window {
	Character,
	Inventory,
	TalentTree,
	Quest,
	Settings,
	EquipmentUpgrade,
	DevTools,
	Guide,
	SaveLoad,
}

export type Screen = {
	id: string
	name: string
	background: string
	left: string | null
	right: string | null
	leftX?: number
	rightX?: number
	objects?: ScreenObject[]
	enemies?: ScreenEnemy[]
}

export enum InteractionType {
	None,
	Entrance,
	Dialogue,
	Container,
}

export type ScreenObject = {
	uuid: string
	name: string
	x: number[]
	y: number
	sprite: Sprite
	width: number
	interaction: InteractionType
	screen?: string 
	screenX?: number 
	dialogue?: DialogueOption[]
	container?: Container
	lootTable?: LootTable
	unique?: boolean 
	removeOnEmpty?: boolean
	chance?: number // 0.0 - 1.0 chance to spawn
}

export type ScreenEnemy = {
	id: string 		// id of ENEMIES
	chance: number 	// 0.0 - 1.0 chance to spawn
	level: number 	// -1 - equals player level, 1+ - exact level
}

// Load settings from localStorage
const savedSettings = localStorage.getItem('gameSettings');
const defaultSettings = {
	volume: 0.3,
	shadows: true,
	imageSmoothing: false
};

export const SETTINGS = ref(savedSettings ? JSON.parse(savedSettings) : defaultSettings);

// Save settings to localStorage whenever they change
watch(SETTINGS, (newSettings) => {
    localStorage.setItem('gameSettings', JSON.stringify(newSettings));
}, { deep: true });

export const playSound = (sound: string, volume: number = .3, variations?: number) => {
	const soundFile = variations && variations > 1 ? `${sound}_${Math.floor(Math.random() * variations) + 1}` : sound;
	const audio = new Audio(`./sound/${soundFile}.mp3`);
	audio.volume = volume * SETTINGS.value.volume * 0.1;
	audio.play().catch(error => console.log('Error playing sound:', error));
}

export const hasFlag = (state: number | undefined, flag: number): boolean => ((state ?? 0) & flag) === flag;

export const getById = <T extends { id: string }>(array: T[], id: string): T => {
    return array.find(x => x.id === id) || array[0];
}

export const getXP = (level: number): number => level * 100;

export const percentageValue = (value: number, ratio: number): number => Math.ceil(value * ratio);

export const seededNoise = (seed: number, salt: string): number => {
  const input = seed.toString() + ':' + salt
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0) / 0xFFFFFFFF
}

export const toggleFullscreen = () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
};

export const getLastVersionData = () => {
	// Get the last entry from changelog
	const lastKey = Math.max(...Object.keys(changelogData).map(Number));
	const lastKeyStr = lastKey.toString() as keyof typeof changelogData;
	const lastEntry = changelogData[lastKeyStr];
	
	// Format the date to match the existing format
	const date = new Date(lastEntry.date);
	const formattedDate = date.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	
	return {
		version: lastEntry.version,
		buildDate: formattedDate
	};
};

export type SaveData = {
    player: Player
    currentScreen: Screen
    screenRandom: number
    screenEnemy: {
        combat: CombatEntity
        lootTable: LootTable
        position: "left" | "right"
    } | null
}