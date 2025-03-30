export enum ItemType {
    Junk = 'junk',    
    Consumable = 'consumable',
    Quest = 'quest',
    Currency = 'currency',
    Gem = 'gem',
    // Equipment  
    Armor = 'armor',
    Amulet = 'amulet',
    Ring = 'ring',
    Relic = 'relic',
    Weapon = 'weapon',
}

export const isEquipment = (item: Item) => [ItemType.Amulet, ItemType.Ring, ItemType.Weapon, ItemType.Relic].includes(item.type);

export enum ItemRarity {
    Junk = 0,
    Common = 1,
    Uncommon = 2, 
    Rare = 3,
    Epic = 4,
    Legendary = 5
}

export const rarityNames: Record<ItemRarity, string> = {
    [ItemRarity.Junk]: 'junk',
    [ItemRarity.Common]: 'common', 
    [ItemRarity.Uncommon]: 'uncommon',
    [ItemRarity.Rare]: 'rare',
    [ItemRarity.Epic]: 'epic',
    [ItemRarity.Legendary]: 'legendary'
}

export type ItemStats = {
    health?: number
    mana?: number
    strength?: number
    agility?: number
    intelligence?: number
    attackDamage?: number
    critChance?: number
    critMultiplier?: number
    manaRegen?: number
    evasion?: number
    accuracy?: number
    magicResistance?: number
    physicalResistance?: number
}

export const statNames: Record<string, string> = {
    health: "Health",
    mana: "Mana",
    strength: "Strength",
    agility: "Agility",
    intelligence: "Intelligence",
    attackDamage: "Attack Damage",
    critChance: "Crit Chance",
    critMultiplier: "Crit Multiplier",
    manaRegen: "Mana Regen",
    evasion: "Evasion",
    accuracy: "Accuracy",
    magicResistance: "Magic Resistance",
    physicalResistance: "Physical Resistance"
}

export type Item = {
    id: string,
    icon: string,
    name: string,
    description?: string
    type: ItemType
    rarity: ItemRarity
    isStackable?: boolean
    value: number
    constants?: Record<string, number>
    sound?: { id: string, volume: number, variations: number };
    level?: number
    uuid?: string
    count?: number
    stats?: ItemStats
    enchantmentStats?: ItemStats
    sockets?: {
        gem: Item | null
    }[]
    // Consumable
    // isCombatOnly?: boolean
    // endsTurn?: boolean
}

export type LootChance = {
    item: string
    chance: number
    level: number
    count?: { min: number, max: number }
}

export type LootTable = LootChance[]

export const GLOBAL_LOOT_TABLE: LootTable = [
    { item: "health_potion", chance: 0.1, level: 1 },
    { item: "mana_potion", chance: 0.1, level: 1 },
    { item: "axe", chance: 0.1, level: 1 },
    { item: "amulet_of_life", chance: 0.1, level: 2 },
    { item: "kitchen_knife", chance: 0.1, level: 1 },
]

export const generateLoot = (lootTable: LootTable, level: number = 1): Item[] => {
    const loot: Item[] = [];

    lootTable.forEach((lootChance) => {
        // Check if the item's level requirement is met
        if (lootChance.level <= level) {
            // Perform a random check based on the item's chance
            const random = Math.random();
            if (random <= lootChance.chance) {
                // Determine the count of the item to generate
                const count = lootChance.count
                    ? Math.floor(Math.random() * (lootChance.count.max - lootChance.count.min + 1)) + lootChance.count.min
                    : 1;

                // Create the item with the determined count and add it to the loot array
                const item = createItem(lootChance.item, count);
                loot.push(item);
            }
        }
    });

    return loot;
};

export enum ContainerContext {
    Inventory = 'inventory',
    Equipment = 'equipment',
    Shop = 'shop',
    Loot = 'loot',
    QuestReward = 'quest_reward',
    EquipmentUpgrade = 'equipment_upgrade'
}

export class Container {
    private constructor(
        public items: Item[], 
        public size: number
    ) {}

    public static create(size: number, items?: Item[]): Container {
        return new Container(items ?? [], size);
    }

    get length(): number {
        return this.items.length;
    }

    public add(item: Item, index?: number): boolean {
        if (item.isStackable) {
            const existingIndex = this.items.findIndex(x => x.id === item.id);
            if (existingIndex !== -1) {
                this.items[existingIndex].count = (this.items[existingIndex].count ?? 0) + 1;
                return true;
            }
        }

        if (this.length < this.size) {
            if (typeof index === 'number' && index >= 0 && index <= this.items.length) {
                this.items.splice(index, 0, item);
            } else {
                this.items.push(item);
            }
            return true;
        }

        return false;
    }

