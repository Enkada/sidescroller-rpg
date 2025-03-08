export enum EffectFlag {
    None = 0,
    SkipTurn = 1 << 0, 
    Stackable = 1 << 1
}

export enum EffectType {
    Debuff,
    Buff
}

export type Effect = {
    id: string;
    type: EffectType;
	icon: string;
	name: string;
	description: string;
    flags?: EffectFlag
}

export const EFFECTS: Effect[] = [
    {
        id: "bleed",
        type: EffectType.Debuff,
        icon: "900.jpg",
        name: "Bleed",
        description: "Damage over time"
    },
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
        description: "Heal over time"
    }
]