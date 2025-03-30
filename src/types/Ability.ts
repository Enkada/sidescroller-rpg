import { effect } from "vue";
import type { CombatEntity } from "./CombatEntity";
import { percentageValue } from "../utils";

export enum AbilityFlag {
    None = 0,
    NoAnimation = 1 << 0, 
    PreserveTurn = 1 << 1,
}

export type Ability = {
    id: string;
	icon: string;
	name: string;
    values?: Record<string, (c: CombatEntity) => any>;
    constants?: Record<string, any>;
	description: string;
    cost: number;
    cooldown?: number; // Turns
    sound?: { id: string, volume: number, variations: number };
    flags?: AbilityFlag
}

export const ABILITIES: Ability[] = [
	{
        id: "attack",
		icon: "282.jpg",
		name: "Attack",
        values: {
            damage: (c: CombatEntity) => c.attackDamage
        },
		description: "Basic attack dealing %damage% damage",
        cost: 0
	},
    {
        id: "heavy_attack",
        icon: "221.jpg",
        name: "Heavy Attack",
        values: {
            damage: (c: CombatEntity) => c.attackDamage * 2
        },
        description: "Heavy attack dealing %damage% damage",
        cost: 40
    },
    {
        id: "morbid_strike",
        icon: "358.jpg",
        name: "Morbid Strike",
        values: {
            damage: (c: CombatEntity) => c.attackDamage * 6
        },
        description: "Morbid strike dealing %damage% damage",
        cost: 20,
        cooldown: 2
    },
    {
        id: "heal",
        icon: "760.jpg",
        name: "Heal",
        values: {
            heal: (c: CombatEntity) => c.intelligence * 2
        },
        description: "Heal yourself for %heal% health",
        cost: 20,
        flags: AbilityFlag.PreserveTurn | AbilityFlag.NoAnimation
    },
    {
        id: "stun",
        icon: "380.jpg",
        name: "Stun",
        constants: {
            duration: 2,
            effect: "stun"
        },
        description: "Stun an enemy for %duration% turns",
        cost: 40,
        cooldown: 3
    },
    {
        id: "healing_touch",
        icon: "800.jpg",
        name: "Healing Touch",
        constants: {
            duration: 3,
            effect: "regeneration"
        },
        description: "Heal yourself for %effect:regeneration:val:heal% health for %duration% turns",
        cost: 20,
        cooldown: 3,
        flags: AbilityFlag.PreserveTurn | AbilityFlag.NoAnimation
    },
    {
        id: "bleeding_strike",
        icon: "88.jpg",
        name: "Bleeding Strike",
        constants: {
            duration: 3,
            effect: "bleeding"
        },
        description: "Strike the enemy, causing them to bleed for %effect:bleeding:val:damage% damage over %duration% turns",
        cost: 15,
        cooldown: 2
    },
    {
        id: "critical_focus",
        icon: "352.jpg",
        name: "Critical Focus",
        constants: {
            duration: 3,
            effect: "critical_chance"
        },
        description: "Focus your mind to increase critical chance by %effect:critical_chance:const:critChance% for %duration% turns",
        cost: 30,
        cooldown: 4,
        sound: { id: "critical_focus", volume: 1, variations: 1 },
        flags: AbilityFlag.PreserveTurn | AbilityFlag.NoAnimation
    },
    {
        id: "precise_strike",
        icon: "925.jpg",
        name: "Precise Strike",
        values: {
            damage: (c: CombatEntity) => percentageValue(c.attackDamage, 1.5),
        },
        constants: {
            critChance: 0.1
        },
        description: "A precise attack that deals %damage% damage with increased critical chance by %critChance%",
        cost: 25
    },
    {
        id: "fireball",
        icon: "506.jpg",
        name: "Fireball",
        values: {
            damage: (c: CombatEntity) => c.intelligence * 5
        },
        description: "Cast a fireball that deals %damage% damage",
        sound: { id: "fireball", volume: 1, variations: 3 },
        cost: 20        
    }
]