    public consume(item: Item): boolean {
        if (item.isStackable && item.count && item.count > 1) {
            item.count--;
            return true;
        }
        return this.remove(item);
    }

    public remove(item: Item): boolean {
        const index = this.items.findIndex(x => x.uuid === item.uuid);
        if (index !== -1) {
            this.items.splice(index, 1);
            return true;
        }

        return false;
    }

    // Move item to different container
    public move(item: Item, container: Container): boolean {
        if (container.add(item)) {
            this.remove(item);
            return true;
        }

        return false;
    }
}

export type Equipment = {
    weapon: Container,
    armor: Container,
    ring: Container,
    amulet: Container,
    relic: Container
}

export const ITEMS: Item[] = [
    {
        id: "health_potion",
        icon: "3259.jpg",
        name: "Health Potion",
        description: "Restores %health% health",
        isStackable: true,
        type: ItemType.Consumable,
        constants: {
            health: 10
        },
        rarity: ItemRarity.Common,
        value: 10,
        sound: { id: "potion", volume: 1, variations: 1 }
    },
    {
        id: "mana_potion",
        icon: "3280.jpg",
        name: "Mana Potion",
        isStackable: true,
        description: "Restores %mana% mana",
        type: ItemType.Consumable,
        constants: {
            mana: 10
        },
        rarity: ItemRarity.Common,
        value: 10,
        sound: { id: "potion", volume: 1, variations: 1 }
    },
    {
        id: "gold",
        icon: "2018.jpg",
        name: "Gold",
        isStackable: true,
        type: ItemType.Currency,
        rarity: ItemRarity.Legendary,
        value: 1
    },
    // Player default armor
    {
        id: "boots",
        icon: "296.jpg",
        name: "Boots",
        type: ItemType.Armor,
        rarity: ItemRarity.Common,
        value: 0
    },
    {
        id: "shoulder_pads",
        icon: "3589.jpg",
        name: "Shoulder Pads",
        type: ItemType.Armor,
        rarity: ItemRarity.Common,
        value: 0
    },
    {
        id: "chestplate",
        icon: "541.jpg",
        name: "Chestplate",
        type: ItemType.Armor,
        rarity: ItemRarity.Common,
        value: 0
    },
    {
        id: "gloves",
        icon: "782.jpg",
        name: "Gloves",
        type: ItemType.Armor,
        rarity: ItemRarity.Common,
        value: 0
    },
    {
        id: "pants",
        icon: "3102.jpg",
        name: "Pants",
        type: ItemType.Armor,
        rarity: ItemRarity.Common,
        value: 0
    },
    {
        id: "bone",
        icon: "1937.jpg",
        name: "Bone",
        isStackable: true,
        type: ItemType.Junk,
        rarity: ItemRarity.Junk,
        value: 10
    },
    {
        id: "sword_of_victory",
        icon: "3889.jpg",
        name: "Sword of Victory",
        type: ItemType.Weapon,
        rarity: ItemRarity.Uncommon,
        stats: {
            attackDamage: 20
        },
        value: 10
    },
    {
        id: "ring_of_hell",
        icon: "1554.jpg",
        name: "Ring of Hell",
        type: ItemType.Ring,
        rarity: ItemRarity.Legendary,        
        stats: {
            strength: 10,
            agility: 5,
            intelligence: 5
        },
        value: 100
    },
    {
        id: "amulet_of_life",
        icon: "1435.jpg",
        name: "Amulet of Life",
        type: ItemType.Amulet,
        rarity: ItemRarity.Uncommon,        
        stats: {
            health: 10,
            intelligence: 5
        },
        value: 10
    },
    {
        id: "axe",
        icon: "54.jpg",
        name: "Axe",
        type: ItemType.Weapon,
        rarity: ItemRarity.Common,
        stats: {
            attackDamage: 20
        },
        value: 10
    },
    {
        id: "kitchen_knife",
        icon: "4289.jpg",
        name: "Kitchen Knife",
        type: ItemType.Weapon,
        rarity: ItemRarity.Common,
        stats: {
            attackDamage: 5,
            critChance: 0.05
        },
        value: 10
    },
    {
        id: "bug_meat",
        icon: "2680.jpg",
        name: "Bug Meat",
        type: ItemType.Junk,
        rarity: ItemRarity.Junk,
        isStackable: true,
        value: 10
    },   
    {
        id: "book_of_knowledge",
        icon: "1965.jpg",
        name: "Book of Knowledge",
        type: ItemType.Relic,
        rarity: ItemRarity.Common,
        stats: {
            intelligence: 5
        },
        value: 10
    },
    {
        id: "golden_ring",
        icon: "1496.jpg",
        name: "Golden Ring",
        type: ItemType.Ring,
        rarity: ItemRarity.Common,
        stats: {
            strength: 1,
            agility: 1,
            intelligence: 1
        },
        value: 10
    },
    {
        id: "runic_stone",
        icon: "2790.jpg",
        name: "Runic Stone",
        type: ItemType.Relic,
        rarity: ItemRarity.Common,
        stats: {
            strength: 3,
        },
        value: 10
    },
    {
        id: "chisel",
        icon: "2796.jpg",
        name: "Chisel",
        description: "Used to create sockets in armor",
        type: ItemType.Consumable,
        rarity: ItemRarity.Rare,
        value: 100
    },
    {
        id: "gem",
        icon: "1342.jpg",
        name: "Gem",
        description: "Can be inserted into a socket in armor",
        type: ItemType.Gem,
        rarity: ItemRarity.Common,
        value: 0
    },
    {
        id: "enchantment",
        icon: "2661.jpg",
        name: "Enchantment",
        description: "Can be used to enchant armor",
        type: ItemType.Consumable,
        rarity: ItemRarity.Common,
        value: 0
    }
]

