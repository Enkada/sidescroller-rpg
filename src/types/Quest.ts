import type { Player } from "./CombatEntity";
import { Container, createItem } from "./Item";

export type QuestObjective = {
	description: string;
	condition: {
		current: (player: Player) => number;
		required: number;
	};
}

export type Quest = {
	id: string;
	title: string;
	description: string;
	objectives: QuestObjective[];
	reward: Container;
	xp: number;
};

export const QUESTS: Quest[] = [
    {
        id: "gold_collector",
        title: "First Steps into Fortune",
        description: "The local merchant guild is looking for aspiring adventurers to prove their worth. Show them you understand the basics of gathering wealth by collecting gold from your adventures.",
        objectives: [
            {
                description: "Collect %required% gold pieces from defeated enemies or found treasures",
                condition: {
                    current: (player: Player) => player.gold,
                    required: 20
                }
            }
        ],
		reward: Container.create(2, [
			createItem("gold", 20),
			createItem("health_potion")
		]),
		xp: 100
    },
    {
        id: "fly_hunter",
        title: "Pest Control",
        description: "The girl is bothered by pesky flies and spiders in the area. Help her by eliminating them.",
        objectives: [
            {
                description: "Kill %required% flies",
                condition: {
                    current: (player: Player) => player.variables["kill:fly"] || 0,
                    required: 2
                }
            },
            {
                description: "Kill %required% spiders",
                condition: {
                    current: (player: Player) => player.variables["kill:spider"] || 0,
                    required: 2
                }
            }
        ],
        reward: Container.create(2, [
            createItem("gold", 25),
            createItem("health_potion")
        ]),
        xp: 75
    }
]

