import { ref, watch } from "vue";
import type { Sprite } from "./types/Sprite";
import type { DialogueOption } from "./types/Script";

export enum Window {
	Character,
	Inventory,
	TalentTree,
	Quest,
	Settings,
	EquipmentUpgrade,
	DevTools,
}

export type Screen = {
	id: string
	name: string
	background: string
	left: string | null
	right: string | null
	objects?: ScreenObject[]
	enemies?: ScreenEnemy[]
}

export enum InteractionType {
	None,
	Entrance,
	Dialogue
}

export type ScreenObject = {
	uuid: string
	name: string
	x: number
	y: number
	sprite: Sprite
	width: number
	interaction: InteractionType
	dialogue?: DialogueOption[]
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