export const createRandomEnchantment = (item: Item) => {
    const rarityIndex = Math.floor(Math.random() * Math.random() * 4);
    const rarity = [ItemRarity.Common, ItemRarity.Uncommon, ItemRarity.Rare, ItemRarity.Epic][rarityIndex];

    const enchantmentStats: Record<keyof ItemStats, (level: number) => number> = {
        health: (level) => level * 10 + Math.floor(Math.random() * 10),
        mana: (level) => level * 10 + Math.floor(Math.random() * 10),
        strength: (level) => level * 2 + Math.floor(Math.random() * 2),
        agility: (level) => level * 2 + Math.floor(Math.random() * 2),
        intelligence: (level) => level * 2 + Math.floor(Math.random() * 2),
        attackDamage: (level) => level * 5 + Math.floor(Math.random() * 5),
        critChance: (level) => level * 0.01 + Math.floor(Math.random() * 1) / 100,
        critMultiplier: (level) => level * 0.02 + Math.floor(Math.random() * 2) / 100,
        manaRegen: (level) => level * 2 + Math.floor(Math.random() * 2),
        evasion: (level) => level * 0.01 + Math.floor(Math.random() * 1) / 100,
        accuracy: (level) => level * 0.01 + Math.floor(Math.random() * 1) / 100,
        magicResistance: (level) => level * 0.01 + Math.floor(Math.random() * 1) / 100,
        physicalResistance: (level) => level * 0.01 + Math.floor(Math.random() * 1) / 100,
    }

    // Add 1 random stat for each rarity level
    const stats: ItemStats = {};

    for (let i = 0; i <= rarityIndex; i++) {
        const stat = Object.keys(enchantmentStats)[Math.floor(Math.random() * Object.keys(enchantmentStats).length)];

        if (stats[stat as keyof ItemStats]) {
            i--;
            continue;
        }

        const value = enchantmentStats[stat as keyof ItemStats](item.level ?? 1);
        stats[stat as keyof ItemStats] = value;
    }

    return {
        ...item,
        rarity: rarity,  
        stats: stats,
        icon: {
            [ItemRarity.Uncommon]: "704.jpg",
            [ItemRarity.Rare]: "705.jpg",
            [ItemRarity.Epic]: "703.jpg",
        }[rarity as ItemRarity.Uncommon | ItemRarity.Rare | ItemRarity.Epic] ?? "2661.jpg",
    }
}

export const createItem = (id: string, count: number = 1, level?: number) => {
    const item = { ...ITEMS.find(x => x.id === id) || ITEMS[0] };

    item.uuid = crypto.randomUUID();
    item.count = count;
    item.level = item.level ?? level;

    if (item.id === "enchantment") {
        return createRandomEnchantment(item);
    }

    return item;
};