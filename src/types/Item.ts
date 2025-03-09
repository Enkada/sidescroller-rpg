export enum ItemType {
    Junk,    
    Consumable,
    Quest,
    // Equipment  
    Armor = 'armor',
    Amulet = 'amulet',
    Ring = 'ring',
    Weapon = 'weapon',
}

export const isEquipment = (item: Item) => [ItemType.Armor, ItemType.Amulet, ItemType.Ring, ItemType.Weapon].includes(item.type);

export enum ItemRarity {
    Junk = 'junk',
    Common = 'common',
    Uncommon = 'uncommon',
    Rare = 'rare',
    Epic = 'epic',
    Legendary = 'legendary'
}

export type Item = {
    id: string,
    icon: string,
    name: string,
    description?: string
    type: ItemType
    rarity: ItemRarity
    isStackable?: boolean
    // level, value/cost
    uuid?: string
    count?: number
}

export enum ContainerContext {
    Inventory = 'inventory',
    Equipment = 'equipment',
    Shop = 'shop'
}

export class Container {
    private constructor(
        public items: Item[], 
        public size: number
    ) {}

    public static create(size: number): Container {
        return new Container([], size);
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
    amulet: Container
}

export const ITEMS: Item[] = [
    {
        id: "health_potion",
        icon: "3259.jpg",
        name: "Health Potion",
        description: "Restores 10 health",
        isStackable: true,
        type: ItemType.Consumable,
        rarity: ItemRarity.Common
    },
    {
        id: "mana_potion",
        icon: "3280.jpg",
        name: "Mana Potion",
        isStackable: true,
        description: "Restores 10 mana",
        type: ItemType.Consumable,
        rarity: ItemRarity.Common
    },
    {
        id: "bone",
        icon: "1937.jpg",
        name: "Bone",
        isStackable: true,
        type: ItemType.Junk,
        rarity: ItemRarity.Junk
    },
    {
        id: "sword_of_victory",
        icon: "3889.jpg",
        name: "Sword of Victory",
        type: ItemType.Weapon,
        rarity: ItemRarity.Uncommon
    },
    {
        id: "simple_armor",
        icon: "398.jpg",
        name: "Simple Armor",
        type: ItemType.Armor,
        rarity: ItemRarity.Common
    },
    {
        id: "ring_of_hell",
        icon: "1554.jpg",
        name: "Ring of Hell",
        type: ItemType.Ring,
        rarity: ItemRarity.Legendary
    },
    {
        id: "amulet_of_life",
        icon: "1435.jpg",
        name: "Amulet of Life",
        type: ItemType.Amulet,
        rarity: ItemRarity.Uncommon
    },
    {
        id: "simple_axe",
        icon: "62.jpg",
        name: "Simple Axe",
        type: ItemType.Weapon,
        rarity: ItemRarity.Common
    }
]

export const createItem = (id: string, count: number = 1) => {
    const item = { ...ITEMS.find(x => x.id === id) || ITEMS[0] };

    item.uuid = crypto.randomUUID();
    item.count = count;

    return item;
};