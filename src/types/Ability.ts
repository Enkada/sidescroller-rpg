import { effect } from "vue";
import type { CombatEntity } from "./CombatEntity";

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
            heal: (c: CombatEntity) => c.attributes.intelligence * 2
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
        values: {
            heal: (c: CombatEntity) => c.attributes.intelligence,
        },
        constants: {
            duration: 3,
            effect: "regeneration"
        },
        description: "Heal yourself for %heal% health for %duration% turns",
        cost: 20,
        cooldown: 3,
        flags: AbilityFlag.PreserveTurn | AbilityFlag.NoAnimation
    }
]