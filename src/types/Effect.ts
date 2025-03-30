import type { CombatEntity } from "./CombatEntity";

export enum EffectFlag {
    None = 0,
    SkipTurn = 1 << 0, 
    Stackable = 1 << 1
}

export enum EffectType {
    Debuff,
    Buff
}

export const entityEffect = (combat: CombatEntity, effectId: string) => {
    const effect = combat.effects.find(e => e.id === effectId);
    if (!effect) return null;

    const effectData = EFFECTS.find(e => e.id === effectId);
    if (!effectData) return null;

    return {
        ...effectData,
        ...effect
    };
}

export type Effect = {
    id: string;
    type: EffectType;
	icon: string;
	name: string;
	description: string;
    flags?: EffectFlag
    values?: Record<string, (c: CombatEntity, t: CombatEntity) => any>;
    constants?: Record<string, any>;
    sound?: { id: string, volume: number, variations: number };
}

export const EFFECTS: Effect[] = [
    {
        id: "stun",
        type: EffectType.Debuff,
        icon: "557.jpg",
        name: "Stun",
        description: "Unable to act",
        flags: EffectFlag.SkipTurn
    },
    {
        id: "regeneration",
        type: EffectType.Buff,
        icon: "804.jpg",
        name: "Regeneration",
        description: "Heals %heal% health at the end of turn",
        values: {
            heal: (c: CombatEntity, t: CombatEntity) => t.intelligence
        }
    },
    {
        id: "bleeding",
        type: EffectType.Debuff,
        icon: "900.jpg",
        name: "Bleeding",
        description: "Deals %damage% damage at the end of turn",
        values: {
            damage: (c: CombatEntity, t: CombatEntity) => t.strength * 2
        },
        sound: { id: "bleeding", volume: 1, variations: 1 }
    },
    {
        id: "critical_chance",
        type: EffectType.Buff,
        icon: "123.jpg",
        name: "Critical Chance",
        description: "Increases critical chance by %critChance%",
        constants: {
            critChance: 0.5
        }
    }
]