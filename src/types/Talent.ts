import type { CombatEntity } from "./CombatEntity";

export enum TalentType {
    Ability,
    Passive
}

export type Talent = {
    id: string,
    type: TalentType,
    icon?: string,
    name?: string,
    description?: string,
    level?: number, 
    values?: Record<string, (c: CombatEntity) => any>;
    //constants?: Record<string, any>;
    children: string[]
}

export type TalentTree = {
    strength: Talent[],
    agility: Talent[],
    intelligence: Talent[]
}

export const TALENT_TREE: TalentTree = {
    strength: [
        {
            id: "heavy_attack",
            type: TalentType.Ability,
            children: ["str-2", "str-3"]
        },
        {
            id: "str-2",
            type: TalentType.Passive,
            icon: "104.jpg",
            name: "Talent 2",
            description: "Talent 2 description",
            children: ["str-4"]
        },
        {
            id: "str-3",
            type: TalentType.Passive,
            icon: "105.jpg",
            name: "Talent 3",
            description: "Talent 3 description",
            children: []
        },
        {
            id: "str-4",
            type: TalentType.Ability,
            icon: "106.jpg",
            name: "Talent 4",
            description: "Talent 4 description",
            children: []
        }
    ],
    agility: [
        {
            id: "stun",
            type: TalentType.Ability,
            children: ["agi-2", "agi-3"]
        },
        {
            id: "agi-2",
            type: TalentType.Passive,
            icon: "204.jpg",
            name: "Talent 2",
            description: "Talent 2 description",
            children: [],
            level: 3
        },
        {
            id: "agi-3",
            type: TalentType.Passive,
            icon: "205.jpg",
            name: "Talent 3",
            description: "Talent 3 description",
            children: ["agi-4"]
        },
        {
            id: "agi-4",
            type: TalentType.Passive,
            icon: "206.jpg",
            name: "Talent 4",
            description: "Talent 4 description",
            children: []
        }
    ],
    intelligence: [
        {
            id: "heal",
            type: TalentType.Ability,
            children: ["int-2", "healing_touch"]
        },
        {
            id: "int-2",
            type: TalentType.Passive,
            icon: "304.jpg",
            name: "Talent 2",
            description: "Talent 2 description",
            children: ["int-4"]
        },
        {
            id: "healing_touch",
            type: TalentType.Ability,
            children: ["int-4"]
        },
        {
            id: "int-4",
            type: TalentType.Passive,
            icon: "306.jpg",
            name: "Talent 4",
            description: "Talent 4 description",
            children: [],
            level: 5
        }
    ]
}

export const getTalentById = (id: string): Talent => {
    for (const branch of Object.values(TALENT_TREE)) {
        const foundTalent = branch.find(talent => talent.id === id);
        if (foundTalent) return foundTalent;
    }
    return TALENT_TREE.strength[0];
}
